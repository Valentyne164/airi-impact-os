import Link from "next/link";
import { getPrograms, getMetrics, getGrants, getApprovedLogs } from "@/lib/data";
import { aggregate } from "@/lib/impact";
import { deleteProgram } from "./[id]/edit/actions";
import DeleteButton from "../DeleteButton";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, { bar: string; text: string }> = {
  met:      { bar: "linear-gradient(90deg,#acd84e,#cef17b)",      text: "text-[#1a7a4a]" },
  ontrack:  { bar: "linear-gradient(90deg,#084734,#0a6045)",      text: "text-muted"     },
  notarget: { bar: "linear-gradient(90deg,#cde2d5,#cde2d5)",      text: "text-muted"     },
};

function pctColors(pct: number | null) {
  if (pct === null) return STATUS_COLORS.notarget;
  if (pct >= 100)   return STATUS_COLORS.met;
  return STATUS_COLORS.ontrack;
}

function fmtVal(v: number, kind: string) {
  if (kind === "yesno")   return `${v} day${v !== 1 ? "s" : ""}`;
  if (kind === "percent") return `${v}%`;
  return v.toLocaleString();
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: { p?: string };
}) {
  const [programs, metrics, grants, logs] = await Promise.all([
    getPrograms(), getMetrics(), getGrants(), getApprovedLogs(),
  ]);

  const active   = programs.find((prog) => prog.id === searchParams.p) ?? programs[0] ?? null;
  const pMetrics = active ? metrics.filter((m) => m.program_id === active.id) : [];
  const pGrants  = active ? grants.filter((g) => g.program_id === active.id) : [];
  const pLogs    = active ? logs.filter((l) => l.program_id === active.id).slice(0, 6) : [];

  const dashMetrics  = pMetrics.filter((m) => m.on_dashboard);
  const extraMetrics = pMetrics.filter((m) => !m.on_dashboard);

  /* ── Empty state ── */
  if (programs.length === 0) {
    return (
      <div>
        <div className="px-8 py-6 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
          <h1 className="font-display text-2xl">Programs</h1>
          <p className="text-muted text-sm mt-0.5">Define what you measure and who delivers it.</p>
        </div>
        <div className="p-8">
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted">
            <div className="w-12 h-12 rounded-2xl bg-[#e3f0e9] grid place-items-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <p className="font-display text-lg">No programs yet</p>
            <p className="text-sm mt-1">
              <Link href="/programs/new" className="text-green underline">Create a program</Link>{" "}
              to define its metrics and start tracking impact.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl">Programs</h1>
            <p className="text-muted text-sm mt-0.5">Define what you measure and who delivers it.</p>
          </div>
          <Link
            href="/programs/new"
            className="inline-flex items-center gap-2 bg-lime text-green text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-lime-deep transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New program
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] min-h-[calc(100vh-73px)]">

        {/* ── LEFT: slim program list ── */}
        <aside className="border-r border-line bg-[#f7faf7] p-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted px-2 pt-1.5 pb-1">
            {programs.length} program{programs.length !== 1 ? "s" : ""}
          </p>

          {programs.map((prog) => {
            const isActive = active?.id === prog.id;
            const mCount   = metrics.filter((m) => m.program_id === prog.id).length;
            const gCount   = grants.filter((g) => g.program_id === prog.id).length;

            return (
              <Link
                key={prog.id}
                href={`/programs?p=${prog.id}`}
                className={`block px-3 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-green text-white shadow-sm"
                    : "bg-white border border-line hover:border-green/20 hover:shadow-sm text-ink"
                }`}
              >
                <div className={`font-semibold text-sm leading-snug truncate ${isActive ? "text-white" : "text-ink"}`}>
                  {prog.name}
                </div>
                {prog.aim && (
                  <div className={`text-xs mt-0.5 truncate leading-snug ${isActive ? "text-white/65" : "text-muted"}`}>
                    {prog.aim}
                  </div>
                )}
                <div className={`text-[11px] font-medium mt-1.5 ${isActive ? "text-white/50" : "text-muted"}`}>
                  {mCount} metric{mCount !== 1 ? "s" : ""} · {gCount} grant{gCount !== 1 ? "s" : ""}
                </div>
              </Link>
            );
          })}

          <Link
            href="/programs/new"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted border border-dashed border-[#c8d5c9] hover:bg-white hover:border-line transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New program
          </Link>
        </aside>

        {/* ── RIGHT: program detail ── */}
        {active ? (
          <main className="overflow-auto">

            {/* Program header */}
            <div className="px-8 pt-7 pb-6 border-b border-line">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-2xl leading-tight">{active.name}</h2>
                  {active.aim && (
                    <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-xl">{active.aim}</p>
                  )}
                  {active.audience && (
                    <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e3f0e9] text-green">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      {active.audience}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                  <Link
                    href={`/programs/${active.id}/edit`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-line bg-white hover:bg-paper transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </Link>
                  <DeleteButton
                    action={deleteProgram.bind(null, active.id)}
                    confirmMessage={`Delete "${active.name}" permanently?\n\nThis removes all its metrics and staff logs. This CANNOT be undone.`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                    Delete
                  </DeleteButton>
                </div>
              </div>
            </div>

            <div className="px-8 py-7 space-y-10 max-w-3xl">

              {/* ── METRICS — explained ── */}
              <section>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <h3 className="font-display text-lg leading-none">Metrics</h3>
                    <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-lg">
                      The specific things this program counts — workshops, people trained, certifications, and so on.
                      Staff log these numbers every day; approved submissions add up here and feed your funder dashboard automatically.
                    </p>
                  </div>
                  <Link
                    href={`/programs/${active.id}/edit`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-line bg-white hover:bg-[#e3f0e9] hover:text-green hover:border-green/30 transition-colors whitespace-nowrap flex-shrink-0 mt-0.5"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add / edit metrics
                  </Link>
                </div>

                {pMetrics.length === 0 ? (
                  <div className="mt-4 bg-white border border-dashed border-[#c8d5c9] rounded-2xl p-8 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-[#e3f0e9] grid place-items-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                      </svg>
                    </div>
                    <p className="font-semibold text-sm text-ink">No metrics yet</p>
                    <p className="text-muted text-xs mt-1 max-w-xs mx-auto">
                      Metrics are the fields your staff fill in each day — like <em>people trained</em> or <em>workshops delivered</em>.
                      Add them in Edit so staff know what to log.
                    </p>
                    <Link
                      href={`/programs/${active.id}/edit`}
                      className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white hover:bg-green-900 transition-colors"
                    >
                      Add first metric
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 space-y-5">

                    {/* Dashboard metrics — tracked totals */}
                    {dashMetrics.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-2.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-deep inline-block"/>
                          On dashboard · shows in funder view
                        </p>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                          {dashMetrics.map((m) => {
                            const v      = aggregate(m, logs);
                            const rawPct = m.target ? Math.round((v / m.target) * 100) : null;
                            const barPct = rawPct !== null ? Math.min(100, rawPct) : null;
                            const c      = pctColors(rawPct);
                            return (
                              <div key={m.id} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
                                <div className="text-muted text-xs font-semibold leading-snug">{m.label}</div>
                                <div className="font-mono text-2xl font-bold mt-2 leading-none text-ink">
                                  {fmtVal(v, m.kind)}
                                </div>
                                {m.kind === "percent" && (
                                  <div className="text-[10px] text-muted mt-0.5 font-medium">avg</div>
                                )}
                                {m.target ? (
                                  <>
                                    <div className={`text-xs font-semibold mt-1 ${c.text}`}>
                                      {rawPct}% of {fmtVal(m.target, m.kind)}
                                    </div>
                                    <div className="h-1.5 bg-[#eef2ee] rounded-full mt-2.5 overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: c.bar }}/>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xs text-muted mt-1">No target set</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Extra metrics — tracked but not on dashboard */}
                    {extraMetrics.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-2.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c8d5c9] inline-block"/>
                          Also tracked · internal only
                        </p>
                        <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
                          {extraMetrics.map((m) => {
                            const v = aggregate(m, logs);
                            return (
                              <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-sm">{m.label}</span>
                                  <span className="ml-2 text-[11px] text-muted capitalize">({m.kind})</span>
                                </div>
                                <div className="font-mono text-sm font-semibold text-ink">{fmtVal(v, m.kind)}</div>
                                {m.target && (
                                  <div className="text-xs text-muted w-20 text-right">
                                    of {fmtVal(m.target, m.kind)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* No dashboard metrics — explain how to enable */}
                    {dashMetrics.length === 0 && pMetrics.length > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 font-medium">
                        None of these metrics are set to show on the funder dashboard. Open Edit → toggle "Show on funder dashboard" for the ones that matter most.
                      </p>
                    )}

                  </div>
                )}
              </section>

              {/* ── Linked grants ── */}
              {pGrants.length > 0 && (
                <section>
                  <h3 className="font-display text-lg mb-1">Grants</h3>
                  <p className="text-muted text-sm mb-4">Funding linked to this program.</p>
                  <div className="flex flex-wrap gap-2">
                    {pGrants.map((g) => (
                      <Link
                        key={g.id}
                        href={`/grants/${g.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-line text-sm font-semibold hover:bg-[#e3f0e9] hover:border-green/30 hover:text-green transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2"/>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                        </svg>
                        {g.name}
                        {g.amount > 0 && (
                          <span className="text-xs text-muted font-normal">${g.amount.toLocaleString()}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Recent approved submissions ── */}
              {pLogs.length > 0 && (
                <section>
                  <h3 className="font-display text-lg mb-1">Recent submissions</h3>
                  <p className="text-muted text-sm mb-4">Latest approved logs — these are what moved the numbers above.</p>
                  <div className="bg-white border border-line rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#f7faf6] border-b border-line">
                        <tr>
                          <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted">Date</th>
                          <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted">Note</th>
                          <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pLogs.map((l) => (
                          <tr key={l.id} className="border-b border-line last:border-0 hover:bg-[#fafdf8] transition-colors">
                            <td className="px-5 py-3 font-mono text-xs text-muted whitespace-nowrap">{l.log_date}</td>
                            <td className="px-5 py-3 text-sm text-muted max-w-xs truncate">
                              {l.narrative ?? <em className="opacity-60">No note</em>}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                l.status === "approved" ? "bg-[#e4f5ec] text-[#1f9d6b]" :
                                l.status === "pending"  ? "bg-amber-50 text-amber-700" :
                                "bg-red-50 text-red-600"
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"/>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

            </div>
          </main>
        ) : (
          <div className="flex items-center justify-center text-muted p-8">
            <p className="text-sm">Select a program.</p>
          </div>
        )}

      </div>
    </div>
  );
}
