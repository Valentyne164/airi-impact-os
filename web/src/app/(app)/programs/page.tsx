import Link from "next/link";
import { getPrograms, getMetrics, getGrants, getApprovedLogs } from "@/lib/data";
import { aggregate } from "@/lib/impact";
import { deleteProgram } from "./[id]/edit/actions";
import DeleteButton from "../DeleteButton";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, { bar: string; text: string }> = {
  met:      { bar: "linear-gradient(90deg,#acd84e,#cef17b)", text: "text-success"  },
  ontrack:  { bar: "linear-gradient(90deg,#084734,#0a6045)", text: "text-muted"    },
  notarget: { bar: "linear-gradient(90deg,#cde2d5,#cde2d5)", text: "text-muted"    },
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
      <div className="min-h-screen bg-surface">
        <div className="page-header">
          <h1 className="font-display text-3xl text-ink leading-none">Programs</h1>
          <p className="page-subtitle">Define what you measure and who delivers it.</p>
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
              A program defines what your team measures and tracks.
            </p>
            <Link href="/programs/new" className="btn btn-cta mt-7">
              Create first program
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Sticky header ── */}
      <div className="page-header">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-ink leading-none">Programs</h1>
            <p className="page-subtitle">Define what you measure and who delivers it.</p>
          </div>
          <Link href="/programs/new" className="btn btn-cta flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New program
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] min-h-[calc(100vh-73px)]">

        {/* ── LEFT: slim nav list ── */}
        <aside className="border-r border-line bg-surface px-3 py-6 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted/60 px-3 pb-4">
            {programs.length} program{programs.length !== 1 ? "s" : ""}
          </p>

          {programs.map((prog) => {
            const isActive = active?.id === prog.id;
            return (
              <Link
                key={prog.id}
                href={`/programs?p=${prog.id}`}
                className={`block px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-white shadow-sm"
                    : "hover:bg-white/70 hover:shadow-sm"
                }`}
              >
                <div className={`text-sm leading-snug truncate ${
                  isActive ? "font-semibold text-ink" : "text-muted hover:text-ink"
                }`}>
                  {prog.name}
                </div>
                {prog.aim && (
                  <div className="text-xs mt-0.5 truncate leading-snug text-muted/60">
                    {prog.aim}
                  </div>
                )}
              </Link>
            );
          })}
        </aside>

        {/* ── RIGHT: program detail ── */}
        {active ? (
          <main className="bg-white overflow-auto">

            {/* Program title block — generous top padding, no extra band */}
            <div className="px-12 pt-12 pb-10 border-b border-line/50">
              <div className="flex items-start justify-between gap-8">
                <div className="flex-1 min-w-0">
                  {active.audience && (
                    <p className="text-xs font-semibold uppercase tracking-widest text-green mb-4">
                      {active.audience}
                    </p>
                  )}
                  <h2 className="font-display text-4xl leading-tight text-ink">
                    {active.name}
                  </h2>
                  {active.aim && (
                    <p className="text-base text-muted mt-4 leading-relaxed max-w-2xl">
                      {active.aim}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                  <Link href={`/programs/${active.id}/edit`} className="btn btn-secondary btn-sm">
                    Edit
                  </Link>
                  <DeleteButton
                    action={deleteProgram.bind(null, active.id)}
                    confirmMessage={`Delete "${active.name}" permanently?\n\nThis removes all its metrics and staff logs. This CANNOT be undone.`}
                    className="btn btn-ghost btn-sm text-muted hover:text-red-600"
                  >
                    Delete
                  </DeleteButton>
                </div>
              </div>
            </div>

            {/* Sections — generous spacing, editorial rhythm */}
            <div className="px-12 py-12 space-y-16 max-w-4xl">

              {/* ── METRICS ── */}
              <section>
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div>
                    <h3 className="font-display text-2xl text-ink">Metrics</h3>
                    <p className="text-base text-muted mt-2 leading-relaxed max-w-lg">
                      The specific things staff count each time they submit a log — for example,{" "}
                      <em>people trained</em>, <em>workshops delivered</em>, or <em>completion rate</em>.
                      Approved submissions accumulate here and flow automatically to your funder dashboard.
                    </p>
                  </div>
                  <Link href={`/programs/${active.id}/edit`} className="btn btn-secondary btn-sm flex-shrink-0 mt-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add / edit
                  </Link>
                </div>

                {pMetrics.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-success-light grid place-items-center mx-auto mb-5">
                      <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                      </svg>
                    </div>
                    <p className="font-semibold text-ink mb-1">No metrics yet</p>
                    <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                      Add the fields your staff will fill in each log —{" "}
                      like <em>people trained</em> or <em>workshops delivered</em>.
                    </p>
                    <Link href={`/programs/${active.id}/edit`} className="btn btn-primary mt-6 inline-flex">
                      Add first metric
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-10">

                    {/* Dashboard metrics — tinted tiles, no border */}
                    {dashMetrics.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-5 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-deep inline-block"/>
                          On funder dashboard
                        </p>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(188px,1fr))] gap-4">
                          {dashMetrics.map((m) => {
                            const v      = aggregate(m, logs);
                            const rawPct = m.target ? Math.round((v / m.target) * 100) : null;
                            const barPct = rawPct !== null ? Math.min(100, rawPct) : null;
                            const c      = pctColors(rawPct);
                            return (
                              <div key={m.id} className="bg-surface rounded-2xl p-6">
                                <div className="text-xs font-semibold text-muted leading-snug">{m.label}</div>
                                <div className="font-mono text-3xl font-bold mt-4 leading-none text-ink">
                                  {fmtVal(v, m.kind)}
                                </div>
                                {m.kind === "percent" && (
                                  <div className="text-xs text-muted mt-1">avg</div>
                                )}
                                {m.target ? (
                                  <>
                                    <div className={`text-xs font-semibold mt-2 ${c.text}`}>
                                      {rawPct}% of {fmtVal(m.target, m.kind)}
                                    </div>
                                    <div className="h-1 bg-line/60 rounded-full mt-3 overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: c.bar }}/>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xs text-muted mt-2">No target set</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Internal-only metrics — plain list, hairline dividers */}
                    {extraMetrics.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-line inline-block"/>
                          Also tracked · internal only
                        </p>
                        <div className="divide-y divide-line/60">
                          {extraMetrics.map((m) => {
                            const v = aggregate(m, logs);
                            return (
                              <div key={m.id} className="flex items-center gap-4 py-4">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-sm text-ink">{m.label}</span>
                                  <span className="ml-2 text-xs text-muted capitalize">({m.kind})</span>
                                </div>
                                <div className="font-mono text-sm font-semibold text-ink">{fmtVal(v, m.kind)}</div>
                                {m.target && (
                                  <div className="text-xs text-muted min-w-[64px] text-right">
                                    of {fmtVal(m.target, m.kind)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Nudge to enable dashboard metrics */}
                    {dashMetrics.length === 0 && pMetrics.length > 0 && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-5 py-4 leading-relaxed">
                        None of these metrics appear on the funder dashboard yet.
                        Open <strong>Edit</strong> and toggle <strong>Show on funder dashboard</strong> for the ones that matter most.
                      </p>
                    )}

                  </div>
                )}
              </section>

              {/* ── Linked grants ── */}
              {pGrants.length > 0 && (
                <section>
                  <h3 className="font-display text-2xl text-ink mb-3">Grants</h3>
                  <p className="text-base text-muted mb-7 leading-relaxed">Funding linked to this program.</p>
                  <div className="flex flex-wrap gap-3">
                    {pGrants.map((g) => (
                      <Link
                        key={g.id}
                        href={`/grants/${g.id}`}
                        className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-line/40 transition-colors text-sm font-medium text-ink"
                      >
                        {g.name}
                        {g.amount > 0 && (
                          <span className="text-xs text-muted">${g.amount.toLocaleString()}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Recent approved submissions ── */}
              {pLogs.length > 0 && (
                <section>
                  <h3 className="font-display text-2xl text-ink mb-3">Recent submissions</h3>
                  <p className="text-base text-muted mb-7 leading-relaxed">
                    Latest approved logs — these are what moved the numbers above.
                  </p>
                  <div className="divide-y divide-line/60">
                    <div className="grid grid-cols-[140px_1fr_100px] gap-4 pb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Date</span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Note</span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted text-right">Status</span>
                    </div>
                    {pLogs.map((l) => (
                      <div key={l.id} className="grid grid-cols-[140px_1fr_100px] gap-4 py-4 items-center hover:bg-surface/60 -mx-2 px-2 rounded-xl transition-colors">
                        <span className="font-mono text-xs text-muted">{l.log_date}</span>
                        <span className="text-sm text-muted truncate">
                          {l.narrative ?? <em className="opacity-50">No note</em>}
                        </span>
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            l.status === "approved" ? "bg-success-light text-success" :
                            l.status === "pending"  ? "bg-amber-50 text-amber-700"   :
                            "bg-red-50 text-red-600"
                          }`}>
                            <span className="w-1 h-1 rounded-full bg-current"/>
                            {l.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </main>
        ) : (
          <div className="bg-white flex items-center justify-center text-muted p-8 min-h-[60vh]">
            <p className="text-sm">Select a program from the list.</p>
          </div>
        )}

      </div>
    </div>
  );
}
