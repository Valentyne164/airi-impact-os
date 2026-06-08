"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractCommitments } from "@/lib/impact";
import type { Metric } from "@/types/database";
import { createProgram } from "./actions";

interface WizMetric {
  id: string;
  label: string;
  type: "number" | "yesno" | "text";
  target: string;
}

const PRESETS: Array<[string, WizMetric["type"], string]> = [
  ["People reached", "number", "500"],
  ["Sessions / workshops held", "yesno", "25"],
  ["New group / cohort started", "yesno", "25"],
  ["Women & girls reached", "number", "200"],
  ["Evidence / notes", "text", ""],
];

const SAMPLE_AGREEMENT =
  "This Agreement between AIRI Foundation and the Government Partner sets out that the grantee will train 500 participants in practical AI skills, deliver 25 workshops across the funding period, ensure at least 40% women participation, and spend under $150,000 in total program costs.";

let uid = 0;
function nextId() {
  return String(++uid);
}

export default function ProgramWizard() {
  const router = useRouter();

  // Program fields
  const [name, setName] = useState("");
  const [aim, setAim] = useState("");
  const [audience, setAudience] = useState("");

  // Metric builder
  const [metrics, setMetrics] = useState<WizMetric[]>([]);

  // Optional grant fields
  const [gFunder, setGFunder] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gName, setGName] = useState("");
  const [gAmount, setGAmount] = useState("");
  const [gReport, setGReport] = useState("");
  const [gAgreement, setGAgreement] = useState("");

  // UI state
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // ── Metric helpers ────────────────────────────────────────
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
        // Reset target when switching to text
        if (field === "type" && value === "text") updated.target = "";
        return updated;
      }),
    );
  }

  function removeMetric(id: string) {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }

  // ── Live preview data ─────────────────────────────────────
  const namedMetrics = metrics.filter((m) => m.label.trim());
  const dashMetrics  = namedMetrics.filter((m) => m.type !== "text");

  const previewMetrics: Metric[] = namedMetrics.map((m, i) => ({
    id: `p${i}`,
    program_id: "wizard",
    label: m.label,
    kind: m.type as "number" | "yesno" | "text",
    target: m.type !== "text" && m.target ? Number(m.target) : null,
    on_dashboard: m.type !== "text",
    base: 0,
    sort_order: i,
  }));

  const previewCommitments =
    gAgreement.trim() ? extractCommitments(gAgreement, previewMetrics) : [];

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Give the program a name first."); return; }
    if (!namedMetrics.length) { setError("Add at least one thing to record."); return; }
    setError("");
    setPending(true);

    const fd = new FormData();
    fd.set("name",        name.trim());
    fd.set("aim",         aim.trim());
    fd.set("audience",    audience.trim());
    fd.set("metrics",     JSON.stringify(namedMetrics.map(({ label, type, target }) => ({ label, type, target }))));
    fd.set("g_funder",    gFunder.trim());
    fd.set("g_email",     gEmail.trim());
    fd.set("g_name",      gName.trim());
    fd.set("g_amount",    gAmount);
    fd.set("g_report",    gReport);
    fd.set("g_agreement", gAgreement.trim());

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

        {/* ── LEFT COLUMN ─────────────────────────────────── */}
        <div>

          {/* Card 1: Program fields + metric builder */}
          <div className="bg-white border border-line rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green text-white text-xs font-bold">1</span>
              <h3 className="font-display text-lg">Create a new program</h3>
            </div>

            {/* Program fields */}
            <label className="block font-semibold text-sm mb-1.5">Program name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rural AI Access Initiative"
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm mb-3 focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            />

            <label className="block font-semibold text-sm mb-1.5">Main aim</label>
            <textarea
              value={aim}
              onChange={(e) => setAim(e.target.value)}
              placeholder="What is this program trying to achieve, and why?"
              className="w-full min-h-[80px] px-3 py-2.5 border border-line rounded-xl text-sm mb-3 resize-y focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            />

            <label className="block font-semibold text-sm mb-1.5">Who does it serve?</label>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Rural communities, small business owners"
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm mb-4 focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            />

            {/* Metric builder */}
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-1">
              What should staff record each day?
            </div>
            <p className="text-muted text-xs mb-3">
              &ldquo;What did you do today?&rdquo; is always included. Add anything else you want to track.
              Tap a suggestion or add your own.
            </p>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2 mb-3">
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
                        ? "border-green/30 bg-[#e4f0ea] text-green/60 cursor-default"
                        : "border-line bg-paper hover:bg-green hover:text-white hover:border-green"
                      }`}
                  >
                    {already ? "✓ " : "+ "}{label}
                  </button>
                );
              })}
            </div>

            {/* Metric rows */}
            {metrics.length > 0 && (
              <div className="mb-2">
                {/* Column headers */}
                <div className="grid grid-cols-[1.7fr_1.2fr_0.8fr_auto] gap-2 px-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">Field</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">Type</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">Target</span>
                  <span />
                </div>
                {metrics.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-[1.7fr_1.2fr_0.8fr_auto] gap-2 items-center p-2.5 border border-line rounded-xl mb-1.5 bg-[#fbfdfb]"
                  >
                    <input
                      value={m.label}
                      onChange={(e) => updateMetric(m.id, "label", e.target.value)}
                      placeholder="What to record (e.g. People reached)"
                      className="px-2.5 py-1.5 border border-line rounded-lg text-sm bg-white focus:outline-none focus:border-green"
                    />
                    <select
                      value={m.type}
                      onChange={(e) => updateMetric(m.id, "type", e.target.value)}
                      className="px-2.5 py-1.5 border border-line rounded-lg text-sm bg-white focus:outline-none focus:border-green"
                    >
                      <option value="number">A number to add up</option>
                      <option value="yesno">A yes/no to tally</option>
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
                        className="px-2.5 py-1.5 border border-line rounded-lg text-sm bg-white focus:outline-none focus:border-green"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMetric(m.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addBlank}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border border-dashed border-line hover:bg-paper transition-colors text-muted"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add my own
            </button>
          </div>

          {/* Card 2: Optional grant + agreement */}
          <div className="bg-white border border-line rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green text-white text-xs font-bold">2</span>
                <h3 className="font-display text-lg">Add the grant &amp; agreement</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e8f0ff] text-[#4a7aff]">Optional</span>
            </div>
            <p className="text-muted text-sm mb-4">
              Attach the funding for this program and paste the agreement. We&apos;ll extract the commitments
              so you can analyse it right away.
            </p>

            {/* Funder row */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block font-semibold text-sm mb-1.5">Funder</label>
                <input
                  value={gFunder}
                  onChange={(e) => setGFunder(e.target.value)}
                  placeholder="e.g. Community Foundation"
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                />
              </div>
              <div>
                <label className="block font-semibold text-sm mb-1.5">Funder email</label>
                <input
                  type="email"
                  value={gEmail}
                  onChange={(e) => setGEmail(e.target.value)}
                  placeholder="reports@funder.org"
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                />
              </div>
            </div>

            {/* Grant details row */}
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block font-semibold text-sm mb-1.5">Grant name</label>
                <input
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  placeholder="(optional)"
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                />
              </div>
              <div>
                <label className="block font-semibold text-sm mb-1.5">Total funding ($)</label>
                <input
                  type="number"
                  value={gAmount}
                  onChange={(e) => setGAmount(e.target.value)}
                  placeholder="150000"
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                />
              </div>
              <div>
                <label className="block font-semibold text-sm mb-1.5">First report date</label>
                <input
                  type="date"
                  value={gReport}
                  onChange={(e) => setGReport(e.target.value)}
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                />
              </div>
            </div>

            {/* Agreement text */}
            <label className="block font-semibold text-sm mb-1.5">Grant agreement text</label>
            <textarea
              value={gAgreement}
              onChange={(e) => setGAgreement(e.target.value)}
              placeholder="Paste the agreement. e.g. The grantee will train 500 participants, deliver 25 workshops, ensure 40% women participation, and spend under $150,000."
              className="w-full min-h-[90px] px-3 py-2.5 border border-line rounded-xl text-sm mb-2 resize-y focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            />
            <button
              type="button"
              onClick={() => setGAgreement(SAMPLE_AGREEMENT)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors"
            >
              Use sample agreement
            </button>
          </div>

          {/* Error + action buttons */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 disabled:opacity-60 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {pending ? "Creating…" : "Create program"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/programs")}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border border-line bg-paper hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Live preview (sticky) ──────── */}
        <div className="sticky top-24">
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Live preview</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e8f0ff] text-[#4a7aff]">Updates as you type</span>
            </div>

            {/* Log preview */}
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
              The daily log staff will fill in
            </div>
            <div className="bg-[#f7faf6] border border-line rounded-xl p-3 mb-4">
              {/* Always-present "what did you do today" field */}
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
                      {m.type === "yesno" ? "No ▾" : m.type === "text" ? "type a note…" : "0"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted text-xs italic">Add fields above to see them here.</p>
              )}
            </div>

            {/* Dashboard preview */}
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
              Numbers shown on the dashboard
            </div>
            <div className="bg-[#f7faf6] border border-line rounded-xl p-3 mb-4">
              {dashMetrics.length > 0 ? (
                dashMetrics.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-white border border-line rounded-lg px-3 py-2 mb-1.5 last:mb-0"
                  >
                    <span className="text-sm font-semibold">{m.label}</span>
                    <span className="font-mono text-sm font-semibold text-muted">
                      0{m.target ? ` / ${m.target}` : ""}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted text-xs italic">
                  Number and yes/no fields appear here.
                </p>
              )}
            </div>

            {/* Commitments preview */}
            {gAgreement.trim() && (
              <>
                <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
                  Commitments we&apos;ll extract
                </div>
                <div className="bg-[#f7faf6] border border-line rounded-xl p-3">
                  {previewCommitments.length > 0 ? (
                    previewCommitments.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white border border-line rounded-lg px-3 py-2 mb-1.5 last:mb-0"
                      >
                        <span className="text-sm font-semibold">{c.label}</span>
                        <b className="font-mono text-sm">
                          {c.kind === "percent"
                            ? `${c.target}%`
                            : c.kind === "budget"
                            ? `$${c.target.toLocaleString()}`
                            : c.target}
                        </b>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-xs italic">
                      No commitments detected yet — check the wording.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </form>
  );
}
