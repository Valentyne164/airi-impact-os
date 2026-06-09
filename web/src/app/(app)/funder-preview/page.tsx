import Link from "next/link";
import { getPrograms, getMetrics, getApprovedLogs, getReports } from "@/lib/data";
import { aggregate, impactScore } from "@/lib/impact";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { p?: string };
}

export default async function FunderPreviewPage({ searchParams }: Props) {
  const [programs, metrics, logs, allReports] = await Promise.all([
    getPrograms(), getMetrics(), getApprovedLogs(), getReports(),
  ]);

  const active = programs.find((p) => p.id === searchParams.p) ?? programs[0] ?? null;

  if (!active) {
    return (
      <div className="p-8 text-center text-muted">
        <p className="mb-4">No programs yet.</p>
        <Link href="/programs/new"
          className="inline-flex items-center gap-2 bg-lime text-green text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-lime-deep transition-colors">
          Create a program
        </Link>
      </div>
    );
  }

  const progLogs     = logs.filter((l) => l.program_id === active.id);
  const latestDate   = [...progLogs].sort((a, b) => b.log_date.localeCompare(a.log_date))[0]?.log_date ?? null;
  const progMetrics  = metrics.filter((m) => m.program_id === active.id);
  const dashMetrics  = progMetrics.filter((m) => m.on_dashboard && m.target);
  const score        = impactScore(progMetrics, logs);
  const approved     = allReports.filter((r) => r.program_id === active.id && r.status === "approved");

  /* Recent field evidence — approved logs with narrative or evidence_note, newest first */
  const fieldNotes = progLogs
    .filter((l) => l.narrative || (l as { evidence_note?: string | null }).evidence_note)
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
    .slice(0, 3);

  return (
    <div>
      {/* Sticky header */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl">Funder Preview</h1>
            <p className="text-muted text-sm">Exactly what a funder sees — approved outcomes only.</p>
          </div>
          {programs.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {programs.map((p) => (
                <Link key={p.id} href={`/funder-preview?p=${p.id}`}
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

      <div className="p-8 space-y-6">

        {/* ── Improvement 1: Program identity hero ──────────────────── */}
        {/* Funders need context before numbers. Show who this program is
            and surface a clear trust signal — no internal app language. */}
        <div className="bg-white border border-line rounded-2xl px-7 py-6 flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-[#e3f0e9] flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display text-xl leading-tight">{active.name}</h2>
                {active.aim && (
                  <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-xl">{active.aim}</p>
                )}
              </div>
              {/* Trust badge */}
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a7a4a] bg-[#e3f0e9] border border-[#cde2d5] px-3 py-1.5 rounded-full flex-shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Manager-verified data
              </div>
            </div>
          </div>
        </div>

        {/* ── Improvement 2: KPI grid with data provenance ─────────── */}
        {/* Every number a funder sees needs a credibility anchor:
            how many submissions back it, and how recently. */}
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
            <h3 className="font-display text-lg">Outcomes at a glance</h3>
            {progLogs.length > 0 && (
              <span className="text-xs text-muted font-medium">
                Based on{" "}
                <b className="text-ink">{progLogs.length}</b>{" "}
                verified submission{progLogs.length !== 1 ? "s" : ""}
                {latestDate && (
                  <> · last on <b className="text-ink">{latestDate}</b></>
                )}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashMetrics.map((m) => {
              const a   = aggregate(m, logs);
              const pct = Math.min(100, Math.round((a / (m.target as number)) * 100));
              return (
                <div key={m.id} className="bg-white border border-line rounded-2xl p-5 flex flex-col">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted/80 mb-3">
                    {m.label}
                  </div>
                  <div className="font-mono text-[2rem] font-bold leading-none text-ink">
                    {m.kind === "yesno" ? `${a} days` : a.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted mt-1 mb-3">
                    {pct}% of {m.kind === "yesno" ? `${m.target} day` : m.target?.toLocaleString()} goal
                  </div>
                  <div className="mt-auto h-1.5 bg-black/[.06] rounded-full overflow-hidden">
                    <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}

            {/* Overall progress tile */}
            {dashMetrics.length > 0 && (
              <div className="bg-[#084734] text-white rounded-2xl p-5 flex flex-col">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-3">
                  Goals achieved
                </div>
                <div className="font-mono text-[2rem] font-bold leading-none">
                  {score}
                  <span className="text-white/50 font-normal text-lg"> / 100</span>
                </div>
                <div className="text-xs text-white/60 mt-1 mb-3">Average across all targets</div>
                <div className="mt-auto h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-lime rounded-full" style={{ width: `${score}%` }} />
                </div>
              </div>
            )}

            {dashMetrics.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-4 bg-[#f7fbf7] rounded-2xl px-5 py-8 text-center text-muted">
                <p className="text-sm">No tracked outcomes set to show yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Improvement 3: Field notes ──────────────────────────────── */}
        {/* Numbers alone don't tell the story. Recent field notes from
            approved submissions show the human reality behind the data. */}
        {fieldNotes.length > 0 && (
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-line">
              <h3 className="font-display text-lg leading-none">From the field</h3>
              <p className="text-muted text-xs mt-1">Recent notes from verified submissions</p>
            </div>
            <div className="divide-y divide-[#f0f4f0]">
              {fieldNotes.map((l) => {
                const evidenceNote = (l as { evidence_note?: string | null }).evidence_note;
                const isUrl = (s: string) => s.startsWith("http://") || s.startsWith("https://");
                return (
                  <div key={l.id} className="px-6 py-4 flex gap-4">
                    {/* Date column */}
                    <div className="flex-shrink-0 w-20 text-right">
                      <span className="text-xs font-mono text-muted">{l.log_date}</span>
                    </div>
                    {/* Divider dot */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-0">
                      <div className="w-2 h-2 rounded-full bg-[#cde2d5] mt-1.5" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {l.narrative && (
                        <p className="text-sm text-ink leading-relaxed">{l.narrative}</p>
                      )}
                      {evidenceNote && (
                        isUrl(evidenceNote) ? (
                          <a
                            href={evidenceNote}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green hover:underline"
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            View evidence
                          </a>
                        ) : (
                          <p className="text-xs text-muted italic">Evidence: {evidenceNote}</p>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Approved reports */}
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-line">
            <h3 className="font-display text-lg leading-none">Approved reports</h3>
            <p className="text-muted text-xs mt-1">Full narrative reports published for this program</p>
          </div>
          {approved.length > 0 ? (
            <div className="divide-y divide-[#f0f4f0]">
              {approved.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-xl bg-[#e3f0e9] text-green flex items-center justify-center flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{r.title}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {r.period_from && r.period_to
                        ? `${r.period_from} to ${r.period_to} · `
                        : ""}
                      {r.format ?? "Funder report"}
                    </p>
                  </div>
                  <Link href={`/reports/${r.id}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-[#e3f0e9] hover:text-green hover:border-green/30 transition-colors flex-shrink-0">
                    View report →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-muted">
              <p className="text-sm">No approved reports published yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
