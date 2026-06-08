"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { extractAndLock } from "./actions";

const SAMPLE =
  "This Agreement between AIRI Foundation and the Government Partner sets out that the grantee will train 500 participants in practical AI skills, deliver 25 workshops across the funding period, ensure at least 40% women participation, and spend under $150,000 in total program costs.";

interface Props {
  grantId: string;
  existingText: string;
  programName: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
        pending ? "opacity-60 cursor-not-allowed" : "hover:bg-green-900"
      }`}
    >
      {pending ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
          Extracting…
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Extract commitments
        </>
      )}
    </button>
  );
}

export default function AgreementForm({ grantId, existingText, programName }: Props) {
  const ref    = useRef<HTMLTextAreaElement>(null);
  const action = extractAndLock.bind(null, grantId);

  return (
    <form action={action}>
      <p className="text-muted text-sm mb-3">
        Paste the grant agreement text. The engine finds all measurable commitments and adds them to the manager below — against <b className="text-ink">{programName}</b>&apos;s verified data. You can edit or add more manually after.
      </p>
      <textarea
        ref={ref}
        name="agreement_text"
        defaultValue={existingText}
        placeholder="e.g. The grantee will train 500 participants, deliver 25 workshops, ensure 40% women participation, and spend under $150,000."
        className="w-full min-h-[120px] px-3 py-2.5 border border-line rounded-xl text-sm resize-y focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
      />
      <div className="flex flex-wrap gap-2 mt-2">
        <SubmitButton />
        <button
          type="button"
          onClick={() => { if (ref.current) ref.current.value = SAMPLE; }}
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-line bg-paper hover:bg-white transition-colors"
        >
          Load sample
        </button>
      </div>
      <p className="text-muted text-[11px] mt-2">
        Extracts: headcount targets · session counts · gender equity % · retention rates · communities reached · certifications · budget caps. Missed something? Add it manually below.
      </p>
    </form>
  );
}
