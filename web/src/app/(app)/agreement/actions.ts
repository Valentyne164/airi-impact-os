"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGrant, getMetrics } from "@/lib/data";
import { extractCommitments } from "@/lib/impact";
import type { Commitment, Metric, MilestoneItem } from "@/types/database";

function revalidateAgreement(grantId: string) {
  revalidatePath("/agreement");
  revalidatePath(`/agreement?grant=${grantId}`);
  revalidatePath(`/grants/${grantId}`);
  revalidatePath("/");
}

type ExtractedCommitment = Pick<Commitment, "label" | "kind" | "target" | "metric_id" | "type">;

/* ── Claude-powered extraction ─────────────────────────────────────────────
   Returns the same shape as extractCommitments() (plus `type`) so the rest
   of the action is identical regardless of which extractor ran.
   Throws on any error so the caller can fall back to the regex path.       */
async function extractWithClaude(
  text: string,
  metrics: Metric[],
): Promise<ExtractedCommitment[]> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const metricHints =
    metrics.length > 0
      ? `\n\nThe program tracks these metrics — use their exact labels where relevant:\n` +
        metrics.map((m) => `• ${m.label}`).join("\n")
      : "";

  const prompt = `Extract every commitment from the grant agreement below — including measurable targets AND non-numeric commitments like activities, outcomes, and milestones.

Return ONLY a JSON array. Each element must have:
  "label"      – short description (e.g. "Train 500 participants", "Conduct monthly outreach sessions")
  "type"       – one of:
                   "measurable"  has a countable/percent/dollar target — a specific number can be tracked
                   "activity"    a recurring action with no clear numeric target (e.g. "conduct outreach events", "host workshops")
                   "outcome"     a result measured by evidence or assessment, not a count (e.g. "improve digital literacy", "strengthen workforce readiness")
                   "milestone"   a one-time deliverable (e.g. "launch a reporting system", "implement X by date Y", "complete a needs assessment")
  "confidence" – "high" | "medium" | "low" — how certain you are of the classification
  "target"     – for "measurable" only: the numeric value (e.g. "no fewer than 500" → 500, "at least 40%" → 40, "under $150,000" → 150000). Omit or null for other types.
  "kind"       – for "measurable" only: "count" | "percent" | "budget". Omit for other types.

Rules:
• measurable: extract the number from indirect language ("no fewer than 500" → 500, "at least 40%" → 40)
• budget caps ("spend under $X", "no more than $X") → kind "budget"
• percentages → kind "percent"; headcounts/sessions/items/workshops → kind "count"
• If the same commitment appears multiple times, include it only once
• Extract ALL commitments — do not skip activities, outcomes, or milestones
• If no commitments exist at all, return []${metricHints}

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
    type?: string;
    confidence?: string;
    target?: number | null;
    kind?: string;
  }>;

  const validTypes = new Set<Commitment["type"]>(["measurable", "activity", "outcome", "milestone"]);
  const validKinds = new Set<Commitment["kind"]>(["count", "percent", "budget"]);

  return parsed
    .filter((c) => Boolean(c.label))
    .flatMap((c): ExtractedCommitment[] => {
      const type: Commitment["type"] = validTypes.has(c.type as Commitment["type"])
        ? (c.type as Commitment["type"])
        : "measurable";

      if (type === "measurable") {
        const target = typeof c.target === "number" ? c.target : 0;
        if (target <= 0) return []; // measurable without a valid numeric target → skip

        const kind: Commitment["kind"] = validKinds.has(c.kind as Commitment["kind"])
          ? (c.kind as Commitment["kind"])
          : "count";

        // Keyword match against program metrics (same strategy as the regex extractor)
        const labelWords = c.label.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const metric_id =
          metrics.find((m) =>
            labelWords.some((w) => m.label.toLowerCase().includes(w)),
          )?.id ?? null;

        return [{ label: c.label.trim(), type, kind, target, metric_id }];
      }

      // activity / outcome / milestone: no metric linking.
      // target=0 and kind="count" are DB placeholders (columns are NOT NULL for now).
      return [{ label: c.label.trim(), type, kind: "count", target: 0, metric_id: null }];
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
  let found: ExtractedCommitment[];
  let usedFallback = false;
  let fallbackReason: string | null = null;

  if (!process.env.ANTHROPIC_API_KEY) {
    found = extractCommitments(text, metrics).map((c) => ({ ...c, type: "measurable" as const }));
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
      found = extractCommitments(text, metrics).map((c) => ({ ...c, type: "measurable" as const }));
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

/** Edit an existing commitment's label, type, target, kind, and metric link. */
export async function updateCommitment(
  commitmentId: string,
  grantId: string,
  formData: FormData,
) {
  const label   = ((formData.get("label") as string) ?? "").trim();
  const rawType = (formData.get("type")   as string) ?? "measurable";
  const type: Commitment["type"] = (["measurable","activity","outcome","milestone"] as const).includes(
    rawType as Commitment["type"],
  ) ? rawType as Commitment["type"] : "measurable";

  const kind     = (formData.get("kind")      as Commitment["kind"]) ?? "count";
  const target   = Number((formData.get("target") as string) ?? "0");
  const metricId = ((formData.get("metric_id") as string) ?? "").trim() || null;
  const evTarget = Number((formData.get("evidence_target") as string) ?? "0");

  if (!label) return;
  if (type === "measurable" && target <= 0) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("commitments")
    .update({
      label,
      type,
      kind:            type === "measurable" ? kind : "count",
      // activity uses target as an optional goal (may be 0 = no goal); others stay 0
      target:          type === "measurable" ? target
                     : type === "activity"   ? (target > 0 ? target : 0)
                     : 0,
      metric_id:       type === "measurable" || type === "activity" ? metricId : null,
      // outcome stores how many evidence items satisfy the commitment (null = open-ended)
      evidence_target: type === "outcome" ? (evTarget > 0 ? evTarget : null) : null,
    })
    .eq("id", commitmentId);
  if (error) throw new Error(error.message);

  revalidateAgreement(grantId);
}

/** Increment the activity_count on an activity commitment by 1. */
export async function incrementActivityCount(commitmentId: string, grantId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("commitments")
    .select("activity_count, label")
    .eq("id", commitmentId)
    .single();

  const newCount = (data?.activity_count ?? 0) + 1;
  await admin
    .from("commitments")
    .update({ activity_count: newCount })
    .eq("id", commitmentId);

  await admin.from("activity").insert({
    actor: "Manager",
    text: `logged activity: ${data?.label ?? "commitment"} (${newCount} total)`,
  });

  revalidateAgreement(grantId);
}

/** Decrement the activity_count on an activity commitment by 1 (floor 0). */
export async function decrementActivityCount(commitmentId: string, grantId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("commitments")
    .select("activity_count, label")
    .eq("id", commitmentId)
    .single();

  const current = data?.activity_count ?? 0;
  if (current <= 0) return;

  const newCount = current - 1;
  await admin
    .from("commitments")
    .update({ activity_count: newCount })
    .eq("id", commitmentId);

  await admin.from("activity").insert({
    actor: "Manager",
    text: `corrected activity count: ${data?.label ?? "commitment"} (${newCount} total)`,
  });

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

/* ── Milestone actions ──────────────────────────────────────────────────── */

async function getMilestones(commitmentId: string): Promise<{ label: string; milestones: MilestoneItem[] }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("commitments")
    .select("label, milestones")
    .eq("id", commitmentId)
    .single();
  return {
    label:      data?.label ?? "commitment",
    milestones: Array.isArray(data?.milestones)
      ? (data.milestones as unknown as MilestoneItem[])
      : [],
  };
}

async function saveMilestones(commitmentId: string, milestones: MilestoneItem[]) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("commitments")
    .update({ milestones })
    .eq("id", commitmentId);
  if (error) throw new Error(error.message);
}

export async function addMilestone(commitmentId: string, grantId: string, formData: FormData) {
  const label   = ((formData.get("label")    as string) ?? "").trim();
  const dueDate = ((formData.get("due_date") as string) ?? "").trim() || null;
  if (!label) return;

  const { label: cLabel, milestones } = await getMilestones(commitmentId);
  const newItem: MilestoneItem = { label, status: "pending", due_date: dueDate };
  await saveMilestones(commitmentId, [...milestones, newItem]);

  const admin = createAdminClient();
  await admin.from("activity").insert({
    actor: "Manager",
    text:  `added milestone "${label}" to: ${cLabel}`,
  });

  revalidateAgreement(grantId);
}

export async function setMilestoneStatus(
  commitmentId: string,
  grantId: string,
  index: number,
  status: MilestoneItem["status"],
) {
  const { milestones } = await getMilestones(commitmentId);
  if (index < 0 || index >= milestones.length) return;
  milestones[index] = { ...milestones[index], status };
  await saveMilestones(commitmentId, milestones);

  const admin = createAdminClient();
  await admin.from("activity").insert({
    actor: "Manager",
    text:  `marked milestone "${milestones[index].label}" as ${status}`,
  });

  revalidateAgreement(grantId);
}

export async function editMilestone(
  commitmentId: string,
  grantId: string,
  index: number,
  formData: FormData,
) {
  const label   = ((formData.get("label")    as string) ?? "").trim();
  const dueDate = ((formData.get("due_date") as string) ?? "").trim() || null;
  if (!label) return;

  const { milestones } = await getMilestones(commitmentId);
  if (index < 0 || index >= milestones.length) return;
  milestones[index] = { ...milestones[index], label, due_date: dueDate };
  await saveMilestones(commitmentId, milestones);

  revalidateAgreement(grantId);
}

export async function removeMilestone(commitmentId: string, grantId: string, index: number) {
  const { label: cLabel, milestones } = await getMilestones(commitmentId);
  if (index < 0 || index >= milestones.length) return;
  const removed = milestones[index];
  await saveMilestones(commitmentId, milestones.filter((_, i) => i !== index));

  const admin = createAdminClient();
  await admin.from("activity").insert({
    actor: "Manager",
    text:  `removed milestone "${removed.label}" from: ${cLabel}`,
  });

  revalidateAgreement(grantId);
}
