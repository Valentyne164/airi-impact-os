import Link from "next/link";
import {
  getGrants, getCommitments, getMetrics, getApprovedLogs, getExpenses, getPrograms,
} from "@/lib/data";
import { commitmentActual, agreementHealth, agreementSummary } from "@/lib/impact";
import GrantSelector from "./GrantSelector";
import AgreementForm from "./AgreementForm";
import CommitmentManager from "./CommitmentManager";

export const dynamic = "force-dynamic";

export default async function AgreementPage({
  searchParams,
}: {
  searchParams: { grant?: string };
}) {
  const [grants, allCommitments, allMetrics, logs, expenses, programs] = await Promise.all([
    getGrants(), getCommitments(), getMetrics(), getApprovedLogs(), getExpenses(), getPrograms(),
  ]);

  if (!grants.length) {
    return (
      <div>
        <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
          <h1 className="font-display text-2xl">Agreement Engine</h1>
          <p className="text-muted text-sm">Extract commitments from a grant agreement and track them automatically.</p>
        </div>
        <div className="p-8">
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted">
            <p className="font-display text-lg">No grants yet</p>
            <p className="text-sm mt-1">
              <Link href="/grants" className="text-green underline">Add a grant</Link> first, then come back here to set its commitments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedId  = searchParams.grant ?? grants[0].id;
  const grant       = grants.find((g) => g.id === selectedId) ?? grants[0];

  const commitments = allCommitments.filter((c) => c.grant_id === grant.id);
  const metrics     = allMetrics.filter((m) => m.program_id === grant.program_id);
  const program     = programs.find((p) => p.id === grant.program_id);
  const ctx         = { metrics, logs, grant, expenses };

  const h       = agreementHealth(commitments, ctx);
  const summary = commitments.length > 0 ? agreementSummary(grant, commitments, ctx) : "";

  const StatusBadge = ({ pct, met }: { pct: number; met: boolean }) => {
    if (met)       return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e4f5ec] text-[#1f9d6b] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-current"/>Met</span>;
    if (pct >= 65) return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-current"/>On track</span>;
    return           <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-current"/>Behind</span>;
  };

  return (
    <div>
      {/* ── Sticky header ── */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Agreement Engine</h1>
        <p className="text-muted text-sm">Extract commitments from a grant agreement and track them automatically.</p>
      </div>

      <div className="p-8 space-y-5">

        {/* ── Grant picker + collapsible text editor ── */}
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Select grant</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e3f0e9] text-green">
              {commitments.length > 0
                ? `${commitments.length} commitment${commitments.length !== 1 ? "s" : ""} active`
                : "No commitments yet"}
            </span>
          </div>

          <label className="block font-semibold text-sm mb-1">Grant</label>
          <GrantSelector grants={grants} selectedId={grant.id} />

          {/* Collapsible agreement text editor — open by default when no text exists */}
          <details
            open={!grant.agreement_text || commitments.length === 0}
            className="mt-4 group"
          >
            <summary className="flex items-center justify-between cursor-pointer list-none select-none py-2 px-3 rounded-xl hover:bg-paper transition-colors">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <span className="font-semibold text-sm">
                  {grant.agreement_text ? "Agreement text — click to edit or re-extract" : "Paste agreement text to extract commitments"}
                </span>
              </div>
              {/* Chevron rotates when open */}
              <svg
                className="w-4 h-4 text-muted transition-transform group-open:rotate-180"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </summary>

            <div className="pt-3 border-t border-line mt-2">
              {grant.agreement_text && (
                <p className="text-muted text-xs italic leading-relaxed mb-3 bg-[#f5f8f5] rounded-lg px-3 py-2 max-h-16 overflow-y-auto">
                  &ldquo;{grant.agreement_text.slice(0, 280)}{grant.agreement_text.length > 280 ? "…" : ""}&rdquo;
                </p>
              )}
              <AgreementForm
                grantId={grant.id}
                existingText={grant.agreement_text ?? ""}
                programName={program?.name ?? "(no linked program)"}
              />
            </div>
          </details>
        </div>

        {/* ── Progress view (only when commitments exist) ── */}
        {commitments.length > 0 && (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
              {/* Agreement health hero tile */}
              <div className="rounded-2xl p-5 shadow-sm" style={{ background: "linear-gradient(135deg,#084734,#0a5a42)" }}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "#bfe0cf" }}>Agreement health</div>
                <div className="font-mono font-semibold mt-2 leading-none" style={{ fontSize: "1.95rem", color: "#fff" }}>
                  {h.overall}<span className="text-base font-normal" style={{ color: "#bfe0cf" }}>%</span>
                </div>
                <div className="text-sm font-semibold mt-1" style={{ color: "#cef17b" }}>
                  {h.met} of {h.total} commitments met
                </div>
                <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ background: "rgba(255,255,255,.2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${h.overall}%`, background: "#cef17b" }} />
                </div>
              </div>

              {/* Per-commitment tiles */}
              {commitments.map((c) => {
                const r     = commitmentActual(c, ctx);
                const parts = r.display.split(" / ");
                const tone  = r.met ? "text-[#1f9d6b]" : r.pct >= 65 ? "text-amber-600" : "text-red-600";
                const barBg = r.met
                  ? "linear-gradient(90deg,#acd84e,#cef17b)"
                  : "linear-gradient(90deg,#084734,#0a5a42)";
                return (
                  <div key={c.id} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-muted">{c.label}</div>
                    <div className="font-mono text-[1.95rem] font-semibold mt-2 leading-none">
                      {parts[0]}
                      {parts[1] && <span className="text-base font-normal text-muted"> / {parts[1]}</span>}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${tone}`}>
                      {Math.min(999, r.pct)}% · {r.met ? "met" : r.pct >= 65 ? "on track" : "behind"}
                    </div>
                    <div className="h-2 bg-[#eef2ee] rounded-full mt-2.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.pct)}%`, background: barBg }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Two-column: bar chart + plain-language summary */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Bar chart */}
              <div className="bg-white border border-line rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg">Commitment progress</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e3f0e9] text-green">vs verified data</span>
                </div>
                <div className="flex items-end gap-4 h-48 pt-3 px-1">
                  {commitments.map((c) => {
                    const r   = commitmentActual(c, ctx);
                    const pct = Math.min(100, r.pct);
                    return (
                      <div key={c.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className={`font-mono text-xs font-semibold ${r.met ? "text-[#1f9d6b]" : ""}`}>
                          {Math.min(999, r.pct)}%
                        </span>
                        <div className="w-full max-w-[50px] bg-[#eef2ee] rounded-t-xl h-full flex items-end overflow-hidden">
                          <div
                            className="w-full rounded-t-xl min-h-[4px]"
                            style={{
                              height: `${Math.max(4, pct)}%`,
                              background: r.met
                                ? "linear-gradient(180deg,#cef17b,#acd84e)"
                                : "linear-gradient(180deg,#0a5a42,#084734)",
                            }}
                          />
                        </div>
                        <span className="text-muted text-[11px] font-semibold text-center leading-tight max-w-[60px]">
                          {c.label.split(" ").slice(0, 2).join(" ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plain-language summary + detail table */}
              <div className="bg-white border border-line rounded-2xl p-5">
                <h2 className="font-display text-lg mb-3">Plain-language summary</h2>
                <div className="bg-[#fafdf8] border border-dashed border-[#cdd9ce] rounded-xl p-4 text-sm leading-relaxed text-ink mb-4">
                  {summary}
                </div>

                <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Commitment detail</div>
                <table className="w-full text-sm">
                  <thead className="text-muted text-xs uppercase tracking-wide">
                    <tr className="border-b border-line">
                      <th className="text-left py-2">Commitment</th>
                      <th className="text-right py-2">Verified</th>
                      <th className="text-right py-2">%</th>
                      <th className="text-left py-2 pl-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commitments.map((c) => {
                      const r = commitmentActual(c, ctx);
                      return (
                        <tr key={c.id} className="border-b border-line last:border-0">
                          <td className="py-2">
                            <div className="font-semibold">{c.label}</div>
                            <div className="text-muted text-xs">{r.sub} · from {r.src}</div>
                          </td>
                          <td className="py-2 text-right font-mono">{r.display.split(" / ")[0]}</td>
                          <td className="py-2 text-right font-mono">{Math.min(999, r.pct)}%</td>
                          <td className="py-2 pl-3"><StatusBadge pct={r.pct} met={r.met} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Commitment manager — always visible ── */}
        <CommitmentManager commitments={commitments} grantId={grant.id} />

      </div>
    </div>
  );
}
