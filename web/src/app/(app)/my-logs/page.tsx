import Link from "next/link";
import { getAllLogs, getPrograms } from "@/lib/data";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  pending:  "badge-amber",
  approved: "badge-green",
  changes:  "badge-amber",
  rejected: "badge-red",
};

const STATUS_LABEL: Record<string, string> = {
  pending:  "Pending review",
  approved: "Approved",
  changes:  "Changes requested",
  rejected: "Denied",
};

export default async function MyLogsPage() {
  const [logs, programs] = await Promise.all([getAllLogs(), getPrograms()]);

  const programName = (id: string) =>
    programs.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">My Submissions</h1>
        <p className="page-subtitle">Your logs and their review status.</p>
      </div>

      <div className="page-body max-w-2xl">
        {logs.length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <p className="text-muted mb-4">No submissions yet — your logs will appear here.</p>
            <Link href="/log" className="btn btn-primary mt-2">
              Submit your first log
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="card-elevated p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-success-light text-success flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {programName(l.program_id)}{" "}
                      <span className="text-muted font-normal">· {l.log_date}</span>
                    </p>
                    {l.narrative && (
                      <p className="text-muted text-sm mt-0.5 line-clamp-2">{l.narrative}</p>
                    )}
                    {l.evidence_note && (
                      <p className="text-xs mt-1 text-success font-medium truncate">
                        <span className="text-muted font-normal">Evidence: </span>
                        {l.evidence_note}
                      </p>
                    )}
                  </div>

                  <span className={`${STATUS_CLS[l.status] ?? "badge-muted"} flex-shrink-0`}>
                    {STATUS_LABEL[l.status] ?? l.status}
                  </span>
                </div>

                {l.manager_note && (
                  <div className={`mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                    l.status === "rejected"
                      ? "bg-red-50 border border-red-200 text-red-800"
                      : l.status === "changes"
                      ? "bg-amber-50 border border-amber-200 text-amber-800"
                      : "bg-success-light border border-line text-success"
                  }`}>
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    <span><b>Manager note:</b> {l.manager_note}</span>
                  </div>
                )}

                {l.status === "changes" && (
                  <div className="mt-3">
                    <Link href={`/log?edit=${l.id}`} className="btn btn-primary btn-sm">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      Revise &amp; resubmit
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
