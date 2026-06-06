import { createClient } from "@/lib/supabase/server";
import type { Profile, Program, Metric, Grant, Commitment, Log, Expense } from "@/types/database";

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
  const { data } = await supabase.from("programs").select("*").order("created_at");
  return (data ?? []) as Program[];
}

export async function getMetrics(): Promise<Metric[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("metrics").select("*").order("sort_order");
  return (data ?? []) as Metric[];
}

export async function getGrants(): Promise<Grant[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("grants").select("*").order("created_at");
  return (data ?? []) as Grant[];
}

export async function getCommitments(grantId?: string): Promise<Commitment[]> {
  const supabase = await createClient();
  let q = supabase.from("commitments").select("*");
  if (grantId) q = q.eq("grant_id", grantId);
  const { data } = await q;
  return (data ?? []) as Commitment[];
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

export async function getExpenses(): Promise<Expense[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*");
  return (data ?? []) as Expense[];
}