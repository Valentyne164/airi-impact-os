import Link from "next/link";
import { getGrants, getCommitments, getPrograms, getMetrics } from "@/lib/data";
import GrantSelector from "./GrantSelector";
import AgreementForm from "./AgreementForm";
import CommitmentManager from "./CommitmentManager";

export const dynamic = "force-dynamic";

export default async function AgreementPage({
  searchParams,
}: {
  searchParams: { grant?: string; fallback?: string; reason?: string };
}) {
  const [grants, allCommitments, programs, allMetrics] = await Promise.all([
    getGrants(), getCommitments(), getPrograms(), getMetrics(),
  ]);

  if (!grants.length) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="page-header">
          <h1 className="font-display text-3xl text-ink leading-none">Agreement Engine</h1>
          <p className="page-subtitle">
            Define what a grant asks for — commitments track automatically against your verified data.
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[70vh] px-8">
          <div className="text-center max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-success-light grid place-items-center mx-auto mb-7">
              <svg className="w-7 h-7 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl text-ink mb-3">No grants yet</h2>
            <p className="text-base text-muted leading-relaxed">
              Create a grant first, then come back to define its commitments.
            </p>
            <Link href="/grants/new" className="btn btn-cta mt-7">
              Create a grant
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const showFallbackBanner = searchParams.fallback === "1";
  const fallbackReason = searchParams.reason;
  const selectedId     = searchParams.grant ?? grants[0].id;
  const grant          = grants.find((g) => g.id === selectedId) ?? grants[0];
  const commitments    = allCommitments.filter((c) => c.grant_id === grant.id);
  const program        = programs.find((p) => p.id === grant.program_id);
  const programMetrics = allMetrics
    .filter((m) => m.program_id === grant.program_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">Agreement Engine</h1>
        <p className="page-subtitle">
          Define what a grant requires — commitments track automatically against your verified data.
        </p>
      </div>

      {showFallbackBanner && (
        <div className="px-6 md:px-10">
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 leading-relaxed max-w-3xl">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>
              <strong className="font-semibold">AI extraction unavailable</strong> — commitments were extracted using
              pattern matching instead. Results may be less accurate. Check your{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">ANTHROPIC_API_KEY</code> environment variable.
              {fallbackReason && (
                <span className="block mt-1.5 font-mono text-xs break-all text-amber-900">
                  Error: {fallbackReason}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="page-body max-w-3xl space-y-6">

        {/* ── Grant selector + Agreement text ── */}
        <div className="card-elevated overflow-hidden">

          {/* Grant picker */}
          <div className="px-8 pt-7 pb-6 border-b border-[#f2f5f2]">
            <label className="field-label">Grant</label>
            <GrantSelector grants={grants} selectedId={grant.id} />

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {program ? (
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  <span>{program.name}</span>
                </span>
              ) : (
                <span className="text-amber-600 text-xs font-semibold">
                  No linked program — commitments won&apos;t auto-track until you link one in Grants.
                </span>
              )}
              <span className="ml-auto badge-green">
                {commitments.length} commitment{commitments.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Agreement text — collapsible */}
          <details
            open={!grant.agreement_text || commitments.length === 0}
            className="group"
          >
            <summary className="flex items-center justify-between gap-3 px-8 py-5 cursor-pointer select-none hover:bg-surface transition-colors list-none">
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span className="text-sm font-semibold text-ink">
                  {grant.agreement_text
                    ? "Agreement text — click to edit or re-extract"
                    : "Paste agreement text to auto-extract commitments"}
                </span>
              </div>
              <svg className="w-4 h-4 text-muted transition-transform group-open:rotate-180 flex-shrink-0"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </summary>

            <div className="px-8 pb-8 pt-2 border-t border-[#f2f5f2]">
              {grant.agreement_text && (
                <blockquote className="text-muted text-xs leading-relaxed mb-5 bg-surface rounded-xl px-4 py-3 max-h-20 overflow-y-auto italic border-l-2 border-line">
                  {grant.agreement_text.slice(0, 320)}
                  {grant.agreement_text.length > 320 ? "…" : ""}
                </blockquote>
              )}
              <AgreementForm
                grantId={grant.id}
                existingText={grant.agreement_text ?? ""}
                programName={program?.name ?? "(no linked program)"}
              />
            </div>
          </details>
        </div>

        {/* ── Manage commitments ── */}
        <CommitmentManager commitments={commitments} grantId={grant.id} metrics={programMetrics} />

      </div>
    </div>
  );
}
