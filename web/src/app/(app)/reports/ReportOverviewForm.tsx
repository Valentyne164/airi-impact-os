"use client";

import { useState } from "react";
import { generateOverview } from "./actions";

const PRESETS: [string, number][] = [
  ["1 month", 1],
  ["3 months", 3],
  ["1 year", 12],
  ["2 years", 24],
];

interface Props {
  programId: string;
  defaultFrom: string;
  defaultTo: string;
}

export default function ReportOverviewForm({ programId, defaultFrom, defaultTo }: Props) {
  const [periodFrom, setPeriodFrom] = useState(defaultFrom);
  const [periodTo,   setPeriodTo]   = useState(defaultTo);
  const [extraCtx,   setExtraCtx]   = useState("");
  const [preview,    setPreview]    = useState<string | null>(null);
  const [pending,    setPending]    = useState(false);
  const [error,      setError]      = useState("");

  function setPreset(months: number) {
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - months);
    setPeriodFrom(from.toISOString().slice(0, 10));
    setPeriodTo(to.toISOString().slice(0, 10));
  }

  async function handleGenerate() {
    setError("");
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("program_id", programId);
      fd.set("period_from", periodFrom);
      fd.set("period_to",   periodTo);
      fd.set("extra_ctx",   extraCtx);
      const result = await generateOverview(fd);
      setPreview(result.body);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Could not generate overview");
    }
    setPending(false);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">

      {/* LEFT: controls */}
      <div className="card-elevated p-7">
        <h3 className="font-display text-xl text-ink mb-1">Project Overview generator</h3>
        <p className="text-muted text-sm mb-5 leading-relaxed">
          A reusable, funder-agnostic overview built from verified data — solid enough to adapt
          into future grant proposals.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map(([label, m]) => (
            <button key={m} type="button" onClick={() => setPreset(m)}
              className="btn btn-secondary btn-sm">
              {label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <div>
            <label className="field-label">From</label>
            <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)}
              className="field-input" />
          </div>
          <div>
            <label className="field-label">To</label>
            <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)}
              className="field-input" />
          </div>
        </div>

        <label className="field-label">
          Extra context{" "}
          <span className="normal-case font-normal text-muted">(optional)</span>
        </label>
        <textarea
          value={extraCtx} onChange={(e) => setExtraCtx(e.target.value)}
          placeholder="Partnerships, testimonials, future plans, differentiators…"
          className="field-input min-h-[90px] resize-y mb-5"
        />

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        <button type="button" onClick={handleGenerate} disabled={pending}
          className="btn btn-primary">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          {pending ? "Generating…" : "Generate overview"}
        </button>
      </div>

      {/* RIGHT: preview */}
      <div className="card-elevated p-7">
        <h3 className="font-display text-xl text-ink mb-5">Preview</h3>
        {preview ? (
          <>
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed mb-5">
              {preview}
            </pre>
            <span className="badge-amber">Saved as draft — awaiting approval</span>
          </>
        ) : (
          <p className="text-muted text-sm italic">Generate to preview the overview.</p>
        )}
      </div>

    </div>
  );
}
