import { getApprovedLogs, getAttachments, getPrograms } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import EvidenceList from "./EvidenceList";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const [logs, attachments, programs] = await Promise.all([
    getApprovedLogs(), getAttachments(), getPrograms(),
  ]);

  const admin = createAdminClient();

  // Build a set of log IDs that have at least one attachment
  const attachedLogIds = new Set(attachments.map((a) => a.log_id).filter(Boolean));

  // Generate signed URLs (1 h) for each attachment — bucket is private, public URLs 404
  const signedUrls: Record<string, string> = {};
  await Promise.all(
    attachments
      .filter((a) => a.storage_path)
      .map(async (a) => {
        const { data } = await admin.storage
          .from("evidence")
          .createSignedUrl(a.storage_path, 3600);
        if (data?.signedUrl) signedUrls[a.id] = data.signedUrl;
      }),
  );

  const attachmentsWithUrls = attachments.map((a) => ({
    id: a.id,
    log_id: a.log_id,
    file_name: a.file_name,
    kind: a.kind,
    url: signedUrls[a.id] ?? null,
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
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">Evidence Repository</h1>
        <p className="page-subtitle">Proof behind every verified outcome — ready when funders ask.</p>
      </div>

      <EvidenceList logs={evidenceLogs} />
    </div>
  );
}
