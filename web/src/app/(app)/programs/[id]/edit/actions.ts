"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProgram(id: string, _fd: FormData): Promise<void> {
  const name     = (_fd.get("name")     as string ?? "").trim();
  const aim      = (_fd.get("aim")      as string ?? "").trim();
  const audience = (_fd.get("audience") as string ?? "").trim();

  if (!name) throw new Error("Program name is required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ name, aim: aim || null, audience: audience || null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/programs");
  redirect(`/programs?p=${id}`);
}

export async function addMetric(programId: string, _fd: FormData): Promise<void> {
  const label       = (_fd.get("label")        as string ?? "").trim();
  const kind        = (_fd.get("kind")         as string ?? "number").trim();
  const targetRaw   = (_fd.get("target")       as string ?? "").trim();
  const onDash      = _fd.get("on_dashboard_cb") === "on";
  const sortRaw     = (_fd.get("sort_order")   as string ?? "").trim();

  if (!label) throw new Error("Label is required");

  const supabase = await createClient();

  // Place new metric at end if no sort_order given
  let sortOrder = sortRaw ? Number(sortRaw) : 999;
  if (isNaN(sortOrder)) sortOrder = 999;

  const { error } = await supabase.from("metrics").insert({
    program_id:   programId,
    label,
    kind:         kind === "yesno" || kind === "text" ? kind : "number",
    target:       targetRaw ? Number(targetRaw) : null,
    on_dashboard: onDash,
    base:         0,
    sort_order:   sortOrder,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/programs");
  redirect(`/programs/${programId}/edit`);
}

export async function updateMetric(metricId: string, programId: string, _fd: FormData): Promise<void> {
  const label     = (_fd.get("label")        as string ?? "").trim();
  const targetRaw = (_fd.get("target")       as string ?? "").trim();
  const onDash    = _fd.get("on_dashboard_cb") === "on";
  const sortRaw   = (_fd.get("sort_order")   as string ?? "").trim();

  if (!label) throw new Error("Label is required");

  const supabase = await createClient();
  const { error } = await supabase.from("metrics").update({
    label,
    target:       targetRaw ? Number(targetRaw) : null,
    on_dashboard: onDash,
    sort_order:   sortRaw ? Number(sortRaw) : 0,
  }).eq("id", metricId);
  if (error) throw new Error(error.message);

  revalidatePath("/programs");
  redirect(`/programs/${programId}/edit`);
}

export async function deleteMetric(metricId: string, programId: string, _fd: FormData): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("metrics").delete().eq("id", metricId);
  if (error) throw new Error(error.message);

  revalidatePath("/programs");
  redirect(`/programs/${programId}/edit`);
}

export async function deleteProgram(id: string, _fd: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: prog } = await supabase.from("programs").select("name").eq("id", id).single();
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("activity").insert({
    actor: "Manager",
    text: `permanently deleted program "${prog?.name ?? id}"`,
  });

  revalidatePath("/programs");
  revalidatePath("/");
  redirect("/programs");
}

export async function archiveProgram(id: string, _fd: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: prog } = await supabase.from("programs").select("name").eq("id", id).single();
  const { error } = await supabase.from("programs").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("activity").insert({
    actor: "Manager",
    text: `archived program "${prog?.name ?? id}"`,
  });

  revalidatePath("/programs");
  revalidatePath("/");
  redirect("/programs");
}
