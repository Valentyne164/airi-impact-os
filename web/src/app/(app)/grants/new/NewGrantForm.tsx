"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractCommitments } from "@/lib/impact";
import type { Metric } from "@/types/database";
import { createGrant } from "./actions";

const SAMPLE =
  "This Agreement between AIRI Foundation and the Government Partner sets out that the grantee will train 500 participants in practical AI skills, deliver 25 workshops across the funding period, ensure at least 40% women participation, and spend under $150,000 in total program costs.";

interface Props {
  programs: Array<{ id: string; name: string }>;
  allMetrics: Metric[];
}

export default function NewGrantForm({ programs, allMetrics }: Props) {
  const router = useRouter();

  const [name, setName]               = useState("");
  const [programId, setProgramId]     = useState("");
  const [funderName, setFunderName]   = useState("");
  const [funderEmail, setFunderEmail] = useState("");
  const [amount, setAmount]           = useState("");
  const [termStart, setTermStart]     = useState("");
  const [termEnd, setTermEnd]         = useState("");
  const [nextReport, setNextReport]       = useState("");
  const [midReport, setMidReport]         = useState("");
  const [finalReport, setFinalReport]     = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [error, setError]             = useState("");
  const [pending, setPending]         = useState(false);

  const filteredMetrics    = allMetrics.filter((m) => m.program_id === programId);
  const previewCommitments = agreementText.trim()
    ? extractCommitments(agreementText, filteredMetrics)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim())        { setError("Grant name is required."); return; }
    if (!programId.trim())   { setError("A program must be selected — commitments can't link to metrics without one."); return; }
    if (!funderName.trim())  { setError("Funder name is required."); return; }
    if (!finalReport.trim()) { setError("Final report date is required."); return; }
    setError("");
    setPending(true);
    const fd = new FormData();
    fd.set("name",              name.trim());
    fd.set("program_id",        programId);
    fd.set("funder_name",       funderName.trim());
    fd.set("funder_email",      funderEmail.trim());
    fd.set("amount",            amount);
    fd.set("term_start",        termStart);
    fd.set("term_end",          termEnd);
    fd.set("next_report",       nextReport);
    fd.set("mid_report_date",   midReport);
    fd.set("final_report_date", finalReport);
    fd.set("agreement_text",    agreementText.trim());
    try {
      await createGrant(fd);
    } catch (err: unknown) {
      if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
      setError("Something went wrong. Please try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-6 items-start">

        {/* ── LEFT: form ── */}
        <div className="card-elevated p-8 space-y-5">

          <div>
            <label className="field-label">Grant name *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Skills Training Grant"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">
              Linked program <span className="text-red-500 normal-case font-bold">*</span>
            </label>
            <select
              value={programId} onChange={(e) => setProgramId(e.target.value)}
              className="field-input"
            >
              <option value="">— Select a program —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Funder</label>
              <input value={funderName} onChange={(e) => setFunderName(e.target.value)}
                placeholder="Funder name" className="field-input" />
            </div>
            <div>
              <label className="field-label">Funder email</label>
              <input type="email" value={funderEmail} onChange={(e) => setFunderEmail(e.target.value)}
                placeholder="reports@funder.org" className="field-input" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="field-label">Amount ($)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="150000" className="field-input font-mono" />
            </div>
            <div>
              <label className="field-label">Term start</label>
              <input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)}
                className="field-input" />
            </div>
            <div>
              <label className="field-label">Term end</label>
              <input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)}
                className="field-input" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="field-label">
                First report <span className="normal-case font-normal text-muted">(optional)</span>
              </label>
              <input type="date" value={nextReport} onChange={(e) => setNextReport(e.target.value)}
                className="field-input" />
            </div>
            <div>
              <label className="field-label">
                Mid report <span className="normal-case font-normal text-muted">(optional)</span>
              </label>
              <input type="date" value={midReport} onChange={(e) => setMidReport(e.target.value)}
                className="field-input" />
            </div>
            <div>
              <label className="field-label">
                Final report <span className="text-red-500 font-bold normal-case">*</span>
              </label>
              <input type="date" value={finalReport} onChange={(e) => setFinalReport(e.target.value)}
                required className="field-input" />
            </div>
          </div>

          <div>
            <label className="field-label">Grant agreement</label>
            <p className="text-sm text-muted mb-2.5 leading-relaxed">
              Paste the agreement once. Commitments are extracted and{" "}
              <strong className="text-ink font-semibold">locked to this grant</strong> — you never
              paste it again to check progress.
            </p>
            <textarea
              value={agreementText} onChange={(e) => setAgreementText(e.target.value)}
              placeholder="e.g. The grantee will train 500 participants, deliver 25 workshops…"
              className="field-input min-h-[100px] resize-y"
            />
            <button type="button" onClick={() => setAgreementText(SAMPLE)}
              className="btn btn-ghost btn-sm mt-2">
              Use sample text
            </button>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={pending} className="btn btn-primary">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {pending ? "Creating…" : "Create grant"}
            </button>
            <button type="button" onClick={() => router.push("/grants")} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>

        {/* ── RIGHT: commitments preview ── */}
        <div className="sticky top-24">
          <div className="card-elevated p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg text-ink">Commitments to lock in</h3>
              <span className={previewCommitments.length > 0 ? "badge-green" : "badge-muted"}>
                {previewCommitments.length}
              </span>
            </div>

            {previewCommitments.length > 0 ? (
              <div className="space-y-2">
                {previewCommitments.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface rounded-xl px-4 py-3">
                    <span className="text-sm font-medium text-ink">{c.label}</span>
                    <strong className="font-mono text-sm text-ink ml-3 flex-shrink-0">
                      {c.kind === "percent"
                        ? `${c.target}%`
                        : c.kind === "budget"
                        ? `$${c.target.toLocaleString()}`
                        : c.target}
                    </strong>
                  </div>
                ))}
                {!programId && (
                  <div className="flex items-start gap-2 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Not linked to a program — impact commitments will track once you link one.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted leading-relaxed">
                Paste the agreement text to see the commitments that will be extracted and locked to this grant.
              </p>
            )}
          </div>
        </div>

      </div>
    </form>
  );
}
