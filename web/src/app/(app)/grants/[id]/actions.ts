"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/data";
import type { Expense } from "@/types/database";

export async function addExpense(grantId: string, formData: FormData) {
  const amount = Number((formData.get("amount") as string) ?? 0);
  if (!amount || amount <= 0) return;

  const category   = ((formData.get("category") as string) ?? "").trim() || "General";
  const invoiceRef = ((formData.get("invoice") as string) ?? "").trim() || null;

  const admin   = createAdminClient();
  const profile = await getProfile();

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await admin.from("expenses").insert({
    grant_id:     grantId,
    expense_date: today,
    category,
    amount,
    invoice_ref:  invoiceRef,
    created_by:   profile?.id ?? null,
  });
  if (error) throw new Error(`Could not log expense: ${error.message}`);

  await admin.from("activity").insert({
    actor: "Manager",
    text:  `logged a $${amount.toLocaleString()} ${category} expense`,
  });

  revalidatePath(`/grants/${grantId}`);
  revalidatePath("/");
}

export async function deleteExpense(expenseId: string, grantId: string) {
  const profile = await getProfile();
  if (profile?.role !== "manager") throw new Error("Manager access required");

  const admin = createAdminClient();

  // Fetch the expense first so we can describe it in the activity log
  const { data: row, error: fetchErr } = await admin
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .single();
  if (fetchErr || !row) throw new Error("Expense not found");

  const expense = row as Expense;

  const { error } = await admin.from("expenses").delete().eq("id", expenseId);
  if (error) throw new Error(`Could not delete expense: ${error.message}`);

  await admin.from("activity").insert({
    actor: profile.full_name ?? "Manager",
    text:  `deleted expense: ${expense.category ?? "General"} $${expense.amount.toLocaleString()}`,
  });

  revalidatePath(`/grants/${grantId}`);
  revalidatePath("/");
}
