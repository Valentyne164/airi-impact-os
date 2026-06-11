import { getPrograms, getMetrics, getAllLogs, getProfile, getProgramStaff } from "@/lib/data";
import LogForm from "./LogForm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { edit?: string };
}

export default async function LogPage({ searchParams }: Props) {
  const [profile, programs, metrics, programStaff] = await Promise.all([
    getProfile(), getPrograms(), getMetrics(), getProgramStaff(),
  ]);

  if (!profile) redirect("/login");

  // Filter programs to only those assigned to this staff member.
  // If the staff member has no assignments at all, show every program as fallback.
  const myAssignments = programStaff.filter((ps) => ps.profile_id === profile.id);
  const visiblePrograms =
    myAssignments.length > 0
      ? programs.filter((p) => myAssignments.some((a) => a.program_id === p.id))
      : programs;

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
          <LogForm
            programs={visiblePrograms}
            allMetrics={metrics}
            editLog={editLog}
            today={today}
          />
        )}
      </div>
    </div>
  );
}
