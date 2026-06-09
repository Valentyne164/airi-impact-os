import Link from "next/link";
import {
  getPrograms, getMetrics, getGrants, getApprovedLogs,
  getPendingLogs, getExpenses, getCommitments, getProfiles,
} from "@/lib/data";
import { aggregate, grantSpent, agreementHealth, commitmentActual, impactScore } from "@/lib/impact";
import type { Log, Metric } from "@/types/database";
import ProgramPicker from "./ProgramPicker";

export const dynamic = "force-dynamic";

/* ── helpers ── */
function pendingCount(metric: Metric, pendingLogs: Log[]): number {
  const ls = pendingLogs.filter((l) => l.program_id === metric.program_id);
  if (metric.kind === "yesno") return ls.filter((l) => l.values[metric.id] === true).length;
  if (metric.kind === "number") return ls.reduce((a, l) => a + (Number(l.values[metric.id]) || 0), 0);
  return 0;
}
const fmt$ = (n: number) => "$" + n.toLocaleString();
function daysAgo(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 86400000);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

/* ── Circular progress arc (for Goals tile) ── */
function Arc({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size / 2) * 0.78;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, pct) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={size / 13} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#cef17b"
        strokeWidth={size / 13}
        strokeDasharray={`${dash.toFixed(1)} ${(c - dash).toFixed(1)}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── KPI stat tile (white card, colored top border) ── */
function StatTile({
  label, value, sub, subTone = "muted", pct, pending, href,
}: {
  label: string; value: string; sub?: string;
  subTone?: "muted" | "green" | "amber" | "red";
  pct?: number | null; pending?: number; href?: string;
}) {
  const accent =
    subTone === "green" ? "#acd84e" :
    subTone === "amber" ? "#f59e0b" :
    subTone === "red"   ? "#ef4444" : "#dce9dc";
  const subClass =
    subTone === "green" ? "text-[#1a7a4a]" :
    subTone === "amber" ? "text-amber-600" :
    subTone === "red"   ? "text-red-600"   : "text-muted";

  const content = (extra = "") => (
    <div
      className={`bg-white rounded-2xl shadow-sm p-6 h-full flex flex-col ${extra}`}
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted/70 mb-4 leading-none">
        {label}
      </p>
      <p className="font-mono text-[2.6rem] font-black leading-none text-ink">{value}</p>
      {sub && <p className={`text-sm font-semibold mt-2 ${subClass}`}>{sub}</p>}
      {pct != null && (
        <div className="mt-auto pt-4">
          <div className="h-[3px] bg-black/[.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, pct)}%`, background: accent }}
            />
          </div>
        </div>
      )}
      {pending != null && pending > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          +{pending} pending
        </div>
      )}
    </div>
  );

  if (!href) return content();
  return (
    <Link href={href} className="block group">
      {content("group-hover:shadow-md transition-shadow")}
    </Link>
  );
}

