import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Funder, Program, Metric, Grant, Commitment, Log, Expense, Attachment, Activity, Report, ProgramStaff } from "@/types/database";

// Centralised reads. RLS ensures each role only receives rows it may see,
// so these same calls return role-appropriate data automatically.

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function getPrograms(): Promise<Program[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("programs").select("*").is("archived_at", null).order("created_at");
  if (error) {
    // archived_at column may not exist yet — fall back to all rows
    const { data: all } = await supabase.from("programs").select("*").order("created_at");
    return (all ?? []) as Program[];
  }
  return (data ?? []) as Program[];
}

export async function getMetrics(): Promise<Metric[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("metrics").select("*").order("sort_order");
  return (data ?? []) as Metric[];
}

export async function getGrants(): Promise<Grant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("grants").select("*").is("archived_at", null).order("created_at");
  if (error) {
    // archived_at column may not exist yet — fall back to all rows
    const { data: all } = await supabase.from("grants").select("*").order("created_at");
    return (all ?? []) as Grant[];
  }
  return (data ?? []) as Grant[];
}

export async function getCommitments(grantId?: string): Promise<Commitment[]> {
  const supabase = await createClient();
  let q = supabase.from("commitments").select("*");
  if (grantId) q = q.eq("grant_id", grantId);
  const { data } = await q;
  const all = (data ?? []) as Commitment[];
  // Deduplicate by (grant_id, label) — keeps first occurrence.
  // Guards against stale duplicate rows if a prior delete was blocked at the DB level.
  const seen = new Set<string>();
  return all.filter((c) => {
    const key = `${c.grant_id}:${c.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getApprovedLogs(): Promise<Log[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("logs").select("*").eq("status", "approved");
  return (data ?? []) as Log[];
}

export async function getGrant(id: string): Promise<Grant | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("grants").select("*").eq("id", id).single();
  return data as Grant | null;
}

export async function getPendingLogs(): Promise<Log[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("logs").select("*").eq("status", "pending").order("log_date", { ascending: false });
  return (data ?? []) as Log[];
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*");
  return (data ?? []) as Profile[];
}

// Uses service-role client to bypass RLS — needed for manager team views
// where a manager must read/write profiles they don't own.
export async function getProfilesAdmin(): Promise<Profile[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("*");
    return (data ?? []) as Profile[];
  } catch {
    return getProfiles();
  }
}

export async function getExpenses(): Promise<Expense[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*");
  return (data ?? []) as Expense[];
}

export async function getAttachments(logId?: string): Promise<Attachment[]> {
  const supabase = await createClient();
  let q = supabase.from("attachments").select("*");
  if (logId) q = q.eq("log_id", logId);
  const { data } = await q;
  return (data ?? []) as Attachment[];
}

export async function getActivity(): Promise<Activity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Activity[];
}

export async function getAllLogs(): Promise<Log[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Log[];
}

export async function getProgramStaff(): Promise<ProgramStaff[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("program_staff").select("*");
  return (data ?? []) as ProgramStaff[];
}

export async function getReports(programId?: string): Promise<Report[]> {
  const supabase = await createClient();
  let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (programId) q = q.eq("program_id", programId);
  const { data } = await q;
  return (data ?? []) as Report[];
}

export async function getFunder(id: string): Promise<Funder | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("funders").select("*").eq("id", id).single();
  return data as Funder | null;
}