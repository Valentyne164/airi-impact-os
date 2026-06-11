import Link from "next/link";
import { getPrograms, getGrants, getReports } from "@/lib/data";
import { approveReport, rejectReport, sendReport } from "./actions";
import ReportOverviewForm from "./ReportOverviewForm";
import ReportSpecificForm from "./ReportSpecificForm";
import type { Report } from "@/types/database";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { tab?: string; p?: string };
}

const STATUS_CLS: Record<string, string> = {
  pending:  "badge-amber",
  approved: "badge-green",
  rejected: "badge-red",
  sent:     "badge-blue",
  draft:    "badge-muted",
};

function StatusBadge({ status }: { status: Report["status"] }) {
  return (
    <span className={STATUS_CLS[status] ?? "badge-muted"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function ReportsPage({ searchParams }: Props) {
  const tab = searchParams.tab ?? "overview";

  const [programs, grants, allReports] = await Promise.all([
    getPrograms(),
    getGrants(),
    getReports(),
  ]);

  const activeProgram = programs.find((p) => p.id === searchParams.p) ?? programs[0] ?? null;
  const activePid = activeProgram?.id ?? "";

  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const defaultTo   = today.toISOString().slice(0, 10);
  const defaultFrom = threeMonthsAgo.toISOString().slice(0, 10);

  const programGrants  = grants.filter((g) => g.program_id === activePid);
  const programReports = allReports.filter((r) => r.program_id === activePid);

  function tabHref(t: string) {
    return `/reports?tab=${t}${activePid ? `&p=${activePid}` : ""}`;
  }

  const TAB_CLS = (t: string) =>
    t === tab
      ? "text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white"
      : "text-sm font-semibold px-4 py-2 rounded-xl text-muted hover:text-ink transition-colors";

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-ink leading-none">Report Generator</h1>
            {activeProgram && (
              <p className="page-subtitle">{activeProgram.name}</p>
            )}
          </div>
          {programs.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted font-semibold">Program:</span>
              <div className="flex gap-1">
                {programs.map((p) => (
                  <Link key={p.id} href={`/reports?tab=${tab}&p=${p.id}`}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      p.id === activePid
                        ? "bg-green text-white border-green"
                        : "bg-paper border-line text-muted hover:text-ink"
                    }`}>
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 mt-4">
          <Link href={tabHref("overview")} className={TAB_CLS("overview")}>
            Project Overview
          </Link>
          <Link href={tabHref("specific")} className={TAB_CLS("specific")}>
            Funder Report (Q&amp;A)
          </Link>
          <Link href={tabHref("list")} className={TAB_CLS("list")}>
            Drafts &amp; Sent
            {programReports.filter((r) => r.status === "pending").length > 0 && (
              <span className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                {programReports.filter((r) => r.status === "pending").length}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="page-body">
        {!activeProgram ? (
          <div className="card-elevated p-10 text-center">
            <p className="text-muted mb-4">No programs yet.</p>
            <Link href="/programs/new" className="btn btn-cta mt-2">
              Create a program
            </Link>
          </div>
        ) : tab === "overview" ? (
          <ReportOverviewForm
            programId={activePid}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
          />
        ) : tab === "specific" ? (
          <ReportSpecificForm
            programId={activePid}
            programGrants={programGrants.map((g) => ({
              id: g.id,
              name: g.name,
              funder_name: g.funder_name,
            }))}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
          />
        ) : (
          <div className="card-elevated overflow-hidden">
            {programReports.length === 0 ? (
              <p className="text-muted text-sm italic text-center py-10 px-6">
                No reports yet. Generate one in the Overview or Funder Report tab.
              </p>
            ) : (
              <div className="divide-y divide-[#f5f7f5]">
                {programReports.map((r) => {
                  const approveAction = approveReport.bind(null, r.id);
                  const rejectAction  = rejectReport.bind(null, r.id);
                  const sendAction    = sendReport.bind(null, r.id);
                  return (
                    <div key={r.id} className="flex items-start gap-4 px-6 py-5">
                      <div className="w-9 h-9 rounded-xl bg-success-light text-success flex items-center justify-center flex-shrink-0">
                        {r.type === "overview" ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{r.title}</p>
                        <p className="text-muted text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {activeProgram.name}
                          {r.period_from && r.period_to && ` · ${r.period_from} to ${r.period_to}`}
                          <StatusBadge status={r.status} />
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {r.status === "pending" && (
                          <>
                            <form action={approveAction}>
                              <button type="submit" className="btn btn-secondary btn-sm text-success hover:text-success">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Approve
                              </button>
                            </form>
                            <form action={rejectAction}>
                              <button type="submit" className="btn btn-danger-outline btn-sm">
                                Reject
                              </button>
                            </form>
                          </>
                        )}
                        {r.status === "approved" && (
                          <form action={sendAction}>
                            <button type="submit" className="btn btn-cta btn-sm">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                              </svg>
                              Send to funder
                            </button>
                          </form>
                        )}
                        {r.status === "sent" && r.recipient_email && (
                          <a href={`mailto:${r.recipient_email}?subject=${encodeURIComponent("AIRI report: " + r.title)}&body=${encodeURIComponent(r.body ?? "")}`}
                            className="btn btn-secondary btn-sm">
                            Email again
                          </a>
                        )}
                        <Link href={`/reports/${r.id}`} className="btn btn-ghost btn-sm">
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
