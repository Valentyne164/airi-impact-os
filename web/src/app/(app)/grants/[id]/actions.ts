"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data";

export async function addExpense(grantId: string, formData: FormData) {
  const amount = Number((formData.get("amount") as string) ?? 0);
  if (!amount || amount <= 0) return;

  const category   = ((formData.get("category") as string) ?? "").trim() || "General";
  const invoiceRef = ((formData.get("invoice") as string) ?? "").trim() || null;

  const supabase = await createClient();
  const profile  = await getProfile();

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("expenses").insert({
    grant_id:     grantId,
    expense_date: today,
    category,
    amount,
    invoice_ref:  invoiceRef,
    created_by:   profile?.id ?? null,
  });
  if (error) throw new Error(`Could not log expense: ${error.message}`);

  await supabase.from("activity").insert({
    actor: "Manager",
    text:  `logged a $${amount.toLocaleString()} ${category} expense`,
  });

  revalidatePath(`/grants/${grantId}`);
  revalidatePath("/");
}
