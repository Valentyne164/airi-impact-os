import Link from "next/link";
import { getGrants, getPrograms } from "@/lib/data";
import { dueStatus, DEADLINE_STAGES } from "@/lib/impact";
import { sendReminder } from "./actions";

export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const [grants, programs] = await Promise.all([getGrants(), getPrograms()]);

  const sorted = [...grants].sort((a, b) => {
    if (!a.next_report) return 1;
    if (!b.next_report) return -1;
    return dueStatus(a).n - dueStatus(b).n;
  });

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">Deadline Engine</h1>
        <p className="page-subtitle">Automated reminders so no report deadline is ever missed.</p>
      </div>

      <div className="page-body max-w-3xl">
        <div className="flex items-center gap-3 bg-success-light border border-line text-success rounded-xl px-4 py-3 text-sm font-medium mb-8">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>
          </svg>
          The engine watches every deadline and auto-sends staged reminders: a draft nudge at 14 days,
          reminders at 7 and 3 days, and an escalation on the due date.
        </div>

        <div className="flex flex-col gap-5">
          {sorted.map((g) => {
            const d = dueStatus(g);
            const prog = programs.find((p) => p.id === g.program_id);

            let badgeCls = "badge-green";
            let badgeText = `${d.n}d left`;
            if (d.n === Infinity) { badgeCls = "badge-muted"; badgeText = "No date set"; }
            else if (d.n < 0)    { badgeCls = "badge-red"; badgeText = "Overdue"; }
            else if (d.n <= 14)  { badgeCls = "badge-amber"; }

            return (
              <div key={g.id} className="card-elevated p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="font-display text-lg text-ink">{g.name}</h2>
                    <p className="text-muted text-sm mt-0.5">
                      {g.funder_name}
                      {prog ? ` · ${prog.name}` : ""}
                      {g.next_report ? ` · report due ${g.next_report}` : ""}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 ${badgeCls}`}>{badgeText}</span>
                </div>

                <div className="flex gap-2 flex-wrap mb-5">
                  {DEADLINE_STAGES.map((s) => {
                    const done = d.n <= s.offset;
                    const cur  = d.current?.key === s.key;
                    return (
                      <div
                        key={s.key}
                        className={`flex-1 min-w-[110px] flex gap-2 items-start rounded-xl border p-3 text-xs
                          ${cur  ? "border-amber-400 bg-amber-50" :
                            done ? "border-green/30 bg-green/5"   :
                                   "border-line bg-surface/40 opacity-60"}`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0
                            ${cur  ? "bg-amber-500" :
                              done ? "bg-success" :
                                     "bg-line"}`}
                        />
                        <div>
                          <b className="block">{s.label}</b>
                          <span className="text-muted">
                            {s.offset === 0 ? "on due date" : `${s.offset} days before`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {d.current ? (
                    <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1.5 text-xs font-semibold">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
                        <path d="M12 9v4M12 17h.01"/>
                      </svg>
                      Stage active: {d.current.label}
                    </span>
                  ) : (
                    <span className="text-muted text-xs">No reminder stage active yet.</span>
                  )}

                  <form action={sendReminder.bind(null, g.id)}>
                    <button className="btn btn-secondary btn-sm">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="m22 7-10 6L2 7"/>
                      </svg>
                      Send reminder now
                    </button>
                  </form>

                  <Link href="/reports" className="btn btn-primary btn-sm">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <path d="M14 2v6h6M9 13h6M9 17h6"/>
                    </svg>
                    Start report
                  </Link>
                </div>
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className="card-elevated p-12 text-center text-muted">
              <p className="font-display text-lg">No grants found</p>
              <p className="text-sm mt-1">Add a grant with a next-report date to see its deadline timeline here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
