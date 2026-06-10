"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

interface WizMetric {
  label: string;
  type: "number" | "yesno" | "text";
  target: string;
}

export async function createProgram(formData: FormData) {
  const name     = (formData.get("name")     as string).trim();
  const aim      = (formData.get("aim")      as string).trim();
  const audience = (formData.get("audience") as string).trim();
  const metrics  = JSON.parse(formData.get("metrics") as string) as WizMetric[];

  const admin = createAdminClient();

  const { data: program } = await admin
    .from("programs")
    .insert({ name, aim: aim || null, audience: audience || null })
    .select()
    .single();

  if (!program) throw new Error("Failed to create program");

  if (metrics.length > 0) {
    await admin.from("metrics").insert(
      metrics.map((m, i) => ({
        program_id:   program.id,
        label:        m.label,
        kind:         m.type,
        target:       m.type !== "text" && m.target ? Number(m.target) : null,
        on_dashboard: m.type !== "text",
        base:         0,
        sort_order:   i,
      })),
    );
  }

  await admin.from("activity").insert({
    actor: "Manager",
    text: `created a new program: ${name}`,
  });

  redirect("/programs");
}
