"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateGrant(id: string, _fd: FormData): Promise<void> {
  const name        = (_fd.get("name")         as string ?? "").trim();
  const funderName  = (_fd.get("funder_name")  as string ?? "").trim();
  const funderEmail = (_fd.get("funder_email") as string ?? "").trim();
  const amountRaw   = (_fd.get("amount")       as string ?? "").trim();
  const termStart   = (_fd.get("term_start")   as string ?? "").trim();
  const termEnd     = (_fd.get("term_end")     as string ?? "").trim();
  const nextReport  = (_fd.get("next_report")  as string ?? "").trim();
  const programId   = (_fd.get("program_id")   as string ?? "").trim();

  if (!name)      throw new Error("Grant name is required");
  if (!programId) throw new Error("A program must be selected");
  if (!amountRaw) throw new Error("Amount is required");

  const amount = Number(amountRaw);
  if (isNaN(amount) || amount < 0) throw new Error("Invalid amount");

  const admin = createAdminClient();
  const { error } = await admin.from("grants").update({
    name,
    funder_name:  funderName  || null,
    funder_email: funderEmail || null,
    amount,
    term_start:   termStart   || null,
    term_end:     termEnd     || null,
    next_report:  nextReport  || null,
    program_id:   programId,
  }).eq("id", id);

  if (error) throw new Error(error.message);

  await admin.from("activity").insert({
    actor: "Manager",
    text: `updated grant "${name}"`,
  });

  revalidatePath("/grants");
  revalidatePath(`/grants/${id}`);
  redirect(`/grants/${id}`);
}

export async function deleteGrant(id: string, _fd: FormData): Promise<void> {
  const admin = createAdminClient();
  const { data: grant } = await admin.from("grants").select("name").eq("id", id).single();
  const { error } = await admin.from("grants").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await admin.from("activity").insert({
    actor: "Manager",
    text: `permanently deleted grant "${grant?.name ?? id}"`,
  });

  revalidatePath("/grants");
  revalidatePath("/");
  redirect("/grants");
}

export async function archiveGrant(id: string, _fd: FormData): Promise<void> {
  const admin = createAdminClient();
  const { data: grant } = await admin.from("grants").select("name").eq("id", id).single();
  const { error } = await admin.from("grants").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);

  await admin.from("activity").insert({
    actor: "Manager",
    text: `archived grant "${grant?.name ?? id}"`,
  });

  revalidatePath("/grants");
  revalidatePath("/");
  redirect("/grants");
}
