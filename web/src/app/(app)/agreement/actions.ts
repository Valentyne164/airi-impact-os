"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGrant, getMetrics } from "@/lib/data";
import { extractCommitments } from "@/lib/impact";
import type { Commitment } from "@/types/database";

function revalidateAgreement(grantId: string) {
  revalidatePath("/agreement");
  revalidatePath(`/agreement?grant=${grantId}`);
  revalidatePath(`/grants/${grantId}`);
  revalidatePath("/");
}

export async function extractAndLock(grantId: string, formData: FormData) {
  const text = ((formData.get("agreement_text") as string) ?? "").trim();
  if (!text) return;

  const admin = createAdminClient();
  const grant = await getGrant(grantId);
  if (!grant) return;

  const allMetrics = await getMetrics();
  const metrics = allMetrics.filter((m) => m.program_id === grant.program_id);

  const found = extractCommitments(text, metrics);

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

  await admin.from("activity").insert({
    actor: "Agreement Engine",
    text: `extracted & locked ${found.length} commitment${found.length !== 1 ? "s" : ""} from the ${grant.funder_name ?? "funder"} agreement`,
  });

  revalidateAgreement(grantId);
  redirect(`/agreement?grant=${grantId}`);
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
