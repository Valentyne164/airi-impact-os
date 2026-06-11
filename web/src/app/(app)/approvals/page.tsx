import { getPendingLogs, getPrograms, getMetrics, getProfiles } from "@/lib/data";
import { approveLog, requestChanges, denyLog } from "./actions";
import type { Metric } from "@/types/database";

export const dynamic = "force-dynamic";

function renderValue(m: Metric, v: unknown): string {
  if (m.kind === "yesno") return v === true ? "Yes" : "No";
  if (m.kind === "number") return String(v ?? 0);
  return String(v ?? "—");
}

export default async function ApprovalsPage() {
  const [logs, programs, metrics, profiles] = await Promise.all([
    getPendingLogs(), getPrograms(), getMetrics(), getProfiles(),
  ]);

  const programName = (id: string) => programs.find((p) => p.id === id)?.name ?? "—";
  const staffName = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "Staff";

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">Approvals Queue</h1>
        <p className="page-subtitle">Review, verify and approve staff submissions before they count.</p>
      </div>

      <div className="page-body flex flex-col gap-4 max-w-3xl">
        {logs.length === 0 && (
          <div className="card-elevated p-10 text-center text-muted">
            Nothing waiting for review — all caught up.
          </div>
        )}

        {logs.map((log) => {
          const ms = metrics.filter((m) => m.program_id === log.program_id);
          return (
            <div key={log.id} className="card-elevated overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-[#f2f5f2]">
                <div>
                  <div className="font-semibold text-ink">{programName(log.program_id)}</div>
                  <div className="text-muted text-xs mt-0.5">{staffName(log.staff_id)} · {log.log_date}</div>
                </div>
                <span className="badge-amber">Pending</span>
              </div>

              <div className="px-6 py-5">
                {log.narrative && <p className="text-sm mb-4 leading-relaxed">{log.narrative}</p>}

                {ms.filter((m) => m.kind !== "text").length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {ms.filter((m) => m.kind !== "text").map((m) => (
                      <span key={m.id} className="text-xs bg-surface border border-line rounded-lg px-2.5 py-1">
                        {m.label}: <b className="font-mono">{renderValue(m, log.values[m.id])}</b>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-2 pt-4 border-t border-[#f2f5f2]">
                  <form action={approveLog.bind(null, log.id)}>
                    <button className="btn btn-primary btn-sm">
                      Accept &amp; verify
                    </button>
                  </form>
                  <form action={requestChanges.bind(null, log.id)} className="flex items-end gap-2">
                    <input name="note" placeholder="What needs changing?"
                      className="field-input-sm w-52" />
                    <button className="btn btn-secondary btn-sm">
                      Request changes
                    </button>
                  </form>
                  <form action={denyLog.bind(null, log.id)} className="flex items-end gap-2">
                    <input name="note" placeholder="Reason (optional)"
                      className="field-input-sm w-40" />
                    <button className="btn btn-danger-outline btn-sm">
                      Deny
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
