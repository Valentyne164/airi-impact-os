import { submitOutcomeEvidence } from "./actions";

export interface OutcomeOption {
  id: string;
  label: string;
  programName: string;
}

export default function EvidenceSubmitForm({ outcomes }: { outcomes: OutcomeOption[] }) {
  if (outcomes.length === 0) return null;

  return (
    <form action={submitOutcomeEvidence}>
      <div className="card-elevated overflow-hidden">
        <div className="px-7 pt-6 pb-5 border-b border-[#f2f5f2]">
          <h3 className="font-display text-xl text-ink">Submit Outcome Evidence</h3>
          <p className="text-sm text-muted mt-1">
            Describe evidence for a grant outcome — your manager will review and approve it.
          </p>
        </div>

        <div className="px-7 py-6 space-y-4">
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

          <button type="submit" className="btn btn-primary">
            Submit for review
          </button>
        </div>
      </div>
    </form>
  );
}
