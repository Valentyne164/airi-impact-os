import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getPendingLogs } from "@/lib/data";
import type { UserRole } from "@/types/database";
import SignOut from "./SignOut";
import NavLinks from "./NavLinks";

const NAV: Record<UserRole, { href: string; label: string }[]> = {
  manager: [
    { href: "/", label: "Dashboard" },
    { href: "/approvals", label: "Approvals" },
    { href: "/programs", label: "Programs" },
    { href: "/grants", label: "Grants" },
    { href: "/agreement", label: "Agreement Engine" },
    { href: "/deadlines", label: "Deadlines" },
    { href: "/evidence", label: "Evidence" },
    { href: "/team", label: "Team" },
    { href: "/reports", label: "Reports" },
    { href: "/funder-preview", label: "Funder Preview" },
    { href: "/activity", label: "Activity Log" },
    { href: "/search", label: "Search" },
  ],
  staff: [
    { href: "/log", label: "Submit Log" },
    { href: "/my-logs", label: "My Submissions" },
    { href: "/my-impact", label: "My Impact" },
  ],
  funder: [
    { href: "/funder", label: "Impact Overview" },
    { href: "/funder/reports", label: "Reports" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile();
  // Deactivated accounts are blocked — active is undefined before migration, so only block explicit false.
  if (profile?.active === false) redirect("/login");

  const role = profile?.role ?? "staff";
  const baseItems = NAV[role] ?? NAV.staff;

  // Attach pending badge count to Approvals for managers
  let pendingCount = 0;
  if (role === "manager") {
    const pending = await getPendingLogs();
    pendingCount = pending.length;
  }

  const items = baseItems.map((item) =>
    item.href === "/approvals" && pendingCount > 0
      ? { ...item, badge: pendingCount }
      : item,
  );

  const initials = (name: string) =>
    name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      <aside className="bg-green text-[#dcebe2] p-4 flex flex-col gap-1 sticky top-0 h-screen overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-3 px-1.5 pb-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-lime text-green grid place-items-center font-display font-bold text-lg">AI</div>
          <div>
            <div className="font-display text-white text-lg leading-none">AIRI</div>
            <div className="text-[11px] uppercase tracking-wider text-[#9fc3b2]">Impact OS</div>
          </div>
        </div>

        {/* User card */}
        <div className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-xl mb-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-lime text-green grid place-items-center font-mono font-bold text-xs flex-shrink-0">
            {initials(profile?.full_name ?? "User")}
          </div>
          <div className="leading-tight flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate">
              {profile?.full_name ?? user.email}
            </div>
            <div className="text-[#9fc3b2] text-xs capitalize">{role}</div>
          </div>
          {/* Bell — pending approvals */}
          {role === "manager" && (
            <Link
              href="/approvals"
              title={pendingCount > 0 ? `${pendingCount} awaiting approval` : "Approvals"}
              className="relative p-1.5 rounded-lg text-[#9fc3b2] hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </Link>
          )}
          {/* Settings icon */}
          <Link
            href="/settings"
            title="Settings"
            className="p-1.5 rounded-lg text-[#9fc3b2] hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </Link>
          <SignOut />
        </div>

        {/* Nav items */}
        <NavLinks items={items} />

        {/* Governance note */}
        <div className="mt-auto pt-2 flex-shrink-0 bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-[#cfe3d7]">
          <b className="block text-lime text-[11px] uppercase tracking-wider mb-1">Governance</b>
          Automation drafts. A manager reviews. Nothing reaches funders without approval.
        </div>
      </aside>
      <main className="min-h-screen overflow-auto">{children}</main>
    </div>
  );
}
