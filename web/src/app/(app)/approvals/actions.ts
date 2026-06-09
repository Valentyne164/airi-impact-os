"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

async function setStatus(id: string, status: "approved" | "rejected" | "changes", note: string | null) {
  const admin = createAdminClient();
  await admin.from("logs").update({ status, manager_note: note }).eq("id", id);
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
