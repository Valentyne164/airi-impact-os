"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGrant, getMetrics } from "@/lib/data";
import { extractCommitments } from "@/lib/impact";
import type { Commitment, Metric } from "@/types/database";

function revalidateAgreement(grantId: string) {
  revalidatePath("/agreement");
  revalidatePath(`/agreement?grant=${grantId}`);
  revalidatePath(`/grants/${grantId}`);
  revalidatePath("/");
}

/* ── Claude-powered extraction ─────────────────────────────────────────────
   Returns the same shape as extractCommitments() so the rest of the action
   is identical regardless of which extractor ran.
   Throws on any error so the caller can fall back to the regex path.       */
async function extractWithClaude(
  text: string,
  metrics: Metric[],
): Promise<Array<Pick<Commitment, "label" | "kind" | "target" | "metric_id">>> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const metricHints =
    metrics.length > 0
      ? `\n\nThe program tracks these metrics — use their exact labels where relevant:\n` +
        metrics.map((m) => `• ${m.label}`).join("\n")
      : "";

  const prompt = `Extract every measurable commitment from the grant agreement below.

Return ONLY a JSON array. Each element must have:
  "label"  – short description of what must be achieved (e.g. "Train participants in AI skills")
  "target" – the numeric value only (e.g. "no fewer than 500" → 500, "at least 40%" → 40, "under $150,000" → 150000)
  "kind"   – one of:
               "count"   for headcounts, sessions, workshops, people, items
               "percent" for any percentage (%, equity, participation rate)
               "budget"  for dollar/cost caps or spending limits

Rules:
• Handle indirect language: "no fewer than", "at least", "up to", "a minimum of", "no less than", "not exceeding"
• Budget caps ("spend under $X", "no more than $X") → kind "budget", target = X
• Percentages ("at least 40% women") → kind "percent", target = 40
• Counts ("train 500 participants") → kind "count", target = 500
• If the same commitment appears multiple times, include it only once
• If no measurable commitments exist, return []${metricHints}

Agreement text:
${text}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";

  // Handle responses wrapped in markdown code blocks
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Claude response contained no JSON array");

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    label: string;
    target: number;
    kind: string;
  }>;

  const validKinds = new Set<Commitment["kind"]>(["count", "percent", "budget"]);

  // Validate fields and match each commitment to a program metric by keyword
  return parsed
    .filter((c) => c.label && typeof c.target === "number" && c.target > 0)
    .map((c) => {
      const kind: Commitment["kind"] = validKinds.has(c.kind as Commitment["kind"])
        ? (c.kind as Commitment["kind"])
        : "count";

      // Keyword match against program metrics (same strategy as the regex extractor)
      const labelWords = c.label.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const metric_id =
        metrics.find((m) =>
          labelWords.some((w) => m.label.toLowerCase().includes(w)),
        )?.id ?? null;

      return { label: c.label.trim(), target: c.target, kind, metric_id };
    });
}

/* ── Main action ─────────────────────────────────────────────────────────── */

export async function extractAndLock(grantId: string, formData: FormData) {
  const text = ((formData.get("agreement_text") as string) ?? "").trim();
  if (!text) return;

  const admin = createAdminClient();
  const grant = await getGrant(grantId);
  if (!grant) return;

  const allMetrics = await getMetrics();
  const metrics = allMetrics.filter((m) => m.program_id === grant.program_id);

  // Try Claude; fall back to regex extractor if the API is unavailable or errors
  let found: Array<Pick<Commitment, "label" | "kind" | "target" | "metric_id">>;
  let usedFallback = false;
  let fallbackReason: string | null = null;

  if (!process.env.ANTHROPIC_API_KEY) {
    found = extractCommitments(text, metrics);
    usedFallback = true;
    fallbackReason = "ANTHROPIC_API_KEY is not set on this environment";
  } else {
    try {
      found = await extractWithClaude(text, metrics);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status;
      fallbackReason = status != null ? `${msg} (status ${status})` : msg;
      console.error("[Agreement Engine] Claude extraction failed — falling back to regex:", err);
      found = extractCommitments(text, metrics);
      usedFallback = true;
    }
  }

  const { error: grantErr } = await admin
    .from("grants")
    .update({ agreement_text: text })
    .eq("id", grantId);
  if (grantErr) throw new Error(`Could not save agreement text: ${grantErr.message}`);

  const { error: delErr } = await admin
    .from("commitments")
    .delete()
    .eq("grant_id", grantId);
  if (delErr) throw new Error(`Could not clear old commitments: ${delErr.message}`);

  if (found.length > 0) {
    const { error: insErr } = await admin
      .from("commitments")
      .insert(found.map((c) => ({ ...c, grant_id: grantId })));
    if (insErr) throw new Error(`Could not save commitments: ${insErr.message}`);
  }

  const method = usedFallback ? "pattern matching" : "AI";
  await admin.from("activity").insert({
    actor: "Agreement Engine",
    text: `extracted & locked ${found.length} commitment${found.length !== 1 ? "s" : ""} from the ${grant.funder_name ?? "funder"} agreement (${method})`,
  });

  revalidateAgreement(grantId);
  redirect(
    `/agreement?grant=${grantId}${usedFallback ? `&fallback=1&reason=${encodeURIComponent(fallbackReason ?? "unknown error")}` : ""}`,
  );
}

/** Edit an existing commitment's label, target, or kind. */
export async function updateCommitment(
  commitmentId: string,
  grantId: string,
  formData: FormData,
) {
  const label    = ((formData.get("label")     as string) ?? "").trim();
  const target   = Number((formData.get("target")  as string) ?? "0");
  const kind     = (formData.get("kind")     as Commitment["kind"]) ?? "count";
  const metricId = ((formData.get("metric_id") as string) ?? "").trim() || null;

  if (!label || target <= 0) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("commitments")
    .update({ label, target, kind, metric_id: metricId })
    .eq("id", commitmentId);
  if (error) throw new Error(error.message);

  revalidateAgreement(grantId);
}

/** Remove a commitment from the grant. */
export async function deleteCommitment(commitmentId: string, grantId: string) {
  const admin = createAdminClient();
  await admin.from("commitments").delete().eq("id", commitmentId);
  revalidateAgreement(grantId);
}

/** Manually add a commitment that the engine didn't extract. */
export async function addCommitment(grantId: string, formData: FormData) {
  const label    = ((formData.get("label")     as string) ?? "").trim();
  const target   = Number((formData.get("target")  as string) ?? "0");
  const kind     = (formData.get("kind")     as Commitment["kind"]) ?? "count";
  const metricId = ((formData.get("metric_id") as string) ?? "").trim() || null;

  if (!label || target <= 0) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("commitments")
    .insert({ grant_id: grantId, label, target, kind, metric_id: metricId });
  if (error) throw new Error(error.message);

  await admin.from("activity").insert({
    actor: "Manager",
    text: `manually added commitment "${label}" (target ${target}) to grant`,
  });

  revalidateAgreement(grantId);
}
