"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOut() {
  const router = useRouter();
  async function out() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={out} className="ml-auto text-xs underline text-[#cfe3d7]">
      Log out
    </button>
  );
}
