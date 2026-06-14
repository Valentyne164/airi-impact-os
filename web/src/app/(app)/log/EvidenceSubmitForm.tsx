"use client";

import { useState, useTransition } from "react";
import { submitOutcomeEvidence } from "./actions";

export interface OutcomeOption {
  id: string;
  label: string;
  programName: string;
}

export default function EvidenceSubmitForm({ outcomes }: { outcomes: OutcomeOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey]       = useState(0);
  const [success, setSuccess]       = useState(false);
  const [fileName, setFileName]     = useState<string | null>(null);

  if (outcomes.length === 0) return null;

  return (
    <div className="card-elevated overflow-hidden border-l-[3px] border-amber-400">
      <div className="px-7 pt-6 pb-5 border-b border-[#f2f5f2]">
        <h3 className="font-display text-xl text-ink">Submit Outcome Evidence</h3>
        <p className="text-sm text-muted mt-1">
          Describe evidence for a grant outcome commitment — your manager will review and approve it.
          This saves independently from your daily log.
        </p>
      </div>

      <div className="px-7 py-6 space-y-4">
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-semibold">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Evidence submitted — your manager will review it shortly.
          </div>
        )}

        <form
          key={formKey}
          action={(fd) =>
            startTransition(async () => {
              await submitOutcomeEvidence(fd);
              setFormKey((k) => k + 1);
              setFileName(null);
              setSuccess(true);
            })
          }
          className="space-y-4"
        >
          <div>
            <label className="field-label">Outcome commitment</label>
            <select name="commitment_id" className="field-input">
              {outcomes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} — {o.programName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Evidence note</label>
            <textarea
              name="note"
              required
              rows={3}
              placeholder="Describe the evidence (assessment results, observed change, documentation reference…)"
              className="field-input resize-y"
            />
          </div>

          <div>
            <label className="field-label">
              Attach file{" "}
              <span className="font-normal normal-case text-muted/70">(PDF or image, optional)</span>
            </label>
            <div className="border border-dashed border-line rounded-xl px-4 py-3 hover:border-amber-400/60 transition-colors">
              <input
                type="file"
                name="evidence_file"
                accept=".pdf,image/*"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:text-sm file:font-semibold hover:file:bg-amber-100 cursor-pointer"
              />
              {fileName && (
                <p className="text-xs text-amber-700 font-medium mt-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {fileName}
                </p>
              )}
            </div>
          </div>

          <button type="submit" disabled={isPending} className="btn btn-primary">
            {isPending ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </div>
    </div>
  );
}
