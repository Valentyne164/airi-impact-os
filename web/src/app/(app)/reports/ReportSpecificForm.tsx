"use client";

import { useState } from "react";
import { generateSpecific } from "./actions";
import type { ReportQA } from "@/types/database";

const INPUT =
  "w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10";

const PRESETS: [string, number][] = [
  ["1 month", 1],
  ["3 months", 3],
  ["1 year", 12],
];

interface GrantOption {
  id: string;
  name: string;
  funder_name: string | null;
}

interface Props {
  programId: string;
  programGrants: GrantOption[];
  defaultFrom: string;
  defaultTo: string;
}

export default function ReportSpecificForm({
  programId,
  programGrants,
  defaultFrom,
  defaultTo,
}: Props) {
  const [grantId,    setGrantId]    = useState(programGrants[0]?.id ?? "");
  const [periodFrom, setPeriodFrom] = useState(defaultFrom);
  const [periodTo,   setPeriodTo]   = useState(defaultTo);
  const [questions,  setQuestions]  = useState("");
  const [qa,         setQa]         = useState<ReportQA[] | null>(null);
  const [pending,    setPending]    = useState(false);
  const [error,      setError]      = useState("");

  function setPreset(months: number) {
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - months);
    setPeriodFrom(from.toISOString().slice(0, 10));
    setPeriodTo(to.toISOString().slice(0, 10));
  }

  async function handleDraft() {
    if (!questions.trim()) { setError("Paste at least one funder question"); return; }
    setError("");
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("program_id", programId);
      fd.set("grant_id",    grantId);
      fd.set("period_from", periodFrom);
      fd.set("period_to",   periodTo);
      fd.set("questions",   questions);
      const result = await generateSpecific(fd);
      setQa(result.qa);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Could not draft answers");
    }
    setPending(false);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">

      {/* LEFT: controls */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="font-display text-lg mb-4">Funder report — answer their questions</h3>

        <label className="block font-semibold text-sm mb-1.5">Funder / grant</label>
        <select value={grantId} onChange={(e) => setGrantId(e.target.value)}
          className={`${INPUT} mb-4`}>
          {programGrants.length > 0
            ? programGrants.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {g.funder_name ?? "—"}
                </option>
              ))
            : <option value="">No grants for this program</option>
          }
        </select>

        <div className="flex flex-wrap gap-2 mb-2">
          {PRESETS.map(([label, m]) => (
            <button key={m} type="button" onClick={() => setPreset(m)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors">
              {label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block font-semibold text-sm mb-1.5">From</label>
            <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)}
              className={INPUT} />
          </div>
          <div>
            <label className="block font-semibold text-sm mb-1.5">To</label>
            <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)}
              className={INPUT} />
          </div>
        </div>

        <label className="block font-semibold text-sm mb-1.5">
          Paste the funder&apos;s questions{" "}
          <span className="text-muted font-normal">(one per line)</span>
        </label>
        <textarea
          value={questions} onChange={(e) => setQuestions(e.target.value)}
          placeholder={
            "What outcomes were achieved this period?\nHow was funding used?\nHow are you advancing equity?"
          }
          className={`${INPUT} min-h-[120px] resize-y mb-4`}
        />

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        <button type="button" onClick={handleDraft} disabled={pending}
          className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 disabled:opacity-60 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          {pending ? "Drafting…" : "Draft answers from verified data"}
        </button>
      </div>

      {/* RIGHT: drafted answers */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="font-display text-lg mb-4">Drafted answers</h3>
        {qa ? (
          <>
            <p className="text-muted text-xs mb-4">
              {qa.length} question{qa.length > 1 ? "s" : ""} answered from verified data — edit
              any answer, then approve in &quot;Drafts &amp; Sent&quot;.
            </p>
            {qa.map((item, i) => (
              <div key={i} className="mb-4">
                <label className="block font-semibold text-sm mb-1.5">
                  Q{i + 1}. {item.q}
                </label>
                <textarea defaultValue={item.a}
                  className={`${INPUT} min-h-[80px] resize-y`} />
              </div>
            ))}
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 mt-2">
              Saved as draft — awaiting approval
            </span>
          </>
        ) : (
          <p className="text-muted text-sm italic">
            Paste questions and draft to see grounded answers.
          </p>
        )}
      </div>

    </div>
  );
}
