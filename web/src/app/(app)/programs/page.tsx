import Link from "next/link";
import { getPrograms, getMetrics, getGrants, getApprovedLogs } from "@/lib/data";
import { aggregate, impactScore } from "@/lib/impact";

export const dynamic = "force-dynamic";

function fmt(n: number, kind: string) {
  if (kind === "yesno") return `${n} days`;
  return n.toLocaleString();
}

function ScoreRing({
  score,
  size = 52,
  strokeWidth = 6,
  active = false,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  active?: boolean;
}) {
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const arc = Math.min((score / 100) * C, C);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={active ? "rgba(255,255,255,0.2)" : "#e5ebe5"}
        strokeWidth={strokeWidth}
      />
      {arc > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={active ? "#cef17b" : "#084734"}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc} ${C}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="round"
        />
      )}
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize={size < 50 ? 11 : 13}
        fontWeight="700"
        fill={active ? "#ffffff" : "#084734"}
        fontFamily="monospace"
      >
        {score}
      </text>
    </svg>
  );
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: { p?: string };
}) {
  const [programs, metrics, grants, logs] = await Promise.all([
    getPrograms(), getMetrics(), getGrants(), getApprovedLogs(),
  ]);

  const active      = programs.find((prog) => prog.id === searchParams.p) ?? programs[0] ?? null;
  const pMetrics    = active ? metrics.filter((m) => m.program_id === active.id) : [];
  const pGrants     = active ? grants.filter((g) => g.program_id === active.id) : [];
  const pLogs       = active ? logs.filter((l) => l.program_id === active.id).slice(0, 8) : [];
  const dashMetrics = pMetrics.filter((m) => m.on_dashboard);
  const score       = active ? impactScore(pMetrics, logs) : 0;

  return (
    <div>
      {/* ── Sticky header ── */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl">Programs</h1>
            <p className="text-muted text-sm">Define metrics, daily logs and dashboards per program.</p>
          </div>
          <Link
            href="/programs/new"
            className="inline-flex items-center gap-2 bg-lime text-green text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-lime-deep transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New program
          </Link>
        </div>
      </div>

      {/* ── Empty state ── */}
      {programs.length === 0 && (
        <div className="p-8">
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted">
            <div className="w-12 h-12 rounded-2xl bg-[#e3f0e9] grid place-items-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <p className="font-display text-lg">No programs yet</p>
            <p className="text-sm mt-1">
              <Link href="/programs/new" className="text-green underline">Create a program</Link>{" "}
              to define its metrics and start tracking impact.
            </p>
          </div>
        </div>
      )}

      {programs.length > 0 && (
        <div className="grid lg:grid-cols-[300px_1fr] min-h-[calc(100vh-73px)]">

          {/* ── LEFT: program list ── */}
          <div className="border-r border-line bg-[#f7faf7] p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted px-1 pt-1 pb-0.5">
              {programs.length} program{programs.length !== 1 ? "s" : ""}
            </p>

            {programs.map((prog) => {
              const isActive = active?.id === prog.id;
              const pScore   = impactScore(metrics.filter((m) => m.program_id === prog.id), logs);
              const mCount   = metrics.filter((m) => m.program_id === prog.id).length;
              const gCount   = grants.filter((g) => g.program_id === prog.id).length;

              return (
                <Link
                  key={prog.id}
                  href={`/programs?p=${prog.id}`}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all group
                    ${isActive
                      ? "bg-green text-white shadow-md shadow-green/20"
                      : "bg-white border border-line hover:border-green/30 hover:shadow-sm text-ink"
                    }`}
                >
                  <div className="flex-shrink-0">
                    <ScoreRing score={pScore} size={52} strokeWidth={6} active={isActive} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold text-sm truncate leading-tight ${isActive ? "text-white" : "text-ink"}`}>
                      {prog.name}
                    </div>
                    {prog.aim && (
                      <div className={`text-xs truncate mt-0.5 leading-snug ${isActive ? "text-white/70" : "text-muted"}`}>
                        {prog.aim}
                      </div>
                    )}
                    <div className={`flex items-center gap-2 mt-1.5 text-[11px] font-medium ${isActive ? "text-white/60" : "text-muted"}`}>
                      <span>{mCount} metric{mCount !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{gCount} grant{gCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <svg
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${isActive ? "text-white/60" : "text-muted"}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              );
            })}

            <Link
              href="/programs/new"
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-muted border border-dashed border-[#c8d5c9] hover:bg-white hover:border-line transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New program
            </Link>
          </div>

          {/* ── RIGHT: detail + daily log preview ── */}
          {active ? (
            <div className="grid lg:grid-cols-[1fr_280px] min-h-full">

              {/* Detail main */}
              <div className="border-r border-line">

                {/* Program header */}
                <div className="px-6 pt-6 pb-5 border-b border-line bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display text-xl leading-tight">{active.name}</h2>
                      {active.aim && (
                        <p className="text-muted text-sm mt-1 leading-relaxed">{active.aim}</p>
                      )}
                      {active.audience && (
                        <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e3f0e9] text-green">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          {active.audience}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ScoreRing score={score} size={64} strokeWidth={7} />
                      <Link
                        href={`/programs/${active.id}/edit`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-7">

                  {/* Tracked metrics */}
                  {dashMetrics.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Tracked metrics</h3>
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                        {dashMetrics.map((m) => {
                          const v   = aggregate(m, logs);
                          const pct = m.target ? Math.min(100, Math.round((v / m.target) * 100)) : null;
                          const met = pct !== null && pct >= 100;
                          return (
                            <div key={m.id} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
                              <div className="text-muted text-xs font-semibold leading-tight">{m.label}</div>
                              <div className="font-mono text-2xl font-semibold mt-1.5 leading-none">
                                {fmt(v, m.kind)}
                              </div>
                              {m.target && (
                                <>
                                  <div className={`text-xs font-semibold mt-1 ${met ? "text-[#1f9d6b]" : "text-muted"}`}>
                                    {pct}% of {fmt(m.target, m.kind)}
                                  </div>
                                  <div className="h-1.5 bg-[#eef2ee] rounded-full mt-2.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${pct}%`,
                                        background: met
                                          ? "linear-gradient(90deg,#acd84e,#cef17b)"
                                          : "linear-gradient(90deg,#084734,#0a5a42)",
                                      }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Linked grants */}
                  {pGrants.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Linked grants</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pGrants.map((g) => (
                          <Link
                            key={g.id}
                            href={`/grants/${g.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-line text-xs font-semibold hover:bg-[#e3f0e9] hover:border-green/30 hover:text-green transition-colors"
                          >
                            <svg className="w-3 h-3 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2" />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                            {g.name}
                            <svg className="w-3 h-3 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Recent submissions */}
                  {pLogs.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Recent submissions</h3>
                      </div>
                      <div className="bg-white border border-line rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="border-b border-line bg-[#f7faf6]">
                            <tr>
                              <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">Date</th>
                              <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">Narrative</th>
                              <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pLogs.map((l) => (
                              <tr key={l.id} className="border-b border-line last:border-0 hover:bg-[#f9fdf9] transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">{l.log_date}</td>
                                <td className="px-4 py-3 text-sm text-muted max-w-xs truncate">
                                  {l.narrative ?? <span className="italic">No narrative</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e4f5ec] text-[#1f9d6b]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
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

                  {dashMetrics.length === 0 && pLogs.length === 0 && (
                    <div className="text-center text-muted py-10">
                      <svg className="w-10 h-10 opacity-20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <path d="M3 9h18M9 21V9" />
                      </svg>
                      <p className="text-sm font-semibold">No data yet</p>
                      <p className="text-xs mt-1">Staff submissions appear here once approved.</p>
                    </div>
                  )}

                </div>
              </div>

              {/* Daily log preview (sticky) */}
              <div className="p-5">
                <div className="sticky top-24">
                  <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3.5 border-b border-line bg-[#f7faf6] flex items-center justify-between">
                      <div>
                        <h3 className="font-display text-sm font-semibold">Staff daily log</h3>
                        <p className="text-muted text-[11px] mt-0.5">What staff fill in each day</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[#e8f0ff] text-[#4a7aff]">Preview</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-ink mb-1">What did you do today?</div>
                        <div className="bg-[#f7faf6] border border-line rounded-xl px-3 py-2 text-muted text-[11px] italic min-h-[44px]">
                          type a note…
                        </div>
                      </div>
                      {pMetrics.map((m) => (
                        <div key={m.id}>
                          <div className="text-xs font-semibold text-ink mb-1">
                            {m.label}{m.kind === "yesno" ? "?" : ""}
                            {m.kind === "text" && (
                              <span className="ml-1.5 text-[10px] font-normal text-muted">(note)</span>
                            )}
                          </div>
                          <div className="bg-[#f7faf6] border border-line rounded-xl px-3 py-2 text-muted text-[11px]">
                            {m.kind === "yesno" ? "No ▾" : m.kind === "text" ? "type a note…" : "0"}
                          </div>
                        </div>
                      ))}
                      {pMetrics.length === 0 && (
                        <p className="text-muted text-xs italic text-center py-3">
                          No custom fields — add metrics to this program first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center text-muted p-8">
              <p className="text-sm">Select a program from the list.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
