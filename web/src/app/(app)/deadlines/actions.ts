"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGrant } from "@/lib/data";
import { dueStatus } from "@/lib/impact";

export async function sendReminder(grantId: string) {
  const supabase = await createClient();
  const grant = await getGrant(grantId);
  if (!grant) return;

  const d = dueStatus(grant);
  const stageLabel = d.current ? d.current.label : "status check";

  await supabase.from("activity").insert({
    actor: "Deadline engine",
    text: `sent a "${stageLabel}" reminder for ${grant.name} to the manager`,
  });

  revalidatePath("/deadlines");
  revalidatePath("/activity");
}
