import { getPendingLogs, getPrograms, getMetrics, getProfiles, getCommitments, getAttachmentsForLogs } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveLog, requestChanges, denyLog } from "./actions";
import type { Metric } from "@/types/database";

export const dynamic = "force-dynamic";

function renderValue(m: Metric, v: unknown): string {
  if (m.kind === "yesno") return v === true ? "Yes" : "No";
  if (m.kind === "number") return String(v ?? 0);
  return String(v ?? "—");
}

export default async function ApprovalsPage() {
  const [logs, programs, metrics, profiles, commitments] = await Promise.all([
    getPendingLogs(), getPrograms(), getMetrics(), getProfiles(), getCommitments(),
  ]);

  // Fetch attachments for evidence submissions and generate signed URLs
  const evidenceLogIds = logs.filter((l) => l.commitment_id).map((l) => l.id);
  const attachments    = await getAttachmentsForLogs(evidenceLogIds);

  const admin = createAdminClient();
  const signedUrls: Record<string, string> = {};
  await Promise.all(
    attachments.map(async (att) => {
      const { data } = await admin.storage.from("evidence").createSignedUrl(att.storage_path, 3600);
      if (data?.signedUrl) signedUrls[att.id] = data.signedUrl;
    }),
  );

  const programName    = (id: string) => programs.find((p) => p.id === id)?.name ?? "—";
  const staffName      = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "Staff";
  const commitmentLabel = (id: string | null) =>
    id ? (commitments.find((c) => c.id === id)?.label ?? "Unknown commitment") : null;

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
          const ms         = metrics.filter((m) => m.program_id === log.program_id);
          const isEvidence = Boolean(log.commitment_id);
          const cLabel     = commitmentLabel(log.commitment_id);
          const att        = attachments.find((a) => a.log_id === log.id);
          const fileUrl    = att ? (signedUrls[att.id] ?? null) : null;

          return (
            <div key={log.id} className="card-elevated overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-[#f2f5f2]">
                <div>
                  <div className="font-semibold text-ink">{programName(log.program_id)}</div>
                  <div className="text-muted text-xs mt-0.5">{staffName(log.staff_id)} · {log.log_date}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isEvidence && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-none tracking-wide uppercase bg-amber-50 text-amber-700 border-amber-200">
                      Evidence
                    </span>
                  )}
                  <span className="badge-amber">Pending</span>
                </div>
              </div>

              <div className="px-6 py-5">
                {isEvidence && cLabel && (
                  <p className="text-xs text-amber-700 font-semibold mb-3">
                    Outcome: {cLabel}
                  </p>
                )}

                {log.narrative && <p className="text-sm mb-4 leading-relaxed">{log.narrative}</p>}

                {/* File attachment for evidence submissions */}
                {isEvidence && att && (
                  <div className="mb-4">
                    {fileUrl ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {att.file_name}
                        <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    ) : (
                      <span className="text-xs text-muted italic">File: {att.file_name} (link generating…)</span>
                    )}
                  </div>
                )}

                {!isEvidence && ms.filter((m) => m.kind !== "text").length > 0 && (
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
