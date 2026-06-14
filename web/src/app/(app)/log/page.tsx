import { getPrograms, getMetrics, getAllLogs, getProfile, getProgramStaff, getGrants, getCommitments } from "@/lib/data";
import LogForm from "./LogForm";
import EvidenceSubmitForm from "./EvidenceSubmitForm";
import type { OutcomeOption } from "./EvidenceSubmitForm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { edit?: string };
}

export default async function LogPage({ searchParams }: Props) {
  const [profile, programs, metrics, programStaff, grants, allCommitments] = await Promise.all([
    getProfile(), getPrograms(), getMetrics(), getProgramStaff(), getGrants(), getCommitments(),
  ]);

  if (!profile) redirect("/login");

  // Filter programs to only those assigned to this staff member.
  // If the staff member has no assignments at all, show every program as fallback.
  const myAssignments = programStaff.filter((ps) => ps.profile_id === profile.id);
  const visiblePrograms =
    myAssignments.length > 0
      ? programs.filter((p) => myAssignments.some((a) => a.program_id === p.id))
      : programs;

  // Outcome commitments for this staff member's programs
  const visibleProgramIds = new Set(visiblePrograms.map((p) => p.id));
  const visibleGrants = grants.filter((g) => g.program_id && visibleProgramIds.has(g.program_id));
  const visibleGrantIds = new Set(visibleGrants.map((g) => g.id));
  const outcomeOptions: OutcomeOption[] = allCommitments
    .filter((c) => c.type === "outcome" && visibleGrantIds.has(c.grant_id))
    .map((c) => {
      const grant = visibleGrants.find((g) => g.id === c.grant_id);
      const program = programs.find((p) => p.id === grant?.program_id);
      return { id: c.id, label: c.label, programName: program?.name ?? "Unknown program" };
    });

  let editLog = null;
  if (searchParams.edit) {
    const logs = await getAllLogs();
    const found = logs.find(
      (l) => l.id === searchParams.edit && l.staff_id === profile.id,
    );
    if (found) {
      editLog = {
        id:            found.id,
        program_id:    found.program_id,
        log_date:      found.log_date,
        narrative:     found.narrative,
        evidence_note: found.evidence_note,
        manager_note:  found.manager_note,
        values:        found.values,
      };
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">
          {editLog ? "Revise Log" : "Submit Daily Log"}
        </h1>
        <p className="page-subtitle">
          Your submission goes to your manager for verification before it counts.
        </p>
      </div>

      <div className="page-body">
        {visiblePrograms.length === 0 ? (
          <div className="card-elevated p-10 text-center text-muted">
            <p>
              {programs.length === 0
                ? "No programs set up yet — your manager needs to create one first."
                : "You have not been assigned to any programs yet — ask your manager to assign you in Team settings."}
            </p>
          </div>
        ) : (
          <div className="space-y-12">

            {/* ── Section 1: Daily log ── */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-6 h-6 rounded-full bg-green text-lime flex items-center justify-center font-mono font-bold text-[11px] flex-shrink-0">
                  1
                </span>
                <h2 className="font-display text-lg text-ink">Daily Activity Log</h2>
              </div>
              <LogForm
                programs={visiblePrograms}
                allMetrics={metrics}
                editLog={editLog}
                today={today}
              />
            </section>

            {/* ── Section 2: Outcome evidence (only shown when outcome commitments exist) ── */}
            {outcomeOptions.length > 0 && (
              <section>
                <div className="border-t border-line mb-10" />
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center font-mono font-bold text-[11px] flex-shrink-0">
                    2
                  </span>
                  <h2 className="font-display text-lg text-ink">Outcome Evidence</h2>
                  <span className="text-xs text-muted">— separate submission, saves independently</span>
                </div>
                <EvidenceSubmitForm outcomes={outcomeOptions} />
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
