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
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Approvals Queue</h1>
        <p className="text-muted text-sm">Review, verify and approve staff submissions before they count.</p>
      </div>

      <div className="p-8 flex flex-col gap-4 max-w-3xl">
        {logs.length === 0 && (
          <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted">
            Nothing waiting for review. 🎉
          </div>
        )}

        {logs.map((log) => {
          const ms = metrics.filter((m) => m.program_id === log.program_id);
          return (
            <div key={log.id} className="bg-white border border-line rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{programName(log.program_id)}</div>
                  <div className="text-muted text-xs">{staffName(log.staff_id)} · {log.log_date}</div>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
              </div>

              {log.narrative && <p className="text-sm mt-3">{log.narrative}</p>}

              <div className="flex flex-wrap gap-2 mt-3">
                {ms.filter((m) => m.kind !== "text").map((m) => (
                  <span key={m.id} className="text-xs bg-paper border border-line rounded-lg px-2.5 py-1">
                    {m.label}: <b className="font-mono">{renderValue(m, log.values[m.id])}</b>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-2 mt-4 pt-4 border-t border-line">
                <form action={approveLog.bind(null, log.id)}>
                  <button className="bg-green text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-900">
                    Accept &amp; verify
                  </button>
                </form>
                <form action={requestChanges.bind(null, log.id)} className="flex items-end gap-2">
                  <input name="note" placeholder="What needs changing?"
                    className="text-sm border border-line rounded-lg px-3 py-2 w-56" />
                  <button className="text-sm font-semibold px-3 py-2 rounded-lg border border-line hover:bg-paper">
                    Request changes
                  </button>
                </form>
                <form action={denyLog.bind(null, log.id)} className="flex items-end gap-2">
                  <input name="note" placeholder="Reason (optional)"
                    className="text-sm border border-line rounded-lg px-3 py-2 w-44" />
                  <button className="text-sm font-semibold px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                    Deny
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
