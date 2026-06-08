import ProgramWizard from "./ProgramWizard";

export const dynamic = "force-dynamic";

export default function NewProgramPage() {
  return (
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <h1 className="font-display text-2xl">Create Program</h1>
        <p className="text-muted text-sm">
          Define a new program, its metrics, daily log and dashboard.
        </p>
      </div>
      <div className="p-8">
        <ProgramWizard />
      </div>
    </div>
  );
}
