import { getProfilesAdmin, getPrograms, getProgramStaff, getAllLogs } from "@/lib/data";
import { addStaffToProgram, removeStaffFromProgram, updateStaff, deactivateStaff, reactivateStaff } from "./actions";
import AddStaffForm from "./AddStaffForm";
import DeleteButton from "../DeleteButton";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name.split(" ").map((s) => s[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export default async function TeamPage() {
  const [profiles, programs, programStaff, logs] = await Promise.all([
    getProfilesAdmin(), getPrograms(), getProgramStaff(), getAllLogs(),
  ]);

  const activeStaff   = profiles.filter((p) => p.role === "staff" && p.active !== false);
  const inactiveStaff = profiles.filter((p) => p.role === "staff" && p.active === false);
  const allStaff      = [...activeStaff, ...inactiveStaff];
  const managers      = profiles.filter((p) => p.role === "manager");

  const compliance = allStaff.map((s) => {
    const mine      = logs.filter((l) => l.staff_id === s.id);
    const submitted = mine.length;
    const approved  = mine.filter((l) => l.status === "approved").length;
    const pending   = mine.filter((l) => l.status === "pending").length;
    const rate      = submitted > 0 ? Math.min(100, Math.round((approved / submitted) * 100)) : 0;
    return { ...s, submitted, approved, pending, rate };
  });

  const avgRate = activeStaff.length
    ? Math.round(compliance.filter((s) => s.active !== false).reduce((a, s) => a + s.rate, 0) / activeStaff.length)
    : 0;

  const assignedIdsByProgram = (pid: string) =>
    programStaff.filter((ps) => ps.program_id === pid).map((ps) => ps.profile_id);

  return (
    <div>
      {/* ── Header ── */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <h1 className="font-display text-2xl">Team</h1>
        <p className="text-muted text-sm">Manage staff accounts, program assignments and log compliance.</p>
      </div>

      <div className="p-8 space-y-10">

        {/* ──────────────────────────────────────────────────── */}
        {/* SECTION 1 — Staff accounts                          */}
        {/* ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-xl">Staff accounts</h2>
              <p className="text-muted text-sm">Create accounts, edit roles, deactivate or reactivate staff.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted font-semibold flex-shrink-0 mt-1">
              <span className="px-2 py-1 rounded-full bg-[#e3f0e9] text-green">{activeStaff.length} active</span>
              {inactiveStaff.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-[#f0f0f0] text-muted">{inactiveStaff.length} inactive</span>
              )}
            </div>
          </div>

          <AddStaffForm />

          {/* ── Staff roster table ── */}
          {allStaff.length > 0 ? (
            <div className="bg-white border border-line rounded-2xl overflow-hidden">
              {allStaff.map((s, idx) => {
                const stats      = compliance.find((c) => c.id === s.id);
                const isActive   = s.active !== false;
                const updateAction     = updateStaff.bind(null, s.id);
                const deactivateAction = deactivateStaff.bind(null, s.id);
                const reactivateAction = reactivateStaff.bind(null, s.id);
                const tone = !stats || stats.submitted === 0 ? "text-muted"
                  : stats.rate >= 90 ? "text-[#1f9d6b]"
                  : stats.rate >= 75 ? "text-amber-600" : "text-red-600";

                return (
                  <details key={s.id} className={`group border-b border-line last:border-0 ${!isActive ? "opacity-60" : ""}`}>
                    <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-[#f7faf6] transition-colors list-none">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                        isActive ? "bg-green text-lime" : "bg-[#e5e5e5] text-muted"
                      }`}>
                        {initials(s.full_name)}
                      </div>
                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{s.full_name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            s.role === "manager" ? "bg-[#e8f0ff] text-[#4a7aff]" : "bg-[#e3f0e9] text-green"
                          }`}>
                            {s.role}
                          </span>
                          {!isActive && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[#999]">
                              Inactive
                            </span>
                          )}
                        </div>
                        {stats && stats.submitted > 0 && (
                          <div className={`text-xs font-medium mt-0.5 ${tone}`}>
                            {stats.approved}/{stats.submitted} logs approved · {stats.rate}%
                          </div>
                        )}
                      </div>
                      {/* Expand arrow */}
                      <svg className="w-4 h-4 text-muted group-open:rotate-90 transition-transform flex-shrink-0"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </summary>

                    {/* Expanded: edit form + deactivate/reactivate */}
                    <div className="px-5 pb-5 pt-4 bg-[#f7faf6] border-t border-line">
                      <form action={updateAction} className="grid sm:grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Full name</label>
                          <input
                            name="name"
                            defaultValue={s.full_name}
                            required
                            className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:border-green"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Role</label>
                          <select
                            name="role"
                            defaultValue={s.role}
                            className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:border-green"
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="submit"
                            className="text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white hover:bg-green-900 transition-colors"
                          >
                            Save changes
                          </button>
                        </div>
                      </form>

                      <div className="border-t border-line pt-4 flex items-center gap-3">
                        {isActive ? (
                          <DeleteButton
                            action={deactivateAction}
                            confirmMessage={`Deactivate "${s.full_name}"? They will be blocked from logging in.`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                            Deactivate account
                          </DeleteButton>
                        ) : (
                          <form action={reactivateAction}>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#e3f0e9] text-green hover:bg-lime transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              Reactivate account
                            </button>
                          </form>
                        )}
                        <p className="text-xs text-muted">
                          {isActive
                            ? "Past logs are preserved. The account is blocked from logging in."
                            : "Restores login access. Past logs remain unchanged."}
                        </p>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted">
              <p className="font-display text-lg">No staff accounts yet</p>
              <p className="text-sm mt-1">Use the form above to create the first account.</p>
            </div>
          )}

          {/* Managers list (read-only) */}
          {managers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2 px-1">
                Managers ({managers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {managers.map((m) => (
                  <div key={m.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-xl text-sm">
                    <div className="w-6 h-6 rounded-md bg-[#e8f0ff] text-[#4a7aff] flex items-center justify-center font-mono font-bold text-[10px]">
                      {initials(m.full_name)}
                    </div>
                    <span className="font-semibold text-sm">{m.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ──────────────────────────────────────────────────── */}
        {/* SECTION 2 — Program assignments                     */}
        {/* ──────────────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="font-display text-xl">Staff by program</h2>
            <p className="text-muted text-sm">
              Assign staff to programs. Assigned staff only see their programs in the log form.
            </p>
          </div>

          {programs.length === 0 ? (
            <div className="bg-white border border-line rounded-2xl p-10 text-center text-muted">
              No programs yet — create one first.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {programs.map((p) => {
                const assignedIds   = assignedIdsByProgram(p.id);
                const assignedStaff = activeStaff.filter((s) => assignedIds.includes(s.id));
                const available     = activeStaff.filter((s) => !assignedIds.includes(s.id));
                const addAction     = addStaffToProgram.bind(null, p.id);

                return (
                  <div key={p.id} className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
                    <div>
                      <div className="font-display text-base font-semibold">{p.name}</div>
                      <div className="text-xs text-muted mt-0.5">{assignedStaff.length} staff assigned</div>
                    </div>

                    {assignedStaff.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {assignedStaff.map((s) => {
                          const removeAction = removeStaffFromProgram.bind(null, p.id, s.id);
                          const stats = compliance.find((c) => c.id === s.id);
                          const tone = !stats || stats.submitted === 0 ? "text-muted"
                            : stats.rate >= 90 ? "text-[#1f9d6b]"
                            : stats.rate >= 75 ? "text-amber-600" : "text-red-600";
                          return (
                            <div key={s.id} className="flex items-center gap-2.5 bg-[#f7faf6] border border-line rounded-xl px-3 py-2">
                              <div className="w-8 h-8 rounded-lg bg-green text-lime flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                                {initials(s.full_name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{s.full_name}</div>
                                {stats && stats.submitted > 0 && (
                                  <div className={`text-xs font-medium ${tone}`}>{stats.rate}% approval rate</div>
                                )}
                              </div>
                              <form action={removeAction}>
                                <button type="submit"
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                                  title="Remove from program">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18M6 6l12 12"/>
                                  </svg>
                                </button>
                              </form>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted text-xs italic">No staff assigned yet.</p>
                    )}

                    {available.length > 0 && (
                      <form action={addAction} className="flex gap-2 mt-auto">
                        <select name="profile_id"
                          className="flex-1 px-3 py-2 border border-line rounded-xl text-sm bg-white focus:outline-none focus:border-green min-w-0">
                          <option value="">Select staff…</option>
                          {available.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                          ))}
                        </select>
                        <button type="submit"
                          className="inline-flex items-center gap-1.5 bg-lime text-green text-sm font-semibold px-3 py-2 rounded-xl hover:bg-lime-deep transition-colors flex-shrink-0">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          Assign
                        </button>
                      </form>
                    )}
                    {available.length === 0 && activeStaff.length > 0 && (
                      <p className="text-xs text-muted mt-auto">All active staff are assigned.</p>
                    )}
                    {activeStaff.length === 0 && (
                      <p className="text-xs text-muted mt-auto">No active staff accounts yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ──────────────────────────────────────────────────── */}
        {/* SECTION 3 — Log compliance                          */}
        {/* ──────────────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="font-display text-xl">Log compliance</h2>
            <p className="text-muted text-sm">Share of each staff member&apos;s submitted logs that has been approved.</p>
          </div>

          {activeStaff.length === 0 ? (
            <div className="bg-white border border-line rounded-2xl p-10 text-center text-muted">
              No active staff accounts yet.
            </div>
          ) : (
            <>
              <div className="bg-white border border-line rounded-2xl overflow-hidden mb-5">
                <table className="w-full text-sm">
                  <thead className="text-muted text-xs uppercase tracking-wide">
                    <tr className="border-b border-line">
                      <th className="text-left p-3 pl-5">Staff member</th>
                      <th className="text-left p-3">Programs</th>
                      <th className="text-right p-3">Submitted</th>
                      <th className="text-right p-3">Approved</th>
                      <th className="text-right p-3">Pending</th>
                      <th className="p-3 pr-5 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compliance
                      .filter((s) => s.active !== false)
                      .sort((a, b) => b.submitted - a.submitted)
                      .map((s) => {
                        const tone = s.submitted === 0 ? "text-muted"
                          : s.rate >= 90 ? "text-[#1f9d6b]"
                          : s.rate >= 75 ? "text-amber-600" : "text-red-600";
                        const bar  = s.rate >= 90 ? "bg-lime-deep"
                          : s.rate >= 75 ? "bg-amber-400" : "bg-red-400";
                        const myPrograms = programStaff
                          .filter((ps) => ps.profile_id === s.id)
                          .map((ps) => programs.find((p) => p.id === ps.program_id)?.name)
                          .filter(Boolean);
                        return (
                          <tr key={s.id} className="border-b border-line last:border-0 hover:bg-[#f7faf6]">
                            <td className="p-3 pl-5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-green text-lime flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                                  {initials(s.full_name)}
                                </div>
                                <span className="font-semibold">{s.full_name}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              {myPrograms.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {myPrograms.map((name, i) => (
                                    <span key={i} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#e3f0e9] text-[#1a5c3e]">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted italic">Unassigned</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono">{s.submitted}</td>
                            <td className="p-3 text-right font-mono">{s.approved}</td>
                            <td className="p-3 text-right">
                              {s.pending > 0
                                ? <span className="font-mono text-amber-600">{s.pending}</span>
                                : <span className="font-mono text-muted">—</span>}
                            </td>
                            <td className="p-3 pr-5">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                                  <div className={`h-full ${bar} rounded-full`}
                                    style={{ width: s.submitted === 0 ? "0%" : `${s.rate}%` }} />
                                </div>
                                <span className={`font-mono text-sm font-semibold w-10 text-right ${tone}`}>
                                  {s.submitted === 0 ? "—" : `${s.rate}%`}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <div className="bg-white border border-line rounded-2xl p-5">
                <h3 className="font-semibold text-base mb-2">Team health</h3>
                <div className="bg-[#fafdf8] border border-dashed border-[#cdd9ce] rounded-xl p-4 text-sm leading-relaxed">
                  Average approval rate is <b className="text-green">{avgRate}%</b> across {activeStaff.length} active staff.{" "}
                  {compliance.filter((s) => s.active !== false && s.submitted > 0 && s.rate < 85).length > 0 ? (
                    <>
                      <b>{compliance.filter((s) => s.active !== false && s.submitted > 0 && s.rate < 85).map((s) => s.full_name).join(", ")}</b>{" "}
                      may need a nudge — below the 85% healthy threshold.
                    </>
                  ) : (
                    "Everyone is on track."
                  )}
                </div>
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  );
}
