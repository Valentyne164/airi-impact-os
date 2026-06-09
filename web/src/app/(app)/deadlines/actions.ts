"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGrant } from "@/lib/data";
import { dueStatus } from "@/lib/impact";

export async function sendReminder(grantId: string) {
  const admin = createAdminClient();
  const grant = await getGrant(grantId);
  if (!grant) return;

  const d = dueStatus(grant);
  const stageLabel = d.current ? d.current.label : "status check";

  await admin.from("activity").insert({
    actor: "Deadline engine",
    text: `sent a "${stageLabel}" reminder for ${grant.name} to the manager`,
  });

  revalidatePath("/deadlines");
  revalidatePath("/activity");
}
