"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getMetrics } from "@/lib/data";
import type { LogValues } from "@/types/database";

export async function submitOutcomeEvidence(formData: FormData): Promise<void> {
  const commitmentId = ((formData.get("commitment_id") as string) ?? "").trim();
  const note         = ((formData.get("note")          as string) ?? "").trim();

  if (!commitmentId || !note) return;

  const profile = await getProfile();
  if (!profile) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: commitment } = await admin
    .from("commitments")
    .select("id, grant_id, label")
    .eq("id", commitmentId)
    .single();
  if (!commitment) throw new Error("Commitment not found");

  const { data: grant } = await admin
    .from("grants")
    .select("program_id")
    .eq("id", commitment.grant_id)
    .single();
  if (!grant?.program_id) throw new Error("Grant has no linked program");

  const { error } = await admin.from("logs").insert({
    program_id:    grant.program_id,
    staff_id:      profile.id,
    log_date:      new Date().toISOString().slice(0, 10),
    narrative:     note,
    evidence_note: null,
    values:        {},
    status:        "pending",
    manager_note:  null,
    commitment_id: commitmentId,
  });
  if (error) throw new Error(`Could not submit evidence: ${error.message}`);

  const supabase = await createClient();
  await supabase.from("activity").insert({
    actor: profile.full_name,
    text:  "submitted evidence for outcome: " + commitment.label,
  });

  redirect("/my-logs");
}

export async function submitLog(formData: FormData): Promise<void> {
  const programId    = (formData.get("program_id")    as string ?? "").trim();
  const logId        = (formData.get("log_id")        as string ?? "").trim();
  const narrative    = (formData.get("narrative")     as string ?? "").trim();
  const evidenceNote = (formData.get("evidence_note") as string ?? "").trim();
  const logDate      = (formData.get("log_date")      as string ?? "").trim()
    || new Date().toISOString().slice(0, 10);

  if (!programId) throw new Error("No program selected");

  const [profile, allMetrics] = await Promise.all([getProfile(), getMetrics()]);
  if (!profile) throw new Error("Not authenticated");

  const progMetrics = allMetrics.filter((m) => m.program_id === programId);

  const values: LogValues = {};
  for (const m of progMetrics) {
    const raw = formData.get(`metric_${m.id}`);
    if (m.kind === "yesno") {
      values[m.id] = raw === "true";
    } else if (m.kind === "number") {
      values[m.id] = Number(raw) || 0;
    } else {
      values[m.id] = (raw as string ?? "").trim();
    }
  }

  const supabase = await createClient();
  const admin    = createAdminClient();

  if (logId) {
    const { error } = await admin
      .from("logs")
      .update({
        narrative: narrative || null,
        evidence_note: evidenceNote || null,
        values,
        status: "pending",
        manager_note: null,
        log_date: logDate,
      })
      .eq("id", logId)
      .eq("staff_id", profile.id);
    if (error) throw new Error(`Could not update log: ${error.message}`);
    await supabase.from("activity").insert({
      actor: profile.full_name,
      text: "resubmitted a revised log for review",
    });
  } else {
    const { error } = await admin.from("logs").insert({
      program_id:    programId,
      staff_id:      profile.id,
      log_date:      logDate,
      narrative:     narrative || null,
      evidence_note: evidenceNote || null,
      values,
      status:        "pending",
      manager_note:  null,
    });
    if (error) throw new Error(`Could not submit log: ${error.message}`);
    await supabase.from("activity").insert({
      actor: profile.full_name,
      text: "submitted a log for review",
    });
  }

  redirect("/my-logs");
}
