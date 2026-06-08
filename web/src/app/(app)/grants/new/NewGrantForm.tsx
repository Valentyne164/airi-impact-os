"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractCommitments } from "@/lib/impact";
import type { Metric } from "@/types/database";
import { createGrant } from "./actions";

const SAMPLE =
  "This Agreement between AIRI Foundation and the Government Partner sets out that the grantee will train 500 participants in practical AI skills, deliver 25 workshops across the funding period, ensure at least 40% women participation, and spend under $150,000 in total program costs.";

const INPUT =
  "w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10";

interface Props {
  programs: Array<{ id: string; name: string }>;
  allMetrics: Metric[];
}

export default function NewGrantForm({ programs, allMetrics }: Props) {
  const router = useRouter();

  const [name, setName]             = useState("");
  const [programId, setProgramId]   = useState("");
  const [funderName, setFunderName] = useState("");
  const [funderEmail, setFunderEmail] = useState("");
  const [amount, setAmount]         = useState("");
  const [termStart, setTermStart]   = useState("");
  const [termEnd, setTermEnd]       = useState("");
  const [nextReport, setNextReport] = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [error, setError]           = useState("");
  const [pending, setPending]       = useState(false);

  // Live preview — extract commitments from agreement text + linked program's metrics
  const filteredMetrics = allMetrics.filter((m) => m.program_id === programId);
  const previewCommitments = agreementText.trim()
    ? extractCommitments(agreementText, filteredMetrics)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim())       { setError("Grant name is required."); return; }
    if (!funderName.trim()) { setError("Funder name is required."); return; }
    setError("");
    setPending(true);
    const fd = new FormData();
    fd.set("name",           name.trim());
    fd.set("program_id",     programId);
    fd.set("funder_name",    funderName.trim());
    fd.set("funder_email",   funderEmail.trim());
    fd.set("amount",         amount);
    fd.set("term_start",     termStart);
    fd.set("term_end",       termEnd);
    fd.set("next_report",    nextReport);
    fd.set("agreement_text", agreementText.trim());
    try {
      await createGrant(fd);
    } catch (err: unknown) {
      // redirect() throws NEXT_REDIRECT — Next.js handles navigation, just swallow it
      if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
      setError("Something went wrong. Please try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-6 items-start">

        {/* ── LEFT: form ── */}
        <div className="bg-white border border-line rounded-2xl p-5">
          <h3 className="font-display text-lg mb-4">New grant</h3>

          <label className="block font-semibold text-sm mb-1.5">Grant name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AI Skills Training Grant"
            className={`${INPUT} mb-3`}
          />

          <label className="block font-semibold text-sm mb-1.5">Linked program</label>
          <select
            value={programId} onChange={(e) => setProgramId(e.target.value)}
            className={`${INPUT} mb-3`}
          >
            <option value="">Not linked yet</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block font-semibold text-sm mb-1.5">Funder</label>
              <input value={funderName} onChange={(e) => setFunderName(e.target.value)}
                placeholder="Funder name" className={INPUT} />
            </div>
            <div>
              <label className="block font-semibold text-sm mb-1.5">Funder email</label>
              <input type="email" value={funderEmail} onChange={(e) => setFunderEmail(e.target.value)}
                placeholder="reports@funder.org" className={INPUT} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block font-semibold text-sm mb-1.5">Amount ($)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="150000" className={INPUT} />
            </div>
            <div>
              <label className="block font-semibold text-sm mb-1.5">Term start</label>
              <input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)}
                className={INPUT} />
            </div>
            <div>
              <label className="block font-semibold text-sm mb-1.5">Term end</label>
              <input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)}
                className={INPUT} />
            </div>
          </div>

          <label className="block font-semibold text-sm mb-1.5">First report date</label>
          <input type="date" value={nextReport} onChange={(e) => setNextReport(e.target.value)}
            className={`${INPUT} mb-4`} />

          <div className="text-xs font-bold uppercase tracking-wide text-muted mb-1">
            Grant agreement
          </div>
          <p className="text-muted text-xs mb-2.5">
            Paste the agreement once. Its commitments are extracted and{" "}
            <b className="text-ink">locked to this grant</b> — you never paste it again to check
            progress. You can update it later if the agreement changes.
          </p>
          <textarea
            value={agreementText} onChange={(e) => setAgreementText(e.target.value)}
            placeholder="e.g. The grantee will train 500 participants, deliver 25 workshops, ensure 40% women participation, and spend under $150,000."
            className={`${INPUT} min-h-[100px] resize-y mb-2`}
          />
          <button type="button" onClick={() => setAgreementText(SAMPLE)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors mb-5">
            Use sample
          </button>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={pending}
              className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 disabled:opacity-60 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {pending ? "Creating…" : "Create grant"}
            </button>
            <button type="button" onClick={() => router.push("/grants")}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl border border-line bg-paper hover:bg-white transition-colors">
              Cancel
            </button>
          </div>
        </div>

        {/* ── RIGHT: commitments preview ── */}
        <div className="sticky top-24">
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Commitments to lock in</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                previewCommitments.length > 0
                  ? "bg-[#e4f5ec] text-[#1f9d6b]"
                  : "bg-[#f3f4f6] text-muted"
              }`}>
                {previewCommitments.length}
              </span>
            </div>

            {previewCommitments.length > 0 ? (
              <>
                {previewCommitments.map((c, i) => (
                  <div key={i}
                    className="flex items-center justify-between bg-[#f7faf6] border border-line rounded-xl px-3 py-2.5 mb-2 last:mb-0">
                    <span className="text-sm font-semibold">{c.label}</span>
                    <b className="font-mono text-sm">
                      {c.kind === "percent"
                        ? `${c.target}%`
                        : c.kind === "budget"
                        ? `$${c.target.toLocaleString()}`
                        : c.target}
                    </b>
                  </div>
                ))}
                {!programId && (
                  <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Not linked to a program — impact commitments will track once you link one.
                    Budget commitments work either way.
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted text-xs italic">
                Paste the agreement to see the commitments that will be extracted and locked to
                this grant.
              </p>
            )}
          </div>
        </div>

      </div>
    </form>
  );
}
