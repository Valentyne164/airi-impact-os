import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, getPrograms, getGrants, getReports } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FunderReportsPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "funder") redirect("/");

  // RLS scopes getGrants() to this funder; getReports() returns status='sent' rows
  // for programs the funder funds (once SQL policies are applied).
  const [programs, grants, reports] = await Promise.all([
    getPrograms(), getGrants(), getReports(),
  ]);

  const myProgramIds = new Set(
    grants.map((g) => g.program_id).filter(Boolean) as string[],
  );
  const myGrantIds = new Set(grants.map((g) => g.id));

  // Show reports that belong to the funder's programs or their specific grants
  const visibleReports = reports.filter(
    (r) =>
      (r.program_id && myProgramIds.has(r.program_id)) ||
      (r.grant_id && myGrantIds.has(r.grant_id)),
  );

  // Group by program
  const byProgram = new Map<string, typeof visibleReports>();
  for (const r of visibleReports) {
    const pid = r.program_id ?? "__none";
    if (!byProgram.has(pid)) byProgram.set(pid, []);
    byProgram.get(pid)!.push(r);
  }

  return (
    <div>
      {/* Header */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div>
          <h1 className="font-display text-2xl">Your Reports</h1>
          <p className="text-muted text-sm">
            Reports sent to you by the program manager — manager-verified before delivery.
          </p>
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
          Read-only. Every report here was approved by a manager before it was sent to you.
        </div>

        {visibleReports.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#e3f0e9] text-green flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="font-semibold mb-1">No reports yet</p>
            <p className="text-muted text-sm">
              Once the program manager approves and sends a report, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(byProgram.entries()).map(([pid, progReports]) => {
              const prog = programs.find((p) => p.id === pid);
              return (
                <div key={pid} className="bg-white border border-line rounded-2xl overflow-hidden">
                  {/* Program header */}
                  <div className="px-5 py-3.5 border-b border-line bg-[#f7f9f7] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-lime flex-shrink-0" />
                    <span className="font-display font-semibold text-sm">
                      {prog?.name ?? "Program"}
                    </span>
                    <span className="ml-auto text-xs text-muted">
                      {progReports.length} report{progReports.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Report rows */}
                  <div className="divide-y divide-line">
                    {progReports.map((r) => {
                      const grant = grants.find((g) => g.id === r.grant_id);
                      return (
                        <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                          {/* Icon */}
                          <div className="w-9 h-9 rounded-xl bg-[#e3f0e9] text-green flex items-center justify-center flex-shrink-0">
                            {r.type === "overview" ? (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"/>
                                <rect x="14" y="3" width="7" height="7"/>
                                <rect x="14" y="14" width="7" height="7"/>
                                <rect x="3" y="14" width="7" height="7"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                              </svg>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{r.title}</p>
                            <p className="text-muted text-xs mt-0.5">
                              {r.type === "overview" ? "Project overview" : "Funder Q&A"}
                              {grant && <> · {grant.name}</>}
                              {r.period_from && r.period_to && (
                                <> · {r.period_from} to {r.period_to}</>
                              )}
                            </p>
                          </div>

                          {/* Date */}
                          <span className="text-xs text-muted hidden sm:block flex-shrink-0">
                            {new Date(r.created_at).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>

                          {/* Actions */}
                          <div className="flex gap-2 flex-shrink-0">
                            <Link href={`/funder/reports/${r.id}`}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-[#e3f0e9] hover:border-[#cde2d5] hover:text-green transition-colors">
                              View
                            </Link>
                            {r.recipient_email && (
                              <a href={`mailto:${r.recipient_email}?subject=${encodeURIComponent("Re: " + r.title)}`}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors">
                                Reply
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
