"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPrograms, getMetrics, getGrants, getApprovedLogs, getExpenses } from "@/lib/data";
import { genOverviewBody, answerFor } from "@/lib/impact";
import type { ReportQA } from "@/types/database";

export async function generateOverview(
  formData: FormData,
): Promise<{ id: string; body: string }> {
  const programId  = (formData.get("program_id")  as string) ?? "";
  const periodFrom = (formData.get("period_from") as string) ?? "";
  const periodTo   = (formData.get("period_to")   as string) ?? "";
  const extraCtx   = ((formData.get("extra_ctx")  as string) ?? "").trim();

  const [programs, metrics, grants, logs, expenses] = await Promise.all([
    getPrograms(), getMetrics(), getGrants(), getApprovedLogs(), getExpenses(),
  ]);

  const program = programs.find((p) => p.id === programId);
  if (!program) throw new Error("Program not found");

  const progMetrics = metrics.filter((m) => m.program_id === programId);
  const period = `${periodFrom} to ${periodTo}`;
  const body = genOverviewBody(program, progMetrics, logs, grants, expenses, period, extraCtx);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      program_id: programId,
      grant_id: null,
      type: "overview",
      title: `${program.name} — Project Overview`,
      period_from: periodFrom || null,
      period_to: periodTo || null,
      format: "Project overview",
      body,
      qa: null,
      recipient_email: null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Could not save report: ${error.message}`);

  await supabase.from("activity").insert({
    actor: "Automation",
    text: `generated a project overview for ${program.name}`,
  });

  revalidatePath("/reports");
  return { id: (data as { id: string }).id, body };
}

export async function generateSpecific(
  formData: FormData,
): Promise<{ id: string; body: string; qa: ReportQA[] }> {
  const programId  = (formData.get("program_id")  as string) ?? "";
  const grantId    = ((formData.get("grant_id")   as string) ?? "").trim();
  const periodFrom = (formData.get("period_from") as string) ?? "";
  const periodTo   = (formData.get("period_to")   as string) ?? "";
  const rawQ       = ((formData.get("questions")  as string) ?? "").trim();

  if (!rawQ) throw new Error("Paste at least one funder question");

  const qs = rawQ
    .split(/\n+/)
    .flatMap((l) => l.split(/(?<=\?)\s+/))
    .map((x) => x.replace(/^\s*(\d+[).\]]|[-•*])\s*/, "").trim())
    .filter((x) => x.length > 3);

  if (!qs.length) throw new Error("No valid questions found");

  const [programs, metrics, grants, logs, expenses] = await Promise.all([
    getPrograms(), getMetrics(), getGrants(), getApprovedLogs(), getExpenses(),
  ]);

  const program = programs.find((p) => p.id === programId);
  if (!program) throw new Error("Program not found");

  const progMetrics = metrics.filter((m) => m.program_id === programId);
  const grant = grantId ? (grants.find((g) => g.id === grantId) ?? null) : null;
  const period = `${periodFrom} to ${periodTo}`;

  const qa: ReportQA[] = qs.map((q) => ({
    q,
    a: answerFor(q, program, progMetrics, logs, grants, expenses, grant, period),
  }));

  const bodyLines = [
    `FUNDER REPORT — ${program.name}`,
    `Funder: ${grant ? grant.funder_name : "—"} · Grant: ${grant ? grant.name : "—"}`,
    `Period: ${period}`,
    "",
    ...qa.map((x, i) => `Q${i + 1}. ${x.q}\n${x.a}`),
    "",
    "All figures reflect manager-verified data only.",
  ];
  const body = bodyLines.join("\n\n");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      program_id: programId,
      grant_id: grantId || null,
      type: "specific",
      title: `${program.name} — ${grant ? grant.funder_name : "Funder"} report`,
      period_from: periodFrom || null,
      period_to: periodTo || null,
      format: "Funder Q&A report",
      body,
      qa,
      recipient_email: grant?.funder_email ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Could not save report: ${error.message}`);

  await supabase.from("activity").insert({
    actor: "Automation",
    text: `drafted a funder report (${qs.length} question${qs.length > 1 ? "s" : ""}) for ${grant ? grant.funder_name : program.name}`,
  });

  revalidatePath("/reports");
  return { id: (data as { id: string }).id, body, qa };
}

export async function approveReport(id: string, _fd: FormData): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status: "approved" }).eq("id", id);
  if (error) throw new Error(`Could not approve: ${error.message}`);

  await supabase.from("activity").insert({
    actor: "Manager",
    text: "approved a report draft",
  });

  revalidatePath("/reports");
}

export async function rejectReport(id: string, _fd: FormData): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status: "rejected" }).eq("id", id);
  if (error) throw new Error(`Could not reject: ${error.message}`);

  revalidatePath("/reports");
}

export async function sendReport(id: string, _fd: FormData): Promise<void> {
  const supabase = await createClient();

  const { data: report, error: fetchErr } = await supabase
    .from("reports")
    .select("title, recipient_email")
    .eq("id", id)
    .single();
  if (fetchErr) throw new Error(`Could not fetch report: ${fetchErr.message}`);

  const { error } = await supabase
    .from("reports")
    .update({ status: "sent" })
    .eq("id", id);
  if (error) throw new Error(`Could not send report: ${error.message}`);

  const r = report as { title: string; recipient_email: string | null };
  await supabase.from("activity").insert({
    actor: "Manager",
    text: `sent "${r.title}" to funder${r.recipient_email ? ` (${r.recipient_email})` : ""}`,
  });

  revalidatePath("/reports");
  revalidatePath("/funder");
  revalidatePath("/funder/reports");
}
