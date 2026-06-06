import Link from "next/link";
import { getPrograms, getMetrics, getGrants, getApprovedLogs } from "@/lib/data";
import { impactScore } from "@/lib/impact";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const [programs, metrics, grants, logs] = await Promise.all([
    getPrograms(), getMetrics(), getGrants(), getApprovedLogs(),
  ]);

  return (
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Programs</h1>
        <p className="text-muted text-sm">Each program defines its own metrics, daily log and dashboard.</p>
      </div>

      <div className="p-8">
        <div className="flex justify-end mb-5">
          <Link
            href="/programs/new"
            className="inline-flex items-center gap-2 bg-lime text-green text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-lime-deep transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create new program
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {programs.map((p) => {
            const pMetrics = metrics.filter((m) => m.program_id === p.id);
            const pGrants = grants.filter((g) => g.program_id === p.id);
            const score = impactScore(pMetrics, logs);

            return (
              <div key={p.id} className="bg-white border border-line rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg">{p.name}</h2>
                    {p.aim && <p className="text-muted text-sm mt-1">{p.aim}</p>}
                    {p.audience && (
                      <p className="text-xs text-muted mt-2">
                        <span className="font-semibold uppercase tracking-wide">Serves: </span>
                        {p.audience}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-muted font-semibold uppercase tracking-wide">Impact</div>
                    <div className="font-mono text-2xl font-semibold text-green mt-0.5">{score}%</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Tracked metrics</div>
                  <div className="flex flex-wrap gap-1.5">
                    {pMetrics.map((m) => (
                      <span
                        key={m.id}
                        className="inline-block px-3 py-1 rounded-full bg-[#e3f0e9] text-green text-xs font-semibold"
                      >
                        {m.label}
                        {m.target ? ` · goal ${m.target}` : ""}
                        {m.kind === "text" ? " · note" : ""}
                      </span>
                    ))}
                    {pMetrics.length === 0 && (
                      <span className="text-muted text-xs">No metrics defined yet.</span>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Linked grants</div>
                  <div className="flex flex-wrap gap-1.5">
                    {pGrants.map((g) => (
                      <Link
                        key={g.id}
                        href={`/grants/${g.id}`}
                        className="inline-block px-3 py-1 rounded-full bg-[#e3f0e9] text-green text-xs font-semibold hover:bg-lime transition-colors"
                      >
                        {g.name}
                      </Link>
                    ))}
                    {pGrants.length === 0 && (
                      <span className="text-muted text-xs">None yet</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {programs.length === 0 && (
            <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted">
              <p className="font-display text-lg">No programs yet</p>
              <p className="text-sm mt-1">Create one to define its metrics and start tracking impact.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
