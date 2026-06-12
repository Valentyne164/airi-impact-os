"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Purge all cached RSC payloads for the entire app tree so no
  // authenticated content survives in the server-side cache.
  revalidatePath("/", "layout");
  // redirect() from a server action triggers a full-page navigation (not a
  // client-side router push), which bypasses the App Router's in-memory
  // router cache entirely.
  redirect("/login");
}
