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
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">Team</h1>
        <p className="page-subtitle">Manage staff accounts, program assignments and log compliance.</p>
      </div>

      <div className="page-body space-y-12">

        {/* ── SECTION 1 — Staff accounts ── */}
        <section>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-xl text-ink">Staff accounts</h2>
              <p className="text-muted text-sm mt-0.5">Create accounts, edit roles, deactivate or reactivate staff.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <span className="badge-green">{activeStaff.length} active</span>
              {inactiveStaff.length > 0 && (
                <span className="badge-muted">{inactiveStaff.length} inactive</span>
              )}
            </div>
          </div>

          <AddStaffForm />

          {allStaff.length > 0 ? (
            <div className="card-elevated overflow-hidden">
              {allStaff.map((s) => {
                const stats            = compliance.find((c) => c.id === s.id);
                const isActive         = s.active !== false;
                const updateAction     = updateStaff.bind(null, s.id);
                const deactivateAction = deactivateStaff.bind(null, s.id);
                const reactivateAction = reactivateStaff.bind(null, s.id);
                const tone = !stats || stats.submitted === 0 ? "text-muted"
                  : stats.rate >= 90 ? "text-success"
                  : stats.rate >= 75 ? "text-amber-600" : "text-red-600";

                return (
                  <details key={s.id} className={`group border-b border-[#f2f5f2] last:border-0 ${!isActive ? "opacity-60" : ""}`}>
                    <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-surface transition-colors list-none">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                        isActive ? "bg-green text-lime" : "bg-paper text-muted"
                      }`}>
                        {initials(s.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{s.full_name}</span>
                          <span className={s.role === "manager" ? "badge-blue" : "badge-green"}>
                            {s.role}
                          </span>
                          {!isActive && <span className="badge-muted">Inactive</span>}
                        </div>
                        {stats && stats.submitted > 0 && (
                          <div className={`text-xs font-medium mt-0.5 ${tone}`}>
                            {stats.approved}/{stats.submitted} logs approved · {stats.rate}%
                          </div>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-muted group-open:rotate-90 transition-transform flex-shrink-0"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </summary>

                    <div className="px-6 pb-6 pt-4 bg-surface border-t border-[#f2f5f2]">
                      <form action={updateAction} className="grid sm:grid-cols-2 gap-3 mb-5">
                        <div>
                          <label className="field-label">Full name</label>
                          <input name="name" defaultValue={s.full_name} required className="field-input" />
                        </div>
                        <div>
                          <label className="field-label">Role</label>
                          <select name="role" defaultValue={s.role} className="field-input">
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <button type="submit" className="btn btn-primary btn-sm">Save changes</button>
                        </div>
                      </form>

                      <div className="border-t border-line pt-4 flex items-center gap-3">
                        {isActive ? (
                          <DeleteButton
                            action={deactivateAction}
                            confirmMessage={`Deactivate "${s.full_name}"? They will be blocked from logging in.`}
                            className="btn btn-danger-outline btn-sm"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                            Deactivate account
                          </DeleteButton>
                        ) : (
                          <form action={reactivateAction}>
                            <button type="submit" className="btn btn-secondary btn-sm text-success">
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
            <div className="card-elevated p-10 text-center text-muted">
              <p className="font-display text-lg">No staff accounts yet</p>
              <p className="text-sm mt-1">Use the form above to create the first account.</p>
            </div>
          )}

          {managers.length > 0 && (
            <div className="mt-5">
              <p className="field-label mb-2.5 px-1">Managers ({managers.length})</p>
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

        {/* ── SECTION 2 — Program assignments ── */}
        <section>
          <div className="mb-5">
            <h2 className="font-display text-xl text-ink">Staff by program</h2>
            <p className="text-muted text-sm mt-0.5">
              Assign staff to programs. Assigned staff only see their programs in the log form.
            </p>
          </div>

          {programs.length === 0 ? (
            <div className="card-elevated p-10 text-center text-muted">
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
                  <div key={p.id} className="card-elevated p-5 flex flex-col gap-4">
                    <div>
                      <div className="font-display text-base font-semibold text-ink">{p.name}</div>
                      <div className="text-xs text-muted mt-0.5">{assignedStaff.length} staff assigned</div>
                    </div>

                    {assignedStaff.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {assignedStaff.map((s) => {
                          const removeAction = removeStaffFromProgram.bind(null, p.id, s.id);
                          const stats = compliance.find((c) => c.id === s.id);
                          const tone = !stats || stats.submitted === 0 ? "text-muted"
                            : stats.rate >= 90 ? "text-success"
                            : stats.rate >= 75 ? "text-amber-600" : "text-red-600";
                          return (
                            <div key={s.id} className="flex items-center gap-2.5 bg-surface border border-line rounded-xl px-3 py-2">
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
                        <select name="profile_id" className="field-input flex-1 min-w-0">
                          <option value="">Select staff…</option>
                          {available.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-cta btn-sm flex-shrink-0">
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

        {/* ── SECTION 3 — Log compliance ── */}
        <section>
          <div className="mb-5">
            <h2 className="font-display text-xl text-ink">Log compliance</h2>
            <p className="text-muted text-sm mt-0.5">Share of each staff member&apos;s submitted logs that has been approved.</p>
          </div>

          {activeStaff.length === 0 ? (
            <div className="card-elevated p-10 text-center text-muted">
              No active staff accounts yet.
            </div>
          ) : (
            <>
              <div className="card-elevated overflow-hidden mb-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f2f5f2]">
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Staff member</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Programs</th>
                      <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Submitted</th>
                      <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Approved</th>
                      <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Pending</th>
                      <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f7f5]">
                    {compliance
                      .filter((s) => s.active !== false)
                      .sort((a, b) => b.submitted - a.submitted)
                      .map((s) => {
                        const tone = s.submitted === 0 ? "text-muted"
                          : s.rate >= 90 ? "text-success"
                          : s.rate >= 75 ? "text-amber-600" : "text-red-600";
                        const bar  = s.rate >= 90 ? "bg-lime-deep"
                          : s.rate >= 75 ? "bg-amber-400" : "bg-red-400";
                        const myPrograms = programStaff
                          .filter((ps) => ps.profile_id === s.id)
                          .map((ps) => programs.find((p) => p.id === ps.program_id)?.name)
                          .filter(Boolean);
                        return (
                          <tr key={s.id} className="hover:bg-surface transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-green text-lime flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                                  {initials(s.full_name)}
                                </div>
                                <span className="font-semibold">{s.full_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {myPrograms.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {myPrograms.map((name, i) => (
                                    <span key={i} className="badge-lime">{name}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-mono">{s.submitted}</td>
                            <td className="px-6 py-4 text-right font-mono">{s.approved}</td>
                            <td className="px-6 py-4 text-right">
                              {s.pending > 0
                                ? <span className="font-mono text-amber-600">{s.pending}</span>
                                : <span className="font-mono text-muted">—</span>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
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
              <div className="card-elevated p-6">
                <h3 className="font-display text-lg text-ink mb-3">Team health</h3>
                <div className="bg-surface border border-dashed border-line rounded-xl p-4 text-sm leading-relaxed">
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
