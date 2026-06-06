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
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Activity Log</h1>
        <p className="text-muted text-sm">Full audit trail of who did what, and when.</p>
      </div>

      <div className="p-8 max-w-3xl">
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-muted mb-3">
            Audit trail
          </div>

          {rows.length === 0 ? (
            <div className="py-10 text-center text-muted">
              <svg className="w-9 h-9 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <p className="font-display text-base">No activity yet</p>
              <p className="text-sm mt-1">Actions like approvals, log submissions and reminders will appear here.</p>
            </div>
          ) : (
            <div>
              {rows.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 py-3 ${i < rows.length - 1 ? "border-b border-line" : ""}`}
                >
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
