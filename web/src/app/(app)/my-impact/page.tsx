import Link from "next/link";
import { getAllLogs, getPrograms } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MyImpactPage() {
  const [logs, programs] = await Promise.all([getAllLogs(), getPrograms()]);

  const approvedLogs  = logs.filter((l) => l.status === "approved");
  const pendingCount  = logs.filter((l) => l.status === "pending").length;
  const changesCount  = logs.filter((l) => l.status === "changes").length;

  const programContributions = new Map<string, number>();
  for (const l of approvedLogs) {
    programContributions.set(l.program_id, (programContributions.get(l.program_id) ?? 0) + 1);
  }

  const programName = (id: string) => programs.find((p) => p.id === id)?.name ?? "Unknown program";

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">My Impact</h1>
        <p className="page-subtitle">Your contribution to verified program outcomes.</p>
      </div>

      <div className="page-body">
        <div className="flex items-center gap-3 bg-success-light border border-line text-success rounded-xl px-4 py-3 text-sm font-medium mb-8">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Your verified contribution. Program-wide dashboards are managed by your program manager.
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="card-elevated p-6">
            <div className="kpi-label mb-3">Approved logs</div>
            <div className="font-mono text-[2.4rem] font-black leading-none text-ink">{approvedLogs.length}</div>
            <div className="text-sm font-medium text-success mt-2">Verified &amp; counting</div>
          </div>
          <div className="card-elevated p-6">
            <div className="kpi-label mb-3">Programs</div>
            <div className="font-mono text-[2.4rem] font-black leading-none text-ink">{programContributions.size}</div>
            <div className="text-sm font-medium text-muted mt-2">Contributed to</div>
          </div>
          <div className="card-elevated p-6">
            <div className="kpi-label mb-3">Pending review</div>
            <div className={`font-mono text-[2.4rem] font-black leading-none ${pendingCount > 0 ? "text-amber-600" : "text-ink"}`}>
              {pendingCount}
            </div>
            <div className="text-sm font-medium text-muted mt-2">Awaiting manager</div>
          </div>
          <div className="card-elevated p-6">
            <div className="kpi-label mb-3">Needs changes</div>
            <div className={`font-mono text-[2.4rem] font-black leading-none ${changesCount > 0 ? "text-orange-600" : "text-ink"}`}>
              {changesCount}
            </div>
            <div className="text-sm font-medium text-muted mt-2">
              {changesCount > 0 ? (
                <Link href="/my-logs" className="text-green underline hover:no-underline">Review in My Submissions</Link>
              ) : "All clear"}
            </div>
          </div>
        </div>

        {programContributions.size > 0 && (
          <div className="card-elevated p-7">
            <h3 className="font-display text-xl text-ink mb-6">Approved logs by program</h3>
            <div className="space-y-4">
              {[...programContributions.entries()].sort((a, b) => b[1] - a[1]).map(([pid, count]) => {
                const total = approvedLogs.length;
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={pid}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold">{programName(pid)}</span>
                      <span className="text-sm text-muted">{count} log{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-lime rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {logs.length === 0 && (
          <div className="card-elevated p-10 text-center">
            <p className="text-muted mb-4">No submissions yet — start logging your work.</p>
            <Link href="/log" className="btn btn-primary">
              Submit your first log
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
