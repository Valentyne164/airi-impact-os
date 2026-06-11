import { getActivity } from "@/lib/data";

export const dynamic = "force-dynamic";

function formatTs(iso: string) {
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return `${date} ${time}`;
}

export default async function ActivityPage() {
  const rows = await getActivity();

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">Activity Log</h1>
        <p className="page-subtitle">Full audit trail of who did what, and when.</p>
      </div>

      <div className="page-body max-w-3xl">
        <div className="card-elevated overflow-hidden">
          <div className="px-7 pt-6 pb-4">
            <p className="field-label">Audit trail</p>
          </div>

          {rows.length === 0 ? (
            <div className="px-7 pb-12 pt-4 text-center text-muted">
              <svg className="w-9 h-9 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <p className="font-display text-base">No activity yet</p>
              <p className="text-sm mt-1">Actions like approvals, log submissions and reminders will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f5f7f5]">
              {rows.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-7 py-3.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-deep mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-sm">
                    <b>{a.actor}</b> {a.text}
                  </div>
                  <span className="font-mono text-xs text-muted whitespace-nowrap flex-shrink-0 mt-0.5">
                    {formatTs(a.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
