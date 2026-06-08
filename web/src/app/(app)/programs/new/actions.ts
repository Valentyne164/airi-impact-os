"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractCommitments } from "@/lib/impact";
import type { Metric } from "@/types/database";

interface WizMetric {
  label: string;
  type: "number" | "yesno" | "text";
  target: string;
}

export async function createProgram(formData: FormData) {
  const name      = (formData.get("name") as string).trim();
  const aim       = (formData.get("aim") as string).trim();
  const audience  = (formData.get("audience") as string).trim();
  const metrics   = JSON.parse(formData.get("metrics") as string) as WizMetric[];

  const gFunder    = (formData.get("g_funder") as string).trim();
  const gEmail     = (formData.get("g_email") as string).trim();
  const gName      = (formData.get("g_name") as string).trim();
  const gAmountRaw = (formData.get("g_amount") as string).trim();
  const gReport    = (formData.get("g_report") as string).trim();
  const gAgreement = (formData.get("g_agreement") as string).trim();

  const supabase = await createClient();

  // 1. Insert program
  const { data: program } = await supabase
    .from("programs")
    .insert({ name, aim: aim || null, audience: audience || null })
    .select()
    .single();

  if (!program) throw new Error("Failed to create program");

  // 2. Insert metrics, get back real IDs for commitment matching
  const { data: inserted } = await supabase
    .from("metrics")
    .insert(
      metrics.map((m, i) => ({
        program_id: program.id,
        label: m.label,
        kind: m.type,
        target: m.type !== "text" && m.target ? Number(m.target) : null,
        on_dashboard: m.type !== "text",
        base: 0,
        sort_order: i,
      })),
    )
    .select();

  const realMetrics = (inserted ?? []) as Metric[];

  // 3. Optional grant + commitments
  let grantId: string | null = null;
  let commitmentCount = 0;

  const hasGrantData = gFunder || Number(gAmountRaw) > 0 || gAgreement;
  if (hasGrantData) {
    const commitments = gAgreement ? extractCommitments(gAgreement, realMetrics) : [];
    commitmentCount = commitments.length;

    const { data: grant } = await supabase
      .from("grants")
      .insert({
        program_id: program.id,
        name: gName || `${name} Grant`,
        funder_name: gFunder || "Funder",
        funder_email: gEmail || null,
        amount: Number(gAmountRaw) || 0,
        next_report: gReport || null,
        agreement_text: gAgreement || null,
      })
      .select()
      .single();

    if (grant) {
      grantId = grant.id;
      if (commitments.length > 0) {
        await supabase
          .from("commitments")
          .insert(commitments.map((c) => ({ ...c, grant_id: grant.id })));
      }
    }
  }

  // 4. Audit log
  await supabase.from("activity").insert({
    actor: "Manager",
    text: `created a new program: ${name}`,
  });
  if (grantId) {
    await supabase.from("activity").insert({
      actor: "Manager",
      text: `added grant "${gName || name + " Grant"}"${commitmentCount ? ` and extracted ${commitmentCount} commitments` : ""}`,
    });
  }

  // 5. Redirect — go to agreement engine if commitments were locked, else programs list
  if (grantId && commitmentCount > 0) {
    redirect(`/agreement?grant=${grantId}`);
  } else {
    redirect("/programs");
  }
}
