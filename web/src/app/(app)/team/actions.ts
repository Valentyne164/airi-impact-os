"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

/* ── Program assignments (existing) ─────────────────────────────── */

export async function addStaffToProgram(programId: string, formData: FormData): Promise<void> {
  const profileId = (formData.get("profile_id") as string ?? "").trim();
  if (!profileId || !programId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("program_staff")
    .insert({ program_id: programId, profile_id: profileId });

  if (error && !error.message.includes("duplicate")) {
    throw new Error(`Could not assign staff: ${error.message}`);
  }

  await admin.from("activity").insert({ actor: "Manager", text: `assigned a staff member to a program` });
  revalidatePath("/team");
}

export async function removeStaffFromProgram(programId: string, profileId: string, _fd: FormData): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("program_staff").delete()
    .eq("program_id", programId).eq("profile_id", profileId);
  if (error) throw new Error(`Could not remove staff: ${error.message}`);
  revalidatePath("/team");
}

/* ── Staff account management ────────────────────────────────────── */

export async function createStaff(
  formData: FormData,
): Promise<{ error?: string; created?: string }> {
  const name     = (formData.get("name")     as string ?? "").trim();
  const email    = (formData.get("email")    as string ?? "").trim();
  const role     = (formData.get("role")     as string ?? "staff").trim() as UserRole;
  const password = (formData.get("password") as string ?? "").trim();

  if (!name || !email || !password) return { error: "Name, email and password are all required." };
  if (password.length < 6)          return { error: "Password must be at least 6 characters." };

  try {
    const admin = createAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authErr) return { error: authErr.message };
    if (!user)   return { error: "Auth user was not created." };

    const { error: profileErr } = await admin.from("profiles").insert({
      id:        user.id,
      full_name: name,
      role:      role === "manager" ? "manager" : "staff",
      active:    true,
    });

    if (profileErr) {
      await admin.auth.admin.deleteUser(user.id);
      return { error: profileErr.message };
    }

    await admin.from("activity").insert({
      actor: "Manager",
      text:  `created staff account for "${name}" (${email})`,
    });

    revalidatePath("/team");
    return { created: name };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function updateStaff(profileId: string, formData: FormData): Promise<void> {
  const name = (formData.get("name") as string ?? "").trim();
  const role = (formData.get("role") as string ?? "staff").trim() as UserRole;
  if (!name) throw new Error("Name is required.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: name, role })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
}

export async function deactivateStaff(profileId: string, _fd: FormData): Promise<void> {
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", profileId).single();

  await admin.from("profiles").update({ active: false }).eq("id", profileId);

  // Ban the auth user so they cannot log in
  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(profileId, { ban_duration: "876600h" });
  } catch {
    // Ignore — profile flag is the primary guard; auth ban is best-effort
  }

  await admin.from("activity").insert({
    actor: "Manager",
    text:  `deactivated staff account "${prof?.full_name ?? profileId}"`,
  });

  revalidatePath("/team");
}

export async function reactivateStaff(profileId: string, _fd: FormData): Promise<void> {
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", profileId).single();

  await admin.from("profiles").update({ active: true }).eq("id", profileId);

  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(profileId, { ban_duration: "none" });
  } catch {
    // Ignore — profile flag is the primary guard
  }

  await admin.from("activity").insert({
    actor: "Manager",
    text:  `reactivated staff account "${prof?.full_name ?? profileId}"`,
  });

  revalidatePath("/team");
}
