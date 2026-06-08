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

  const progMetrics  = metrics.filter((m) => m.program_id === active.id);
  const dashMetrics  = progMetrics.filter((m) => m.on_dashboard && m.target);
  const score        = impactScore(progMetrics, logs);
  const approved     = allReports.filter((r) => r.program_id === active.id && r.status === "approved");

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

      <div className="p-8">
        {/* Lock note */}
        <div className="flex items-center gap-3 bg-[#e3f0e9] border border-[#cde2d5] text-green rounded-xl px-4 py-3 text-sm font-medium mb-6">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Read-only funder view for{" "}
          <b className="mx-1 text-ink">{active.name}</b> — approved outcomes only.
          Private staff logs are never exposed here.
        </div>

        {/* KPI grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {dashMetrics.map((m) => {
            const a = aggregate(m, logs);
            const pct = Math.min(100, Math.round((a / (m.target as number)) * 100));
            return (
              <div key={m.id} className="bg-white border border-line rounded-2xl p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-muted mb-1">
                  {m.label}
                </div>
                <div className="font-display text-3xl font-bold mb-0.5">
                  {a}{" "}
                  <span className="text-muted font-normal text-lg">/ {m.target}</span>
                </div>
                <div className="text-xs text-[#1f9d6b] font-semibold mb-2">{pct}% of goal</div>
                <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}

          {/* Impact score */}
          <div className="bg-white border border-line rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-1">Impact score</div>
            <div className="font-display text-3xl font-bold mb-0.5">
              {score}{" "}
              <span className="text-muted font-normal text-lg">/ 100</span>
            </div>
            <div className="text-xs text-muted font-semibold mb-2">Composite of goals</div>
            <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
              <div className="h-full bg-lime rounded-full" style={{ width: `${score}%` }} />
            </div>
          </div>
        </div>

        {/* Approved reports */}
        <div className="bg-white border border-line rounded-2xl p-5">
          <h3 className="font-display text-lg mb-4">Approved reports</h3>
          {approved.length > 0 ? (
            <div className="space-y-3">
              {approved.map((r) => (
                <div key={r.id}
                  className="flex items-center gap-3 p-4 border border-line rounded-xl">
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
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors flex-shrink-0">
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm italic text-center py-6">
              No approved reports published yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
