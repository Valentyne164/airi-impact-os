import { getProfiles, getAllLogs } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [profiles, logs] = await Promise.all([getProfiles(), getAllLogs()]);

  const staff = profiles.filter((p) => p.role === "staff");

  const stats = staff.map((s) => {
    const mine = logs.filter((l) => l.staff_id === s.id);
    const submitted = mine.length;
    const approved  = mine.filter((l) => l.status === "approved").length;
    const pending   = mine.filter((l) => l.status === "pending").length;
    // compliance = how much of what was submitted is verified & approved
    const rate = submitted > 0 ? Math.min(100, Math.round((approved / submitted) * 100)) : 0;
    return { id: s.id, name: s.full_name, submitted, approved, pending, rate };
  });

  const avgRate  = stats.length ? Math.round(stats.reduce((a, s) => a + s.rate, 0) / stats.length) : 0;
  const lagging  = stats.filter((s) => s.rate < 85).map((s) => s.name);

  return (
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Team Compliance</h1>
        <p className="text-muted text-sm">Who is keeping their logs up to date.</p>
      </div>

      <div className="p-8">
        {/* Lock note */}
        <div className="flex items-center gap-3 bg-[#e3f0e9] border border-[#cde2d5] text-green rounded-xl px-4 py-3 text-sm font-medium mb-6">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Report quality depends on staff keeping logs current. This tracks each person&apos;s approval rate — what share of their submitted logs has been verified by a manager.
        </div>

        {/* Per-staff KPI tiles */}
        {stats.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
            {stats.map((s) => {
              const tone =
                s.rate >= 90 ? "text-[#1f9d6b]" :
                s.rate >= 80 ? "text-amber-600"  :
                               "text-red-600";
              const bar =
                s.rate >= 90 ? "bg-lime-deep" : "bg-green";

              return (
                <div key={s.id} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
                  <div className="text-muted text-sm font-semibold">{s.name}</div>
                  <div className="font-mono text-[2rem] font-semibold mt-2 leading-none">
                    {s.rate}<span className="text-base text-muted font-normal">%</span>
                  </div>
                  <div className={`text-sm font-semibold mt-1 ${tone}`}>
                    {s.approved} / {s.submitted} logs approved
                  </div>
                  {s.pending > 0 && (
                    <div className="text-xs text-amber-600 font-medium mt-0.5">
                      {s.pending} awaiting review
                    </div>
                  )}
                  <div className="h-2 bg-paper rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full ${bar} rounded-full transition-all duration-500`}
                      style={{ width: `${s.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted mb-6">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="font-display text-lg">No staff members yet</p>
            <p className="text-sm mt-1">Invite staff to create accounts to track their log compliance.</p>
          </div>
        )}

        {/* Why this matters */}
        {stats.length > 0 && (
          <div className="bg-white border border-line rounded-2xl p-5">
            <h2 className="font-display text-lg mb-3">Why this matters</h2>
            <div className="bg-[#fafdf8] border border-dashed border-[#cdd9ce] rounded-xl p-5 text-sm leading-relaxed text-ink">
              Average team compliance is <b>{avgRate}%</b>. Anyone below 85% risks gaps in the
              verified data that funder reports are built from.{" "}
              {lagging.length > 0 ? (
                <>
                  <b>{lagging.join(", ")}</b>{" "}
                  {lagging.length > 1 ? "may need" : "may need"} a gentle nudge.
                </>
              ) : (
                "Everyone is on track."
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
