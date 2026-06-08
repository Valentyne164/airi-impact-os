import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile, getFunder, getPrograms, getMetrics,
  getGrants, getApprovedLogs, getExpenses,
} from "@/lib/data";
import { aggregate, impactScore, grantSpent, burnPct } from "@/lib/impact";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { p?: string };
}

export default async function FunderDashPage({ searchParams }: Props) {
  const profile = await getProfile();
  if (!profile || profile.role !== "funder") redirect("/");

  const funder = profile.funder_id ? await getFunder(profile.funder_id) : null;
  const funderOrg = funder?.org ?? profile.full_name;

  const [programs, metrics, grants, logs, expenses] = await Promise.all([
    getPrograms(), getMetrics(), getGrants(), getApprovedLogs(), getExpenses(),
  ]);

  // Scope grants to this funder (belt-and-suspenders on top of RLS).
  const myGrants = profile.funder_id
    ? grants.filter((g) => g.funder_id === profile.funder_id)
    : grants;

  const myProgramIds = new Set(
    myGrants.map((g) => g.program_id).filter(Boolean) as string[],
  );
  const myPrograms = programs.filter((p) => myProgramIds.has(p.id));

  if (myPrograms.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="bg-white border border-line rounded-2xl p-10 inline-block max-w-md">
          <p className="text-muted mb-2">No programs linked to your grants yet.</p>
          <p className="text-xs text-muted">Your program manager will link your grants once set up.</p>
        </div>
      </div>
    );
  }

  const active = myPrograms.find((p) => p.id === searchParams.p) ?? myPrograms[0];
  const progMetrics = metrics.filter((m) => m.program_id === active.id);
  const dashMetrics = progMetrics.filter((m) => m.on_dashboard && m.target);
  const score       = impactScore(progMetrics, logs);
  const myGrantsHere = myGrants.filter((g) => g.program_id === active.id);

  const fmt = (n: number) => "$" + n.toLocaleString();

  return (
    <div>
      {/* Sticky header */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl">Impact Overview</h1>
            <p className="text-muted text-sm">
              Manager-approved outcomes only — private staff logs are never shown here.
            </p>
          </div>
          {myPrograms.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {myPrograms.map((p) => (
                <Link
                  key={p.id}
                  href={`/funder?p=${p.id}`}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    p.id === active.id
                      ? "bg-green text-white border-green"
                      : "bg-paper border-line text-muted hover:text-ink"
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-8">
        {/* Lock note */}
        <div className="flex items-center gap-3 bg-[#e3f0e9] border border-[#cde2d5] text-green rounded-xl px-4 py-3 text-sm font-medium mb-6">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>
            You are viewing <b className="text-ink">{active.name}</b> as{" "}
            <b className="text-ink">{funderOrg}</b>. Read-only — manager-approved outcomes only.
            Private staff logs are never exposed here.
          </span>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 mb-6">
          {dashMetrics.map((m) => {
            const a   = aggregate(m, logs);
            const pct = Math.min(100, Math.round((a / (m.target as number)) * 100));
            return (
              <div key={m.id} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-muted">
                  {m.label}
                </div>
                <div className="font-mono text-[1.95rem] font-semibold mt-2 leading-none">
                  {a}{" "}
                  <span className="text-base font-normal text-muted">/ {m.target}</span>
                </div>
                <div className="text-xs font-semibold mt-1 text-[#1f9d6b]">{pct}% of goal</div>
                <div className="h-2 bg-[#eef2ee] rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg,#acd84e,#cef17b)",
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Impact score */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Impact score</div>
            <div className="font-mono text-[1.95rem] font-semibold mt-2 leading-none">
              {score}{" "}
              <span className="text-base font-normal text-muted">/ 100</span>
            </div>
            <div className="text-xs font-semibold mt-1 text-[#1f9d6b]">composite of goals</div>
            <div className="h-2 bg-[#eef2ee] rounded-full mt-2.5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score}%`,
                  background: "linear-gradient(90deg,#acd84e,#cef17b)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Funding table */}
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h3 className="font-display text-lg">Your funding in this program</h3>
            {myGrantsHere.length > 0 && (
              <Link
                href="/funder/reports"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-[#e3f0e9] hover:border-[#cde2d5] hover:text-green transition-colors"
              >
                View reports
              </Link>
            )}
          </div>

          {myGrantsHere.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left p-3 pl-5 text-muted text-xs uppercase tracking-wide font-bold">Grant</th>
                  <th className="text-right p-3 text-muted text-xs uppercase tracking-wide font-bold">Committed</th>
                  <th className="text-right p-3 text-muted text-xs uppercase tracking-wide font-bold">Deployed</th>
                  <th className="text-left p-3 pr-5 text-muted text-xs uppercase tracking-wide font-bold">Next report</th>
                </tr>
              </thead>
              <tbody>
                {myGrantsHere.map((g) => {
                  const spent = grantSpent(g.id, expenses);
                  const burn  = burnPct(g, expenses);
                  const today = new Date();
                  const n = g.next_report
                    ? Math.round((+new Date(g.next_report) - +today) / 86_400_000)
                    : null;
                  const dueTone =
                    n === null ? "" :
                    n < 0 ? "text-red-600 font-semibold" :
                    n <= 7 ? "text-red-600 font-semibold" :
                    n <= 14 ? "text-amber-600 font-semibold" : "text-[#1f9d6b]";

                  return (
                    <tr key={g.id} className="border-b border-line last:border-0 hover:bg-[#f7faf6]">
                      <td className="p-3 pl-5 font-semibold">{g.name}</td>
                      <td className="p-3 text-right font-mono">{fmt(g.amount)}</td>
                      <td className="p-3 text-right font-mono">
                        {fmt(spent)}{" "}
                        <span className="text-muted text-xs">({burn}%)</span>
                      </td>
                      <td className="p-3 pr-5">
                        {g.next_report ? (
                          <>
                            <span>{g.next_report}</span>{" "}
                            {n !== null && (
                              <span className={`text-xs ${dueTone}`}>
                                {n < 0 ? "(overdue)" : `(${n}d)`}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-muted text-sm text-center italic">
              No grants linked to this program yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
