"use client";

import { createClient } from "@/lib/supabase/client";

export default function SignOut() {
  async function handleSignOut() {
    // Sign out via the browser Supabase client — this hits the Supabase API to
    // invalidate the server-side session and deletes the sb-* auth cookies from
    // the browser before we navigate away.
    await createClient().auth.signOut();
    // Hard full-page navigation: bypasses Next.js's in-memory App Router cache
    // entirely so no stale authenticated RSC payload can survive in the tab.
    window.location.href = "/login";
  }
  return (
    <button onClick={handleSignOut} className="ml-auto text-xs underline text-[#cfe3d7]">
      Log out
    </button>
  );
}
