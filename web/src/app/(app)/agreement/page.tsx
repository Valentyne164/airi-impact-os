import Link from "next/link";
import { getGrants, getCommitments, getPrograms, getMetrics } from "@/lib/data";
import GrantSelector from "./GrantSelector";
import AgreementForm from "./AgreementForm";
import CommitmentManager from "./CommitmentManager";

export const dynamic = "force-dynamic";

export default async function AgreementPage({
  searchParams,
}: {
  searchParams: { grant?: string };
}) {
  const [grants, allCommitments, programs, allMetrics] = await Promise.all([
    getGrants(), getCommitments(), getPrograms(), getMetrics(),
  ]);

  if (!grants.length) {
    return (
      <div>
        <div className="px-8 py-6 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
          <h1 className="font-display text-2xl">Agreement Engine</h1>
          <p className="text-muted text-sm mt-0.5">
            Define what a grant asks for — commitments track automatically against your verified data.
          </p>
        </div>
        <div className="p-8 max-w-2xl">
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted">
            <div className="w-12 h-12 rounded-2xl bg-[#e3f0e9] grid place-items-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <p className="font-display text-lg">No grants yet</p>
            <p className="text-sm mt-1 text-muted">
              <Link href="/grants/new" className="text-green underline">Create a grant</Link>{" "}
              first, then come back to define its commitments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedId     = searchParams.grant ?? grants[0].id;
  const grant          = grants.find((g) => g.id === selectedId) ?? grants[0];
  const commitments    = allCommitments.filter((c) => c.grant_id === grant.id);
  const program        = programs.find((p) => p.id === grant.program_id);
  const programMetrics = allMetrics
    .filter((m) => m.program_id === grant.program_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <h1 className="font-display text-2xl">Agreement Engine</h1>
        <p className="text-muted text-sm mt-0.5">
          Define what a grant asks for — commitments track automatically against your verified data.
        </p>
      </div>

      <div className="p-8 max-w-2xl space-y-6">

        {/* ── Grant + Agreement text ── */}
        <section className="bg-white border border-line rounded-2xl overflow-hidden">
          {/* Grant picker */}
          <div className="px-6 pt-6 pb-5 border-b border-line">
            <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-2">
              Grant
            </label>
            <GrantSelector grants={grants} selectedId={grant.id} />

            {/* Context row */}
            <div className="flex items-center gap-3 mt-3 text-sm text-muted">
              {program ? (
                <span className="flex items-center gap-1.5">
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
              <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f0f5f1] text-green">
                {commitments.length} commitment{commitments.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Agreement text editor */}
          <details
            open={!grant.agreement_text || commitments.length === 0}
            className="group"
          >
            <summary className="flex items-center justify-between gap-3 px-6 py-4 cursor-pointer select-none hover:bg-[#fafdf8] transition-colors list-none">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span className="text-sm font-semibold">
                  {grant.agreement_text
                    ? "Agreement text — click to edit or re-extract"
                    : "Paste agreement text to extract commitments"}
                </span>
              </div>
              <svg className="w-4 h-4 text-muted transition-transform group-open:rotate-180 flex-shrink-0"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </summary>

            <div className="px-6 pb-6 pt-1 border-t border-line">
              {grant.agreement_text && (
                <blockquote className="text-muted text-xs leading-relaxed mb-4 bg-[#f7faf6] rounded-xl px-4 py-3 max-h-20 overflow-y-auto italic border-l-2 border-[#cde2d5]">
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
        </section>

        {/* ── Manage commitments ── */}
        <section>
          <CommitmentManager commitments={commitments} grantId={grant.id} metrics={programMetrics} />
        </section>

      </div>
    </div>
  );
}
