"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProgram } from "./actions";

interface WizMetric {
  id: string;
  label: string;
  type: "number" | "yesno" | "text" | "percent";
  target: string;
}

const PRESETS: Array<[string, WizMetric["type"], string]> = [
  ["People reached", "number", "500"],
  ["Sessions / workshops held", "yesno", "25"],
  ["New group / cohort started", "yesno", "25"],
  ["Women & girls reached", "number", "200"],
  ["Evidence / notes", "text", ""],
];

let uid = 0;
function nextId() {
  return String(++uid);
}

export default function ProgramWizard() {
  const router = useRouter();

  const [name, setName]         = useState("");
  const [aim, setAim]           = useState("");
  const [audience, setAudience] = useState("");
  const [metrics, setMetrics]   = useState<WizMetric[]>([]);
  const [error, setError]       = useState("");
  const [pending, setPending]   = useState(false);

  function addPreset(label: string, type: WizMetric["type"], target: string) {
    if (metrics.some((m) => m.label === label)) return;
    setMetrics((prev) => [...prev, { id: nextId(), label, type, target }]);
  }

  function addBlank() {
    setMetrics((prev) => [...prev, { id: nextId(), label: "", type: "number", target: "" }]);
  }

  function updateMetric(id: string, field: keyof WizMetric, value: string) {
    setMetrics((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: value };
        if (field === "type" && value === "text") updated.target = "";
        return updated;
      }),
    );
  }

  function removeMetric(id: string) {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }

  const namedMetrics = metrics.filter((m) => m.label.trim());
  const dashMetrics  = namedMetrics.filter((m) => m.type !== "text");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Give the program a name first."); return; }
    setError("");
    setPending(true);

    const fd = new FormData();
    fd.set("name",     name.trim());
    fd.set("aim",      aim.trim());
    fd.set("audience", audience.trim());
    fd.set("metrics",  JSON.stringify(namedMetrics.map(({ label, type, target }) => ({ label, type, target }))));

    try {
      await createProgram(fd);
    } catch (err: unknown) {
      if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
      setError("Something went wrong. Please try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div>
          <div className="card-elevated p-7 mb-5">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green text-white text-xs font-bold">1</span>
              <h3 className="font-display text-xl text-ink">Create a new program</h3>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="field-label">Program name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rural AI Access Initiative"
                  className="field-input"
                />
              </div>

              <div>
                <label className="field-label">Main aim</label>
                <textarea
                  value={aim}
                  onChange={(e) => setAim(e.target.value)}
                  placeholder="What is this program trying to achieve, and why?"
                  className="field-input min-h-[80px] resize-y"
                />
              </div>

              <div>
                <label className="field-label">Who does it serve?</label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Rural communities, small business owners"
                  className="field-input"
                />
              </div>
            </div>

            <label className="field-label mb-1">What should staff record each day? <span className="font-normal normal-case text-muted/70">(optional — add now or later)</span></label>
            <p className="text-muted text-xs mb-3 leading-relaxed">
              &ldquo;What did you do today?&rdquo; is always included. Add specific fields now, or skip and add them from the program page after you&apos;ve set up the grant agreement.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {PRESETS.map(([label, type, target]) => {
                const already = metrics.some((m) => m.label === label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => addPreset(label, type, target)}
                    disabled={already}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                      ${already
                        ? "border-green/30 bg-success-light text-green/60 cursor-default"
                        : "border-line bg-paper hover:bg-green hover:text-white hover:border-green"
                      }`}
                  >
                    {already ? "✓ " : "+ "}{label}
                  </button>
                );
              })}
            </div>

            {metrics.length > 0 && (
              <div className="mb-3">
                <div className="grid grid-cols-[1.7fr_1.2fr_0.8fr_auto] gap-2 px-2 mb-1.5">
                  <span className="field-label">Field</span>
                  <span className="field-label">Type</span>
                  <span className="field-label">Target</span>
                  <span />
                </div>
                {metrics.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-[1.7fr_1.2fr_0.8fr_auto] gap-2 items-center p-2.5 bg-surface border border-line rounded-xl mb-1.5"
                  >
                    <input
                      value={m.label}
                      onChange={(e) => updateMetric(m.id, "label", e.target.value)}
                      placeholder="e.g. People reached"
                      className="field-input-sm"
                    />
                    <select
                      value={m.type}
                      onChange={(e) => updateMetric(m.id, "type", e.target.value)}
                      className="field-input-sm"
                    >
                      <option value="number">A number to add up</option>
                      <option value="yesno">A yes/no to tally</option>
                      <option value="percent">A percentage to average</option>
                      <option value="text">A note or link</option>
                    </select>
                    {m.type === "text" ? (
                      <span className="text-muted text-xs px-2">no target</span>
                    ) : (
                      <input
                        type="number"
                        value={m.target}
                        onChange={(e) => updateMetric(m.id, "target", e.target.value)}
                        placeholder="target"
                        className="field-input-sm"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMetric(m.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addBlank}
              className="btn btn-ghost btn-sm border border-dashed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add my own
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={pending} className="btn btn-primary">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {pending ? "Creating…" : "Create program"}
            </button>
            <button type="button" onClick={() => router.push("/programs")} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Live preview ── */}
        <div className="sticky top-24">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg text-ink">Live preview</h3>
              <span className="badge-blue">Updates as you type</span>
            </div>

            <label className="field-label mb-2">The daily log staff will fill in</label>
            <div className="bg-surface border border-line rounded-xl p-3 mb-5">
              <div className="mb-2">
                <div className="text-xs font-semibold text-ink mb-1">What did you do today?</div>
                <div className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-muted text-xs min-h-[32px]">
                  type a note…
                </div>
              </div>
              {namedMetrics.length > 0 ? (
                namedMetrics.map((m) => (
                  <div key={m.id} className="mb-2 last:mb-0">
                    <div className="text-xs font-semibold text-ink mb-1">
                      {m.label}{m.type === "yesno" ? "?" : ""}
                    </div>
                    <div className="bg-white border border-line rounded-lg px-2.5 py-1.5 text-muted text-xs min-h-[32px]">
                      {m.type === "yesno" ? "No ▾" : m.type === "text" ? "type a note…" : m.type === "percent" ? "0%" : "0"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted text-xs italic">Add fields above to see them here.</p>
              )}
            </div>

            <label className="field-label mb-2">Numbers shown on the dashboard</label>
            <div className="bg-surface border border-line rounded-xl p-3">
              {dashMetrics.length > 0 ? (
                dashMetrics.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-white border border-line rounded-lg px-3 py-2 mb-1.5 last:mb-0"
                  >
                    <span className="text-sm font-semibold">{m.label}</span>
                    <span className="font-mono text-sm font-semibold text-muted">
                      {m.type === "percent" ? "0%" : "0"}
                      {m.target ? ` / ${m.target}${m.type === "percent" ? "%" : ""}` : ""}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted text-xs italic">
                  Number and yes/no fields appear here.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}
