import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data";
import type { UserRole } from "@/types/database";
import SignOut from "./SignOut";

const NAV: Record<UserRole, { href: string; label: string }[]> = {
  manager: [
    { href: "/", label: "Executive" },
    { href: "/approvals", label: "Approvals" },
    { href: "/grants", label: "Grants" },
  ],
  staff: [{ href: "/", label: "My Impact" }],
  funder: [{ href: "/", label: "Impact Overview" }],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile();
  const items = NAV[profile?.role ?? "staff"] ?? NAV.staff;

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      <aside className="bg-green text-[#dcebe2] p-4 flex flex-col gap-1 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-1.5 pb-4">
          <div className="w-10 h-10 rounded-xl bg-lime text-green grid place-items-center font-display font-bold">AI</div>
          <div>
            <div className="font-display text-white text-lg leading-none">AIRI</div>
            <div className="text-[11px] uppercase tracking-wider text-[#9fc3b2]">Impact OS</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-xl mb-2">
          <div className="w-8 h-8 rounded-lg bg-lime text-green grid place-items-center font-mono font-bold text-xs">
            {(profile?.full_name ?? "User").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="text-white text-sm font-semibold">{profile?.full_name ?? user.email}</div>
            <div className="text-[#9fc3b2] text-xs capitalize">{profile?.role ?? "—"}</div>
          </div>
          <SignOut />
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#c5dccf] hover:bg-white/10 hover:text-white">
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-[#cfe3d7]">
          <b className="block text-lime text-[11px] uppercase tracking-wider mb-1">Governance</b>
          Automation drafts. A manager reviews. Nothing reaches funders without approval.
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}