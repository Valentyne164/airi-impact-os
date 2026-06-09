"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/data";

export async function updateName(formData: FormData): Promise<{ error?: string }> {
  const name = (formData.get("full_name") as string ?? "").trim();
  if (!name) return { error: "Name cannot be empty" };

  const admin   = createAdminClient();
  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated" };

  const { error } = await admin
    .from("profiles")
    .update({ full_name: name })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/");
  return {};
}

export async function updatePassword(formData: FormData): Promise<{ error?: string }> {
  const password  = (formData.get("password")  as string ?? "").trim();
  const confirmed = (formData.get("confirm")   as string ?? "").trim();

  if (password.length < 8)      return { error: "Password must be at least 8 characters" };
  if (password !== confirmed)   return { error: "Passwords do not match" };

  // Must use the user's own session for auth operations — not admin client.
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return {};
}
