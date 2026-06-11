import ProgramWizard from "./ProgramWizard";

export const dynamic = "force-dynamic";

export default function NewProgramPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">Create Program</h1>
        <p className="page-subtitle">Define a new program, its metrics, daily log and dashboard.</p>
      </div>
      <div className="page-body">
        <ProgramWizard />
      </div>
    </div>
  );
}
