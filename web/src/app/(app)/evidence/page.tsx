import { getApprovedLogs, getAttachments, getPrograms } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import EvidenceList from "./EvidenceList";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const [logs, attachments, programs] = await Promise.all([
    getApprovedLogs(), getAttachments(), getPrograms(),
  ]);

  const supabase = await createClient();

  // Build a set of log IDs that have at least one attachment
  const attachedLogIds = new Set(attachments.map((a) => a.log_id).filter(Boolean));

  // Pair each attachment with its public storage URL
  const attachmentsWithUrls = attachments.map((a) => ({
    id: a.id,
    log_id: a.log_id,
    file_name: a.file_name,
    kind: a.kind,
    url: a.storage_path
      ? supabase.storage.from("evidence").getPublicUrl(a.storage_path).data.publicUrl
      : null,
  }));

  // Build the evidence log list (approved logs that have attachments)
  const evidenceLogs = logs
    .filter((l) => attachedLogIds.has(l.id))
    .sort((a, b) => (a.log_date < b.log_date ? 1 : -1))
    .map((l) => ({
      id: l.id,
      log_date: l.log_date,
      narrative: l.narrative,
      programName: programs.find((p) => p.id === l.program_id)?.name ?? "—",
      attachments: attachmentsWithUrls.filter((a) => a.log_id === l.id),
    }));

  return (
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Evidence Repository</h1>
        <p className="text-muted text-sm">
          Proof behind every verified outcome — ready when funders ask.
        </p>
      </div>

      <EvidenceList logs={evidenceLogs} />
    </div>
  );
}
