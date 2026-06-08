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

const STATUS_STYLE: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-[#e4f5ec] text-[#1f9d6b]",
  rejected: "bg-red-100 text-red-600",
  sent:     "bg-blue-100 text-blue-700",
  draft:    "bg-[#f3f4f6] text-muted",
};

function StatusBadge({ status }: { status: Report["status"] }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[status] ?? STATUS_STYLE.draft}`}>
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

  // Compute default period: 3 months ago → today
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const defaultTo   = today.toISOString().slice(0, 10);
  const defaultFrom = threeMonthsAgo.toISOString().slice(0, 10);

  const programGrants = grants.filter((g) => g.program_id === activePid);
  const programReports = allReports.filter((r) => r.program_id === activePid);

  function tabHref(t: string) {
    return `/reports?tab=${t}${activePid ? `&p=${activePid}` : ""}`;
  }

  const TAB_STYLE = (t: string) =>
    t === tab
      ? "text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white"
      : "text-sm font-semibold px-4 py-2 rounded-xl text-muted hover:text-ink transition-colors";

  return (
    <div>
      {/* Header */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl">Report Generator</h1>
            {activeProgram && (
              <p className="text-muted text-sm">{activeProgram.name}</p>
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

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          <Link href={tabHref("overview")} className={TAB_STYLE("overview")}>
            Project Overview
          </Link>
          <Link href={tabHref("specific")} className={TAB_STYLE("specific")}>
            Funder Report (Q&amp;A)
          </Link>
          <Link href={tabHref("list")} className={TAB_STYLE("list")}>
            Drafts &amp; Sent
            {programReports.filter((r) => r.status === "pending").length > 0 && (
              <span className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                {programReports.filter((r) => r.status === "pending").length}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="p-8">
        {!activeProgram ? (
          <div className="bg-white border border-line rounded-2xl p-10 text-center">
            <p className="text-muted mb-4">No programs yet.</p>
            <Link href="/programs/new"
              className="inline-flex items-center gap-2 bg-lime text-green text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-lime-deep transition-colors">
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
          /* List tab */
          <div className="bg-white border border-line rounded-2xl p-5">
            {programReports.length === 0 ? (
              <p className="text-muted text-sm italic text-center py-6">
                No reports yet. Generate one in the Overview or Funder Report tab.
              </p>
            ) : (
              <div className="space-y-3">
                {programReports.map((r) => {
                  const approveAction = approveReport.bind(null, r.id);
                  const rejectAction  = rejectReport.bind(null, r.id);
                  const sendAction    = sendReport.bind(null, r.id);
                  return (
                    <div key={r.id}
                      className="flex items-start gap-3 p-4 border border-line rounded-xl bg-white">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-[#e3f0e9] text-green flex items-center justify-center flex-shrink-0">
                        {r.type === "overview" ? (
                          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                          </svg>
                        ) : (
                          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        )}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{r.title}</p>
                        <p className="text-muted text-xs mt-0.5">
                          {activeProgram.name}
                          {r.period_from && r.period_to && ` · ${r.period_from} to ${r.period_to}`}
                          {" · "}<StatusBadge status={r.status} />
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {r.status === "pending" && (
                          <>
                            <form action={approveAction}>
                              <button type="submit"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#e4f5ec] text-[#1f9d6b] hover:bg-[#cef17b] hover:text-green transition-colors">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Approve
                              </button>
                            </form>
                            <form action={rejectAction}>
                              <button type="submit"
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                                Reject
                              </button>
                            </form>
                          </>
                        )}
                        {r.status === "approved" && (
                          <form action={sendAction}>
                            <button type="submit"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-lime text-green hover:bg-lime-deep transition-colors">
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
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            Email again
                          </a>
                        )}
                        <Link href={`/reports/${r.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors">
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