/* ── Goals achieved — dark green tile with SVG arc ── */
function GoalsTile({ score, metricCount }: { score: number; metricCount: number }) {
  return (
    <div className="bg-[#084734] rounded-2xl shadow-sm p-6 flex flex-col relative overflow-hidden">
      <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/[.04] pointer-events-none" />
      <div className="absolute right-3 top-3 w-20 h-20 rounded-full bg-white/[.03] pointer-events-none" />
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-5 relative z-10">
        Goals achieved
      </p>
      <div className="flex items-center gap-4 flex-1 relative z-10">
        <Arc pct={score} size={64} />
        <div>
          <p className="font-mono text-[2.6rem] font-black leading-none text-white">{score}</p>
          <p className="text-white/40 text-sm mt-1.5">/ 100</p>
        </div>
      </div>
      <p className="text-[11px] text-white/30 mt-5 relative z-10">
        {metricCount > 0
          ? `Avg across ${metricCount} target${metricCount !== 1 ? "s" : ""}`
          : "No targets set yet"}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { p?: string };
}) {
  const [programs, metrics, grants, approvedLogs, pendingLogs, expenses, commitments, profiles] =
    await Promise.all([
      getPrograms(), getMetrics(), getGrants(), getApprovedLogs(),
      getPendingLogs(), getExpenses(), getCommitments(), getProfiles(),
    ]);

  const active      = programs.find((p) => p.id === searchParams.p) ?? programs[0] ?? null;
  const pMetrics    = active ? metrics.filter((m) => m.program_id === active.id) : [];
  const pGrants     = active ? grants.filter((g) => g.program_id === active.id) : [];
  const dashMetrics = pMetrics.filter((m) => m.on_dashboard);

  const budget  = pGrants.reduce((a, g) => a + g.amount, 0);
  const spent   = pGrants.reduce((a, g) => a + grantSpent(g.id, expenses), 0);
  const burnPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  const grantsWithCommitments = pGrants
    .map((g) => ({ grant: g, cs: commitments.filter((c) => c.grant_id === g.id) }))
    .filter((x) => x.cs.length > 0);
  const agGrant       = grantsWithCommitments[0]?.grant ?? null;
  const agCommitments = grantsWithCommitments[0]?.cs ?? [];
  const agH = agGrant
    ? agreementHealth(agCommitments, { metrics: pMetrics, logs: approvedLogs, grant: agGrant, expenses })
    : null;

  const score     = impactScore(dashMetrics, approvedLogs);
  const queueLogs = active
    ? pendingLogs.filter((l) => l.program_id === active.id).slice(0, 6)
    : [];

  /* ── empty state ── */
  if (!active) {
    return (
      <div className="min-h-screen bg-[#f4f9f5]">
        <div className="px-8 py-6 bg-white border-b border-[#e6ede6] sticky top-0 z-10">
          <h1 className="font-display text-2xl">Dashboard</h1>
        </div>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-2xl shadow-sm p-14 text-center max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#e3f0e9] grid place-items-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <p className="font-display text-lg">No programs yet</p>
            <p className="text-sm mt-1 text-muted">
              <Link href="/programs/new" className="text-green underline">Create a program</Link>{" "}
              to see its live impact dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasTiles = dashMetrics.length > 0 || budget > 0 || agH;

  return (
    <div className="min-h-screen bg-[#f4f9f5]">

      {/* ── Sticky header ── */}
      <div className="px-8 py-5 bg-white border-b border-[#e6ede6] sticky top-0 backdrop-blur z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl leading-none">Dashboard</h1>
            <p className="text-muted text-sm mt-1 leading-none">{active.name}</p>
          </div>
          <ProgramPicker programs={programs} activeId={active.id} />
        </div>
      </div>

      <div className="p-8 space-y-6">

        {/* ── KPI tiles ── */}
        {hasTiles ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashMetrics.map((m) => {
              const a    = aggregate(m, approvedLogs);
              const p    = pendingCount(m, pendingLogs);
              const pct  = m.target ? Math.round((a / m.target) * 100) : null;
              const tone =
                pct == null ? "muted" :
                pct >= 100  ? "green" :
                pct >= 65   ? "amber" : "red";
              const val = m.kind === "yesno" ? `${a}` : a.toLocaleString();
              const sub = m.target
                ? `${Math.min(999, pct ?? 0)}% of ${m.kind === "yesno" ? m.target : m.target.toLocaleString()}`
                : undefined;
              return (
                <StatTile
                  key={m.id}
                  label={m.label}
                  value={val}
                  sub={sub}
                  subTone={tone as "muted" | "green" | "amber" | "red"}
                  pct={pct}
                  pending={p}
                />
              );
            })}

            {budget > 0 && (
              <StatTile
                label="Budget used"
                value={fmt$(spent)}
                sub={`${burnPct}% of ${fmt$(budget)}`}
                subTone={burnPct > 80 ? "red" : burnPct > 65 ? "amber" : "green"}
                pct={burnPct}
              />
            )}

            {agGrant && agH && (
              <StatTile
                label="Agreement health"
                value={`${agH.overall}%`}
                sub={`${agH.met} of ${agH.total} met`}
                subTone={agH.overall >= 80 ? "green" : agH.overall >= 55 ? "amber" : "red"}
                pct={agH.overall}
                href={`/agreement?grant=${agGrant.id}`}
              />
            )}

            {dashMetrics.length > 0 && (
              <GoalsTile
                score={score}
                metricCount={dashMetrics.filter((m) => m.target).length}
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm px-8 py-12 text-center">
            <p className="text-muted text-sm">No metrics on the dashboard yet.</p>
            <Link href={`/programs/${active.id}/edit`}
              className="text-green text-sm underline mt-1 inline-block">
              Add metrics to this program →
            </Link>
          </div>
        )}

        {/* ── Commitments + Needs review ── */}
        <div className={`grid gap-5 ${grantsWithCommitments.length > 0 ? "lg:grid-cols-[1fr_360px]" : ""}`}>

          {/* Agreement commitments */}
          {grantsWithCommitments.length > 0 && (
            <div className="space-y-5">
              {grantsWithCommitments.map(({ grant, cs }) => {
                const h = agreementHealth(cs, { metrics: pMetrics, logs: approvedLogs, grant, expenses });
                const healthStyle =
                  h.overall >= 80 ? "bg-[#e3f0e9] text-[#1a7a4a]" :
                  h.overall >= 55 ? "bg-amber-50 text-amber-700"   : "bg-red-50 text-red-700";

                return (
                  <div key={grant.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-4 flex-wrap border-b border-[#f0f4f0]">
                      <div>
                        <h2 className="font-display text-lg leading-none">Agreement commitments</h2>
                        <p className="text-muted text-xs mt-1">{grant.name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${healthStyle}`}>
                          {h.overall}% · {h.met}/{h.total} met
                        </span>
                        <Link href={`/agreement?grant=${grant.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#e0e8e0] hover:bg-[#e3f0e9] hover:text-green transition-colors whitespace-nowrap">
                          Edit →
                        </Link>
                      </div>
                    </div>

                    <div className="divide-y divide-[#f5f8f5]">
                      {cs.map((c) => {
                        const r = commitmentActual(c, { metrics: pMetrics, logs: approvedLogs, grant, expenses });
                        if (r.unlinked) {
                          return (
                            <div key={c.id} className="flex items-center gap-5 px-6 py-4">
                              <div className="w-[3px] h-10 rounded-full flex-shrink-0 bg-[#d5ddd5]" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-ink truncate mb-2.5">{c.label}</p>
                                <div className="h-2 bg-black/[.05] rounded-full overflow-hidden">
                                  <div className="h-full w-0 rounded-full" />
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 min-w-[80px]">
                                <p className="text-xs text-muted leading-tight">
                                  Not linked — link a metric to track progress
                                </p>
                              </div>
                            </div>
                          );
                        }
                        const col =
                          r.met       ? { bar: "#acd84e", txt: "text-[#1a7a4a]", lbl: "Met"      } :
                          r.pct >= 65 ? { bar: "#f59e0b", txt: "text-amber-600", lbl: "On track" } :
                                        { bar: "#ef4444", txt: "text-red-600",   lbl: "Behind"   };
                        const [actual, target] = r.display.split(" / ");
                        return (
                          <div key={c.id} className="flex items-center gap-5 px-6 py-4">
                            <div className="w-[3px] h-10 rounded-full flex-shrink-0"
                              style={{ background: col.bar }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ink truncate mb-2.5">{c.label}</p>
                              <div className="h-2 bg-black/[.05] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(100, r.pct)}%`, background: col.bar }} />
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 min-w-[80px]">
                              <p className="font-mono font-black text-base leading-none text-ink">
                                {actual}
                                {target && <span className="text-xs font-normal text-muted"> /{target}</span>}
                              </p>
                              <p className={`text-[11px] font-bold mt-1.5 ${col.txt}`}>
                                {Math.min(999, r.pct)}% · {col.lbl}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Needs review queue ── */}
          <div className="bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-[#f0f4f0] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-display text-lg leading-none">Review queue</h2>
                {queueLogs.length > 0 && (
                  <p className="text-muted text-xs mt-1">{queueLogs.length} awaiting review</p>
                )}
              </div>
              <Link href="/approvals"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#e0e8e0] hover:bg-[#e3f0e9] hover:text-green transition-colors whitespace-nowrap">
                Open queue →
              </Link>
            </div>

            {queueLogs.length > 0 ? (
              <div className="divide-y divide-[#f5f8f5] flex-1">
                {queueLogs.map((l) => {
                  const staff    = profiles.find((pr) => pr.id === l.staff_id);
                  const initials = (staff?.full_name ?? "S")
                    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
                  const age   = daysAgo(l.log_date);
                  const isOld = age !== "Today" && age !== "Yesterday";
                  return (
                    <div key={l.id}
                      className="flex items-start gap-3 px-5 py-4 hover:bg-[#f7fbf7] transition-colors group">
                      <div className="w-9 h-9 rounded-xl bg-[#084734] text-[#cef17b] grid place-items-center flex-shrink-0 text-[11px] font-black mt-0.5">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-ink">
                            {staff?.full_name ?? "Staff member"}
                          </span>
                          <span className={`text-xs font-semibold ${isOld ? "text-amber-600" : "text-muted"}`}>
                            {age}
                          </span>
                        </div>
                        {l.narrative && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-1">{l.narrative}</p>
                        )}
                      </div>
                      <Link href="/approvals"
                        className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted">
                <div className="w-12 h-12 rounded-2xl bg-[#e3f0e9] grid place-items-center">
                  <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-ink">All caught up</p>
                  <p className="text-xs mt-0.5">No submissions awaiting review.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
