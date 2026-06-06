"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Manager-only writes. RLS ("managers update logs") enforces the role at the DB,
// so these actions are safe even though the UI also hides them from non-managers.

async function setStatus(id: string, status: "approved" | "rejected" | "changes", note: string | null) {
  const supabase = await createClient();
  await supabase.from("logs").update({ status, manager_note: note }).eq("id", id);
  revalidatePath("/approvals");
  revalidatePath("/"); // executive figures depend on approved data
}

export async function approveLog(id: string) {
  await setStatus(id, "approved", null);
}

export async function requestChanges(id: string, formData: FormData) {
  await setStatus(id, "changes", String(formData.get("note") || "Please revise and resubmit."));
}

export async function denyLog(id: string, formData: FormData) {
  await setStatus(id, "rejected", String(formData.get("note") || "Not approved."));
}
