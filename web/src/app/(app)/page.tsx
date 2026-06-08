import Link from "next/link";
import {
  getPrograms, getMetrics, getGrants, getApprovedLogs,
  getPendingLogs, getExpenses, getCommitments, getProfiles,
} from "@/lib/data";
import { aggregate, grantSpent, agreementHealth, commitmentActual } from "@/lib/impact";
import type { Log, Metric } from "@/types/database";
import ProgramPicker from "./ProgramPicker";

export const dynamic = "force-dynamic";

/* ── helpers ─────────────────────────────────────────────────── */

/** Sum of pending log values for a given metric (mirrors demo's pend()). */
function pendingCount(metric: Metric, pendingLogs: Log[]): number {
  const ls = pendingLogs.filter((l) => l.program_id === metric.program_id);
  if (metric.kind === "yesno")
    return ls.filter((l) => l.values[metric.id] === true).length;
  if (metric.kind === "number")
    return ls.reduce((a, l) => a + (Number(l.values[metric.id]) || 0), 0);
  return 0;
}

const fmt$ = (n: number) => "$" + n.toLocaleString();

/* ── component ───────────────────────────────────────────────── */

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

  /* Active program — default to first */
  const active = programs.find((p) => p.id === searchParams.p) ?? programs[0] ?? null;
  const pMetrics = active ? metrics.filter((m) => m.program_id === active.id) : [];
  const pGrants  = active ? grants.filter((g) => g.program_id === active.id) : [];
  const dashMetrics = pMetrics.filter((m) => m.on_dashboard);
  const goalMs = pMetrics.filter((m) => m.kind !== "text" && (m.target ?? 0) > 0);

  /* Metric values */
  const spent     = pGrants.reduce((a, g) => a + grantSpent(g.id, expenses), 0);
  const budget    = pGrants.reduce((a, g) => a + g.amount, 0);
  const burnPct   = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  /* Agreement commitments — all grants in the active program, grouped */
  const grantsWithCommitments = pGrants
    .map((g) => ({ grant: g, cs: commitments.filter((c) => c.grant_id === g.id) }))
    .filter((x) => x.cs.length > 0);
  const agGrant        = grantsWithCommitments[0]?.grant ?? null;
  const agCommitments  = grantsWithCommitments[0]?.cs ?? [];
  const agH = agGrant
    ? agreementHealth(agCommitments, { metrics: pMetrics, logs: approvedLogs, grant: agGrant, expenses })
    : null;

  /* Donut chart — goal status breakdown */
  const DONUT_CIRC   = 2 * Math.PI * 54;
  const donutTotal   = Math.max(1, goalMs.length);
  const donutMet     = goalMs.filter((m) => aggregate(m, approvedLogs) >= (m.target as number)).length;
  const donutOnTrack = goalMs.filter((m) => { const r = aggregate(m, approvedLogs) / (m.target as number); return r >= 0.65 && r < 1; }).length;
  const donutBehind  = goalMs.length - donutMet - donutOnTrack;
  const donutSegments = [
    { count: donutMet,      color: "#acd84e", label: "Met",      text: "#1f9d6b" },
    { count: donutOnTrack,  color: "#f59e0b", label: "On track", text: "#d97706" },
    { count: donutBehind,   color: "#ef4444", label: "Behind",   text: "#dc2626" },
  ].map((s, i, arr) => ({
    ...s,
    arc: (s.count / donutTotal) * DONUT_CIRC,
    off: -(arr.slice(0, i).reduce((a, x) => a + x.count, 0) / donutTotal) * DONUT_CIRC,
  }));

  /* Needs review — pending logs for the active program */
  const queueLogs = active
    ? pendingLogs.filter((l) => l.program_id === active.id).slice(0, 5)
    : [];

  /* Empty state — no programs */
  if (!active) {
    return (
      <div>
        <div className="px-8 py-5 border-b border-line bg-white/60">
          <h1 className="font-display text-2xl">Dashboard</h1>
          <p className="text-muted text-sm">Verified, real-time impact for the selected program.</p>
        </div>
        <div className="p-8">
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted">
            <p className="font-display text-lg">No programs yet</p>
            <p className="text-sm mt-1">
              <Link href="/programs/new" className="text-green underline">Create a program</Link>{" "}
              to see its live impact dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Sticky header ── */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Dashboard</h1>
          <p className="text-muted text-sm">Verified, real-time impact for the selected program.</p>
        </div>
        <ProgramPicker programs={programs} activeId={active.id} />
      </div>

      <div className="p-8">

        {/* ── KPI tile grid ── */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 mb-6">

          {/* Per-metric tiles */}
          {dashMetrics.map((m) => {
            const a    = aggregate(m, approvedLogs);
            const p    = pendingCount(m, pendingLogs);
            const pct  = m.target ? Math.min(100, Math.round((a / m.target) * 100)) : null;
            return (
              <div key={m.id} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
                <div className="text-muted text-sm font-semibold">{m.label}</div>
                <div className="font-mono text-3xl font-semibold mt-2 leading-none">
                  {a}
                  {m.target && (
                    <span className="text-base font-normal text-muted"> / {m.target}</span>
                  )}
                </div>
                {pct !== null && (
                  <div className="text-sm font-semibold mt-1 text-green">{pct}% of goal</div>
                )}
                {pct !== null && (
                  <div className="h-2 bg-[#eef2ee] rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg,#084734,#0a5a42)",
                      }}
                    />
                  </div>
                )}
                {p > 0 && (
                  <div className="inline-flex items-center gap-1 mt-2.5 text-xs font-semibold px-2 py-1 rounded-md bg-amber-50 text-amber-700">
                    +{p} awaiting approval
                  </div>
                )}
              </div>
            );
          })}

          {/* Budget used tile */}
          {budget > 0 && (
            <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
              <div className="text-muted text-sm font-semibold">Budget used</div>
              <div className="font-mono text-3xl font-semibold mt-2 leading-none">{fmt$(spent)}</div>
              <div className={`text-sm font-semibold mt-1 ${burnPct > 80 ? "text-red-600" : burnPct > 65 ? "text-amber-600" : "text-muted"}`}>
                {burnPct}% of {fmt$(budget)}
              </div>
            </div>
          )}

          {/* Agreement health tile — clickable → agreement engine */}
          {agGrant && agH && (
            <Link
              href={`/agreement?grant=${agGrant.id}`}
              className="bg-white border border-line rounded-2xl p-5 shadow-sm hover:border-green transition-colors block"
            >
              <div className="text-muted text-sm font-semibold">Agreement health</div>
              <div className="font-mono text-3xl font-semibold mt-2 leading-none">
                {agH.overall}
                <span className="text-base font-normal text-muted">%</span>
              </div>
              <div className="text-sm font-semibold mt-1 text-green">
                {agH.met}/{agH.total} commitments met →
              </div>
              <div className="h-2 bg-[#eef2ee] rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${agH.overall}%`,
                    background: "linear-gradient(90deg,#084734,#0a5a42)",
                  }}
                />
              </div>
            </Link>
          )}
        </div>

        {/* ── 2-column: bar chart + needs review ── */}
        <div className="grid lg:grid-cols-2 gap-5">

          {/* Goal completion donut chart */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Goal completion</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e3f0e9] text-green">
                Approved data
              </span>
            </div>

            {goalMs.length > 0 ? (
              <div className="flex items-center gap-6">
                {/* SVG donut */}
                <div className="flex-shrink-0">
                  <svg width="130" height="130" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="54" fill="none" stroke="#eef2ee" strokeWidth="16" />
                    {donutSegments.map((s) =>
                      s.count > 0 ? (
                        <circle
                          key={s.label}
                          cx="64" cy="64" r="54"
                          fill="none"
                          stroke={s.color}
                          strokeWidth="16"
                          strokeDasharray={`${s.arc} ${DONUT_CIRC}`}
                          strokeDashoffset={s.off}
                          transform="rotate(-90 64 64)"
                          strokeLinecap="butt"
                        />
                      ) : null
                    )}
                    <text x="64" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a2e21" fontFamily="monospace">
                      {goalMs.length}
                    </text>
                    <text x="64" y="74" textAnchor="middle" fontSize="10" fill="#5c6b63" fontWeight="600" fontFamily="system-ui,sans-serif">
                      {goalMs.length === 1 ? "goal" : "goals"}
                    </text>
                  </svg>
                </div>
                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {donutSegments.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-sm font-semibold">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-[#eef2ee] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(s.count / donutTotal) * 100}%`, background: s.color }}
                          />
                        </div>
                        <span className="font-mono text-sm font-semibold w-4 text-right" style={{ color: s.text }}>
                          {s.count}
                        </span>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted pt-1 leading-relaxed">
                    {active.name} · based on approved staff data
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted">
                <p className="text-sm">No goal metrics defined for this program.</p>
              </div>
            )}
          </div>

          {/* Needs review queue */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Needs review</h3>
              <Link
                href="/approvals"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line hover:bg-paper transition-colors"
              >
                Open queue
              </Link>
            </div>

            {queueLogs.length > 0 ? (
              <div className="divide-y divide-line">
                {queueLogs.map((l) => {
                  const staff = profiles.find((pr) => pr.id === l.staff_id);
                  return (
                    <div key={l.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="w-8 h-8 rounded-lg bg-[#e3f0e9] text-green grid place-items-center flex-shrink-0 text-xs font-bold mt-0.5">
                        {(staff?.full_name ?? "S").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">
                          {staff?.full_name ?? "Staff member"}
                          <span className="mx-1.5 text-muted font-normal">·</span>
                          <span className="text-muted font-normal">{l.log_date}</span>
                        </div>
                        {l.narrative && (
                          <p className="text-muted text-xs mt-0.5 truncate">{l.narrative}</p>
                        )}
                      </div>
                      <Link
                        href="/approvals"
                        className="ml-auto text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors flex-shrink-0"
                      >
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[150px] flex flex-col items-center justify-center text-muted gap-2">
                <svg className="w-8 h-8 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p className="text-sm">All caught up — nothing awaiting review.</p>
              </div>
            )}
          </div>

        </div>

        {/* ── 3. Commitment progress (agreement engine output) ── */}
        {grantsWithCommitments.length > 0 && (
          <div className="mt-5 space-y-4">
            {grantsWithCommitments.map(({ grant, cs }) => {
              const h = agreementHealth(cs, { metrics: pMetrics, logs: approvedLogs, grant, expenses });
              return (
                <div key={grant.id} className="bg-white border border-line rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="font-display text-lg">Agreement commitments</h3>
                      <p className="text-muted text-xs mt-0.5">
                        {grant.name} · {h.met}/{h.total} met · {h.overall}% overall
                      </p>
                    </div>
                    <Link
                      href={`/agreement?grant=${grant.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-[#e3f0e9] hover:text-green transition-colors"
                    >
                      Open Agreement Engine →
                    </Link>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                    {cs.map((c) => {
                      const r    = commitmentActual(c, { metrics: pMetrics, logs: approvedLogs, grant, expenses });
                      const tone = r.met ? "text-[#1f9d6b]" : r.pct >= 65 ? "text-amber-600" : "text-red-600";
                      const barBg = r.met
                        ? "linear-gradient(90deg,#acd84e,#cef17b)"
                        : "linear-gradient(90deg,#084734,#0a5a42)";
                      const [actual, target] = r.display.split(" / ");
                      return (
                        <div key={c.id} className="bg-[#f7faf6] border border-line rounded-xl p-4">
                          <div className="text-xs font-bold uppercase tracking-wide text-muted leading-tight">{c.label}</div>
                          <div className="font-mono text-xl font-semibold mt-1.5 leading-none">
                            {actual}
                            {target && <span className="text-sm font-normal text-muted"> / {target}</span>}
                          </div>
                          <div className={`text-xs font-semibold mt-1 ${tone}`}>
                            {Math.min(999, r.pct)}% · {r.met ? "met" : r.pct >= 65 ? "on track" : "behind"}
                          </div>
                          <div className="h-1.5 bg-[#e5ebe5] rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, r.pct)}%`, background: barBg }}
                            />
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

      </div>
    </div>
  );
}
