import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getProfile,
  getPrograms, getMetrics, getGrants, getApprovedLogs,
  getPendingLogs, getExpenses, getCommitments, getProfiles,
  getAttachmentsForLogs,
} from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregate, grantSpent, agreementHealth, commitmentActual, impactScore } from "@/lib/impact";
import type { Log, Metric } from "@/types/database";
import ProgramPicker from "./ProgramPicker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ── helpers ── */
function pendingCount(metric: Metric, pendingLogs: Log[]): number {
  const ls = pendingLogs.filter((l) => l.program_id === metric.program_id);
  if (metric.kind === "yesno") return ls.filter((l) => l.values[metric.id] === true).length;
  if (metric.kind === "number") return ls.reduce((a, l) => a + (Number(l.values[metric.id]) || 0), 0);
  if (metric.kind === "percent") return ls.filter((l) => l.values[metric.id] !== undefined).length;
  return 0;
}
const fmt$ = (n: number) => "$" + n.toLocaleString();
function daysAgo(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 86400000);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

/* ── Circular progress arc ── */
function Arc({ pct, size = 72 }: { pct: number; size?: number }) {
  const r = (size / 2) * 0.78;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, pct) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={size / 12} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#cef17b"
        strokeWidth={size / 12}
        strokeDasharray={`${dash.toFixed(1)} ${(c - dash).toFixed(1)}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── White KPI stat tile ── */
function StatTile({
  label, value, sub, subTone = "muted", pct, pending, href,
}: {
  label: string; value: string; sub?: string;
  subTone?: "muted" | "green" | "amber" | "red";
  pct?: number | null; pending?: number; href?: string;
}) {
  const barColor =
    subTone === "green" ? "#acd84e" :
    subTone === "amber" ? "#f59e0b" :
    subTone === "red"   ? "#ef4444" : "#d1dcd2";
  const subClass =
    subTone === "green" ? "text-success" :
    subTone === "amber" ? "text-amber-600" :
    subTone === "red"   ? "text-red-600" : "text-muted";

  const inner = (extra = "") => (
    <div className={`card-elevated p-7 h-full flex flex-col ${extra}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-5 leading-none">
        {label}
      </p>
      <p className="font-mono text-5xl font-black leading-none text-ink tracking-tight">
        {value}
      </p>
      {sub && (
        <p className={`text-sm font-medium mt-3 leading-snug ${subClass}`}>{sub}</p>
      )}
      {pending != null && pending > 0 && (
        <p className="text-xs font-semibold text-amber-600 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          +{pending} pending
        </p>
      )}
      {pct != null && (
        <div className="mt-auto pt-6">
          <div className="h-1.5 bg-black/[.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (!href) return inner();
  return (
    <Link href={href} className="block group h-full">
      {inner("group-hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow")}
    </Link>
  );
}

/* ── Green hero tile — Goals achieved ── */
function GoalsTile({ score, metricCount }: { score: number; metricCount: number }) {
  return (
    <div className="bg-green rounded-2xl shadow-[0_2px_16px_rgba(8,71,52,0.25)] p-7 flex flex-col relative overflow-hidden h-full">
      {/* decorative circles */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/[.04] pointer-events-none" />
      <div className="absolute right-4 top-4 w-24 h-24 rounded-full bg-white/[.03] pointer-events-none" />

      <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-5 relative z-10 leading-none">
        Goals achieved
      </p>

      <div className="flex items-center gap-5 flex-1 relative z-10">
        <Arc pct={score} size={72} />
        <div>
          <p className="font-mono text-5xl font-black leading-none text-white tracking-tight">{score}</p>
          <p className="text-white/35 text-sm font-medium mt-2">/ 100</p>
        </div>
      </div>

      <p className="text-xs text-white/25 mt-5 relative z-10">
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
  // Role gate — must run before any data fetch so non-managers never receive
  // manager content, even transiently. Staff and funders have their own homes.
  const profile = await getProfile();
  const role = profile?.role ?? "staff";
  if (role === "staff")  redirect("/log");
  if (role === "funder") redirect("/funder");

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

  // Approved outcome evidence for the active program
  const programCommitmentIds = new Set(
    commitments
      .filter((c) => pGrants.some((g) => g.id === c.grant_id) && c.type === "outcome")
      .map((c) => c.id),
  );
  const evidenceLogs = approvedLogs.filter(
    (l) => l.commitment_id && programCommitmentIds.has(l.commitment_id),
  );
  const evidenceAttachments = await getAttachmentsForLogs(evidenceLogs.map((l) => l.id));

  const adminClient = createAdminClient();
  const dashSignedUrls: Record<string, string> = {};
  await Promise.all(
    evidenceAttachments.map(async (att) => {
      const { data } = await adminClient.storage.from("evidence").createSignedUrl(att.storage_path, 3600);
      if (data?.signedUrl) dashSignedUrls[att.id] = data.signedUrl;
    }),
  );

  /* ── empty state ── */
  if (!active) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="flex items-center justify-center min-h-[70vh] px-8">
          <div className="text-center max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-success-light grid place-items-center mx-auto mb-7">
              <svg className="w-7 h-7 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl text-ink mb-3">No programs yet</h2>
            <p className="text-base text-muted leading-relaxed">
              Create a program to see its live impact dashboard.
            </p>
            <Link href="/programs/new" className="btn btn-cta mt-7">
              Create first program
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasTiles = dashMetrics.length > 0 || budget > 0 || agH;

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Sticky header ── */}
      <div className="page-header">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">{active.name}</p>
          </div>
          <ProgramPicker programs={programs} activeId={active.id} />
        </div>
      </div>

      <div className="page-body space-y-7">

        {/* ── KPI tiles ── */}
        {hasTiles ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {dashMetrics.map((m) => {
              const a    = aggregate(m, approvedLogs);
              const p    = pendingCount(m, pendingLogs);
              const pct  = m.target ? Math.round((a / m.target) * 100) : null;
              const tone =
                pct == null ? "muted" :
                pct >= 100  ? "green" :
                pct >= 65   ? "amber" : "red";
              const val =
                m.kind === "yesno"   ? `${a}` :
                m.kind === "percent" ? `${a}%` :
                a.toLocaleString();
              const sub = m.target
                ? m.kind === "percent"
                  // Percent metrics are averages — "of X" is misleading, show target instead
                  ? `avg · target ${m.target}%`
                  : `${a.toLocaleString()} of ${m.kind === "yesno" ? m.target : m.target.toLocaleString()} · ${Math.min(999, pct ?? 0)}%`
                : m.kind === "percent" ? "avg" : undefined;
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
                sub={`${fmt$(spent)} of ${fmt$(budget)} · ${burnPct}%`}
                subTone={burnPct > 80 ? "red" : burnPct > 65 ? "amber" : "green"}
                pct={burnPct}
              />
            )}

            {agGrant && agH && (
              <StatTile
                label="Agreement health"
                value={`${agH.overall}%`}
                sub={`${agH.met} of ${agH.total} commitment${agH.total !== 1 ? "s" : ""} met`}
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
          <div className="card-elevated px-8 py-14 text-center">
            <p className="text-muted text-sm">No metrics on the dashboard yet.</p>
            <Link href={`/programs/${active.id}/edit`}
              className="text-green text-sm underline mt-2 inline-block">
              Add metrics to this program →
            </Link>
          </div>
        )}

        {/* ── Commitments + Review queue ── */}
        <div className={`grid gap-5 ${grantsWithCommitments.length > 0 ? "lg:grid-cols-[1fr_360px]" : ""}`}>

          {/* Agreement commitments */}
          {grantsWithCommitments.length > 0 && (
            <div className="space-y-5">
              {grantsWithCommitments.map(({ grant, cs }) => {
                const h = agreementHealth(cs, { metrics: pMetrics, logs: approvedLogs, grant, expenses });
                const healthColor =
                  h.overall >= 80 ? "text-success" :
                  h.overall >= 55 ? "text-amber-600" : "text-red-600";

                return (
                  <div key={grant.id} className="card-elevated overflow-hidden">
                    {/* Card header */}
                    <div className="px-8 pt-7 pb-6 flex items-center justify-between gap-4 flex-wrap border-b border-[#f2f5f2]">
                      <div>
                        <h2 className="font-display text-lg text-ink leading-none">
                          Agreement commitments
                        </h2>
                        <p className="text-muted text-xs mt-1.5">{grant.name}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`font-mono text-sm font-bold ${healthColor}`}>
                          {h.overall}% · {h.met}/{h.total} met
                        </span>
                        <Link href={`/agreement?grant=${grant.id}`}
                          className="btn btn-secondary btn-sm whitespace-nowrap">
                          Manage →
                        </Link>
                      </div>
                    </div>

                    {/* Commitment rows */}
                    <div className="divide-y divide-[#f5f7f5]">
                      {cs.map((c) => {
                        const r = commitmentActual(c, { metrics: pMetrics, logs: approvedLogs, grant, expenses });
                        if (r.unlinked) {
                          const hint =
                            c.type === "milestone"
                              ? "No milestones added — go to Agreement Engine"
                              : "Not linked — add a metric to track progress";
                          return (
                            <div key={c.id} className="flex items-center gap-6 px-8 py-5">
                              <div className="w-[3px] h-10 rounded-full flex-shrink-0 bg-line" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-ink truncate mb-3">{c.label}</p>
                                <div className="h-1.5 bg-black/[.04] rounded-full" />
                              </div>
                              <p className="text-xs text-muted text-right flex-shrink-0 min-w-[100px] leading-relaxed">
                                {hint}
                              </p>
                            </div>
                          );
                        }
                        const col =
                          r.met       ? { bar: "#acd84e", txt: "text-success",   lbl: "Met"      } :
                          r.pct >= 65 ? { bar: "#f59e0b", txt: "text-amber-600", lbl: "On track" } :
                                        { bar: "#ef4444", txt: "text-red-600",   lbl: "Behind"   };
                        const [actual, target] = r.display.split(" / ");
                        return (
                          <div key={c.id} className="flex items-center gap-6 px-8 py-5">
                            <div className="w-[3px] h-10 rounded-full flex-shrink-0"
                              style={{ background: col.bar }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ink truncate mb-3">{c.label}</p>
                              <div className="h-1.5 bg-black/[.04] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(100, r.pct)}%`, background: col.bar }} />
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 min-w-[88px]">
                              <p className="font-mono font-black text-base leading-none text-ink">
                                {actual}
                                {target && <span className="text-xs font-normal text-muted"> /{target}</span>}
                              </p>
                              <p className={`text-[11px] font-semibold mt-1.5 ${col.txt}`}>
                                {Math.min(999, r.pct)}% · {col.lbl}
                              </p>
                              {r.sub && (
                                <p className="text-[10px] text-muted leading-none mt-0.5">{r.sub}</p>
                              )}
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

          {/* ── Review queue ── */}
          <div className="card-elevated flex flex-col overflow-hidden">
            <div className="px-7 py-6 border-b border-[#f2f5f2] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-display text-lg text-ink leading-none">Review queue</h2>
                {queueLogs.length > 0 && (
                  <p className="text-muted text-xs mt-1.5">{queueLogs.length} awaiting review</p>
                )}
              </div>
              <Link href="/approvals" className="btn btn-secondary btn-sm whitespace-nowrap">
                Open queue →
              </Link>
            </div>

            {queueLogs.length > 0 ? (
              <div className="divide-y divide-[#f5f7f5] flex-1">
                {queueLogs.map((l) => {
                  const staff    = profiles.find((pr) => pr.id === l.staff_id);
                  const initials = (staff?.full_name ?? "S")
                    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
                  const age   = daysAgo(l.log_date);
                  const isOld = age !== "Today" && age !== "Yesterday";
                  return (
                    <div key={l.id}
                      className="flex items-start gap-3.5 px-6 py-4 hover:bg-surface/60 transition-colors group">
                      <div className="w-9 h-9 rounded-xl bg-green text-lime grid place-items-center flex-shrink-0 text-[11px] font-black mt-0.5 leading-none">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-ink">
                            {staff?.full_name ?? "Staff member"}
                          </span>
                          <span className={`text-xs font-medium ${isOld ? "text-amber-600" : "text-muted"}`}>
                            {age}
                          </span>
                        </div>
                        {l.narrative && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-1 leading-relaxed">
                            {l.narrative}
                          </p>
                        )}
                      </div>
                      <Link href="/approvals"
                        className="badge-amber hover:bg-amber-100 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
                <div className="w-12 h-12 rounded-2xl bg-success-light grid place-items-center">
                  <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-ink">All caught up</p>
                  <p className="text-xs text-muted mt-1">No submissions awaiting review.</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Approved outcome evidence ── */}
        {evidenceLogs.length > 0 && (
          <div className="card-elevated overflow-hidden">
            <div className="px-8 pt-7 pb-6 border-b border-[#f2f5f2] flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg text-ink leading-none">Outcome Evidence</h2>
                <p className="text-muted text-xs mt-1.5">
                  Approved evidence submitted by staff for this program&apos;s grant outcomes.
                </p>
              </div>
              <Link href="/agreement" className="btn btn-secondary btn-sm whitespace-nowrap">
                View commitments →
              </Link>
            </div>

            <div className="divide-y divide-[#f5f7f5]">
              {evidenceLogs.map((log) => {
                const commitment = commitments.find((c) => c.id === log.commitment_id);
                const att        = evidenceAttachments.find((a) => a.log_id === log.id);
                const fileUrl    = att ? (dashSignedUrls[att.id] ?? null) : null;
                const staffName  = profiles.find((p) => p.id === log.staff_id)?.full_name ?? "Staff";

                return (
                  <div key={log.id} className="flex items-start gap-4 px-8 py-5">
                    <div className="w-[3px] h-10 rounded-full bg-amber-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {commitment && (
                        <p className="text-xs font-semibold text-amber-700 mb-1 truncate">
                          {commitment.label}
                        </p>
                      )}
                      {log.narrative && (
                        <p className="text-sm text-ink leading-relaxed line-clamp-2">{log.narrative}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted">{staffName} · {log.log_date}</span>
                        {fileUrl && att && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
                          >
                            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            {att.file_name}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
