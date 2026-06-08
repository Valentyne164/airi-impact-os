"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractCommitments } from "@/lib/impact";
import { getMetrics } from "@/lib/data";

export async function createGrant(formData: FormData) {
  const name         = (formData.get("name") as string).trim();
  const programId    = (formData.get("program_id") as string).trim() || null;
  const funderName   = (formData.get("funder_name") as string).trim() || "Funder";
  const funderEmail  = (formData.get("funder_email") as string).trim() || null;
  const amount       = Number(formData.get("amount") as string) || 0;
  const termStart    = (formData.get("term_start") as string).trim() || null;
  const termEnd      = (formData.get("term_end") as string).trim() || null;
  const nextReport   = (formData.get("next_report") as string).trim() || null;
  const agreementText = (formData.get("agreement_text") as string).trim() || null;

  const supabase = await createClient();

  const { data: grant, error } = await supabase
    .from("grants")
    .insert({
      name,
      program_id: programId,
      funder_name: funderName,
      funder_email: funderEmail,
      amount,
      term_start: termStart,
      term_end: termEnd,
      next_report: nextReport,
      agreement_text: agreementText,
    })
    .select()
    .single();

  if (error || !grant) throw new Error(`Failed to create grant: ${error?.message}`);

  // Extract + lock commitments if agreement was provided
  if (agreementText) {
    const allMetrics = await getMetrics();
    const metrics = programId
      ? allMetrics.filter((m) => m.program_id === programId)
      : [];
    const commitments = extractCommitments(agreementText, metrics);
    if (commitments.length > 0) {
      const { error: cErr } = await supabase
        .from("commitments")
        .insert(commitments.map((c) => ({ ...c, grant_id: grant.id })));
      if (cErr) throw new Error(`Could not save commitments: ${cErr.message}`);
    }
  }

  await supabase.from("activity").insert({
    actor: "Manager",
    text: `added a new grant: ${name} (${funderName})`,
  });

  redirect(`/grants/${grant.id}`);
}
