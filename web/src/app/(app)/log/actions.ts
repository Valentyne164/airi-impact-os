"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getMetrics } from "@/lib/data";
import type { LogValues } from "@/types/database";

export async function submitLog(formData: FormData): Promise<void> {
  const programId = (formData.get("program_id") as string ?? "").trim();
  const logId     = (formData.get("log_id")     as string ?? "").trim();
  const narrative = (formData.get("narrative")  as string ?? "").trim();
  const logDate   = (formData.get("log_date")   as string ?? "").trim()
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

  if (logId) {
    const { error } = await supabase
      .from("logs")
      .update({ narrative: narrative || null, values, status: "pending", manager_note: null, log_date: logDate })
      .eq("id", logId)
      .eq("staff_id", profile.id);
    if (error) throw new Error(`Could not update log: ${error.message}`);
    await supabase.from("activity").insert({
      actor: profile.full_name,
      text: "resubmitted a revised log for review",
    });
  } else {
    const { error } = await supabase.from("logs").insert({
      program_id: programId,
      staff_id:   profile.id,
      log_date:   logDate,
      narrative:  narrative || null,
      values,
      status:     "pending",
      manager_note: null,
    });
    if (error) throw new Error(`Could not submit log: ${error.message}`);
    await supabase.from("activity").insert({
      actor: profile.full_name,
      text: "submitted a log for review",
    });
  }

  redirect("/my-logs");
}
