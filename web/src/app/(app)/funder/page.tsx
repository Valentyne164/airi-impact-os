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

  const myGrants = profile.funder_id
    ? grants.filter((g) => g.funder_id === profile.funder_id)
    : grants;

  const myProgramIds = new Set(
    myGrants.map((g) => g.program_id).filter(Boolean) as string[],
  );
  const myPrograms = programs.filter((p) => myProgramIds.has(p.id));

  if (myPrograms.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="card-elevated p-10 text-center max-w-md">
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
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-ink leading-none">Impact Overview</h1>
            <p className="page-subtitle">Manager-approved outcomes only — private staff logs are never shown here.</p>
          </div>
          {myPrograms.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {myPrograms.map((p) => (
                <Link key={p.id} href={`/funder?p=${p.id}`}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    p.id === active.id
                      ? "bg-green text-white border-green"
                      : "bg-paper border-line text-muted hover:text-ink"
                  }`}>
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="flex items-center gap-3 bg-success-light border border-line text-success rounded-xl px-4 py-3 text-sm font-medium mb-8">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>
            You are viewing <b className="text-ink">{active.name}</b> as{" "}
            <b className="text-ink">{funderOrg}</b>. Read-only — manager-approved outcomes only.
          </span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 mb-8">
          {dashMetrics.map((m) => {
            const a   = aggregate(m, logs);
            const pct = Math.min(100, Math.round((a / (m.target as number)) * 100));
            return (
              <div key={m.id} className="card-elevated p-6">
                <div className="kpi-label mb-3">{m.label}</div>
                <div className="font-mono text-[2rem] font-black leading-none text-ink">
                  {a}{" "}
                  <span className="text-base font-normal text-muted">/ {m.target}</span>
                </div>
                <div className="text-xs font-semibold mt-1 text-success">{pct}% of goal</div>
                <div className="h-1.5 bg-surface rounded-full mt-3 overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg,#acd84e,#cef17b)" }} />
                </div>
              </div>
            );
          })}

          <div className="bg-green text-white rounded-2xl p-6 shadow-[0_2px_16px_rgba(8,71,52,0.20)]">
            <div className="kpi-label text-white/60 mb-3">Impact score</div>
            <div className="font-mono text-[2rem] font-black leading-none">
              {score}{" "}
              <span className="text-white/50 font-normal text-base">/ 100</span>
            </div>
            <div className="text-xs font-semibold mt-1 text-white/60">composite of goals</div>
            <div className="h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-lime rounded-full" style={{ width: `${score}%` }} />
            </div>
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          <div className="px-7 py-5 border-b border-[#f2f5f2] flex items-center justify-between">
            <h3 className="font-display text-lg text-ink">Your funding in this program</h3>
            {myGrantsHere.length > 0 && (
              <Link href="/funder/reports" className="btn btn-ghost btn-sm">
                View reports
              </Link>
            )}
          </div>

          {myGrantsHere.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f2f5f2]">
                  <th className="text-left px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted">Grant</th>
                  <th className="text-right px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted">Committed</th>
                  <th className="text-right px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted">Deployed</th>
                  <th className="text-left px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted">Next report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f7f5]">
                {myGrantsHere.map((g) => {
                  const spent = grantSpent(g.id, expenses);
                  const burn  = burnPct(g, expenses);
                  const today = new Date();
                  const n = g.next_report
                    ? Math.round((+new Date(g.next_report) - +today) / 86_400_000)
                    : null;
                  const dueTone =
                    n === null ? "" :
                    n < 0  ? "text-red-600 font-semibold" :
                    n <= 7 ? "text-red-600 font-semibold" :
                    n <= 14 ? "text-amber-600 font-semibold" : "text-success";

                  return (
                    <tr key={g.id} className="hover:bg-surface transition-colors">
                      <td className="px-7 py-4 font-semibold">{g.name}</td>
                      <td className="px-7 py-4 text-right font-mono">{fmt(g.amount)}</td>
                      <td className="px-7 py-4 text-right font-mono">
                        {fmt(spent)}{" "}
                        <span className="text-muted text-xs">({burn}%)</span>
                      </td>
                      <td className="px-7 py-4">
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
            <p className="px-7 py-8 text-muted text-sm text-center italic">
              No grants linked to this program yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
