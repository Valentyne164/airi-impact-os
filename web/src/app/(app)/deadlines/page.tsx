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
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Deadline Engine</h1>
        <p className="text-muted text-sm">Automated reminders so no report deadline is ever missed.</p>
      </div>

      <div className="p-8 max-w-3xl">
        {/* Lock note */}
        <div className="flex items-center gap-3 bg-[#e3f0e9] border border-[#cde2d5] text-green rounded-xl px-4 py-3 text-sm font-medium mb-6">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>
          </svg>
          The engine watches every deadline and auto-sends staged reminders: a draft nudge at 14 days,
          reminders at 7 and 3 days, and an escalation on the due date.
        </div>

        <div className="flex flex-col gap-4">
          {sorted.map((g) => {
            const d = dueStatus(g);
            const prog = programs.find((p) => p.id === g.program_id);

            let badgeCls = "bg-[#e4f5ec] text-[#1f9d6b]";
            let badgeText = `${d.n}d left`;
            if (d.n === Infinity) { badgeCls = "bg-paper text-muted"; badgeText = "No date set"; }
            else if (d.n < 0)    { badgeCls = "bg-red-100 text-red-700"; badgeText = "Overdue"; }
            else if (d.n <= 7)   { badgeCls = "bg-amber-100 text-amber-700"; }
            else if (d.n <= 14)  { badgeCls = "bg-amber-100 text-amber-700"; }

            return (
              <div key={g.id} className="bg-white border border-line rounded-2xl p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-display text-lg">{g.name}</h2>
                    <p className="text-muted text-sm">
                      {g.funder_name}
                      {prog ? ` · ${prog.name}` : ""}
                      {g.next_report ? ` · report due ${g.next_report}` : ""}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${badgeCls}`}>
                    {badgeText}
                  </span>
                </div>

                {/* 4-stage timeline */}
                <div className="flex gap-2 flex-wrap">
                  {DEADLINE_STAGES.map((s) => {
                    const done = d.n <= s.offset;
                    const cur  = d.current?.key === s.key;
                    return (
                      <div
                        key={s.key}
                        className={`flex-1 min-w-[110px] flex gap-2 items-start rounded-xl border p-3 text-xs
                          ${cur  ? "border-amber-400 bg-amber-50" :
                            done ? "border-green/30 bg-green/5"   :
                                   "border-line bg-paper/40 opacity-60"}`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0
                            ${cur  ? "bg-amber-500" :
                              done ? "bg-[#1f9d6b]" :
                                     "bg-[#cdd9ce]"}`}
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

                {/* Action row */}
                <div className="flex items-center gap-2 flex-wrap mt-4">
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
                    <button className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="m22 7-10 6L2 7"/>
                      </svg>
                      Send reminder now
                    </button>
                  </form>

                  <Link
                    href="/reports"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green text-white hover:bg-green-900 transition-colors"
                  >
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
            <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted">
              <p className="font-display text-lg">No grants found</p>
              <p className="text-sm mt-1">Add a grant with a next-report date to see its deadline timeline here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
