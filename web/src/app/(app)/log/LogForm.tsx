"use client";

import { useState } from "react";
import { submitLog } from "./actions";
import type { Metric } from "@/types/database";

const INPUT =
  "w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10 bg-white";

interface EditLog {
  id: string;
  program_id: string;
  log_date: string;
  narrative: string | null;
  evidence_note: string | null;
  manager_note: string | null;
  values: Record<string, number | boolean | string>;
}

interface Props {
  programs: Array<{ id: string; name: string }>;
  allMetrics: Metric[];
  editLog?: EditLog | null;
  today: string;
}

export default function LogForm({ programs, allMetrics, editLog, today }: Props) {
  const defaultPid = editLog?.program_id ?? programs[0]?.id ?? "";
  const [programId, setProgramId] = useState(defaultPid);

  const progMetrics = allMetrics.filter((m) => m.program_id === programId);

  const initYesno = () => {
    const s: Record<string, boolean> = {};
    for (const m of allMetrics) {
      if (m.kind === "yesno") s[m.id] = editLog?.values[m.id] === true;
    }
    return s;
  };
  const [yesno, setYesno] = useState<Record<string, boolean>>(initYesno);

  function toggle(id: string) {
    setYesno((s) => ({ ...s, [id]: !s[id] }));
  }

  const isEditing = !!editLog;
  const progName  = programs.find((p) => p.id === programId)?.name ?? "";

  return (
    <form action={submitLog}>
      {isEditing && <input type="hidden" name="log_id" value={editLog!.id} />}

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">

        {/* ── LEFT: form ── */}
        <div className="bg-white border border-line rounded-2xl overflow-hidden">

          {/* Form header */}
          <div className="px-6 pt-5 pb-4 border-b border-line">
            <h3 className="font-display text-lg">
              {isEditing ? "Revise daily log" : "New daily log"}
            </h3>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Manager note (edit mode) */}
            {isEditing && editLog!.manager_note && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span><b>Manager asked:</b> {editLog!.manager_note}</span>
              </div>
            )}

            {/* Program */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
                Program
              </label>
              <select
                name="program_id"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className={INPUT}
                disabled={isEditing}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {isEditing && (
                <input type="hidden" name="program_id" value={programId} />
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
                Date
              </label>
              <input
                type="date"
                name="log_date"
                defaultValue={editLog?.log_date ?? today}
                className={INPUT}
              />
            </div>

            {/* Narrative */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
                What did you do today?
              </label>
              <textarea
                name="narrative"
                defaultValue={editLog?.narrative ?? ""}
                placeholder="Describe the session, activity or work delivered…"
                className={`${INPUT} min-h-[90px] resize-y`}
              />
            </div>

            {/* Dynamic metric fields */}
            {progMetrics.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted mb-3">
                  {progName} — what you measured today
                </div>
                <div className="space-y-4">
                  {progMetrics.map((m) => (
                    <div key={m.id}>
                      <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
                        {m.label}
                        {m.target && (
                          <span className="ml-2 font-normal normal-case text-muted/70">
                            (target: {m.target})
                          </span>
                        )}
                      </label>

                      {m.kind === "number" && (
                        <input
                          type="number"
                          name={`metric_${m.id}`}
                          defaultValue={editLog ? (Number(editLog.values[m.id]) || 0) : 0}
                          min={0}
                          className={`${INPUT} font-mono`}
                        />
                      )}

                      {m.kind === "yesno" && (
                        <>
                          <input
                            type="hidden"
                            name={`metric_${m.id}`}
                            value={yesno[m.id] ? "true" : "false"}
                          />
                          <button
                            type="button"
                            onClick={() => toggle(m.id)}
                            className={`inline-flex items-center gap-2.5 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors ${
                              yesno[m.id]
                                ? "bg-lime text-green border-transparent shadow-sm"
                                : "bg-paper border-line text-muted hover:text-ink"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              yesno[m.id] ? "border-green bg-green" : "border-[#ccc] bg-white"
                            }`}>
                              {yesno[m.id] && (
                                <svg className="w-2.5 h-2.5 text-lime" viewBox="0 0 24 24" fill="none"
                                  stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </span>
                            {yesno[m.id] ? "Yes — did this today" : "No — did not do this today"}
                          </button>
                        </>
                      )}

                      {m.kind === "text" && (
                        <textarea
                          name={`metric_${m.id}`}
                          defaultValue={editLog ? ((editLog.values[m.id] as string) ?? "") : ""}
                          placeholder="Add notes or observations…"
                          className={`${INPUT} min-h-[70px] resize-y`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outcome evidence note */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
                Outcome evidence
              </label>
              <input
                type="text"
                name="evidence_note"
                defaultValue={editLog?.evidence_note ?? ""}
                placeholder="Link or note to verify the outcome"
                className={INPUT}
              />
              <p className="text-xs text-muted mt-1.5">
                Add a URL, sheet reference, or brief note describing the evidence for this session.
              </p>
            </div>

            {/* File attachment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
                Attach evidence{" "}
                <span className="font-normal normal-case text-muted/70">(photos, PDFs, sheets)</span>
              </label>
              <div className="border border-dashed border-line rounded-xl p-4 text-center hover:border-green/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#e3f0e9] file:text-green file:text-sm file:font-semibold hover:file:bg-lime cursor-pointer"
                />
                <p className="text-xs text-muted mt-2">Photos, PDFs, spreadsheets, or any supporting document</p>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-green-900 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {isEditing ? "Resubmit for review" : "Submit for verification"}
              </button>
            </div>

          </div>
        </div>

        {/* ── RIGHT: how this counts ── */}
        <div className="sticky top-24 space-y-4">

          {/* How it works card */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <h3 className="font-display text-lg mb-1">How this counts</h3>
            <p className="text-muted text-xs mb-4">
              Every field belongs to the{" "}
              <b className="text-ink">{progName}</b> program — different programs track different things.
            </p>
            {[
              "Submit with numbers and evidence",
              "Manager reviews — Approve, Request changes, or Deny",
              "Any feedback comes back here for you to revise",
              "Approved data feeds live dashboards and funder reports",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                <span className="w-6 h-6 rounded-md bg-green text-lime flex items-center justify-center font-mono font-bold text-[11px] flex-shrink-0 mt-px">
                  {i + 1}
                </span>
                <span className="text-sm leading-snug">{step}</span>
              </div>
            ))}
          </div>

          {/* Metric summary card (if program has metrics) */}
          {progMetrics.length > 0 && (
            <div className="bg-[#f7faf6] border border-line rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-wide text-muted mb-3">
                {progMetrics.length} field{progMetrics.length !== 1 ? "s" : ""} in this program
              </div>
              <div className="space-y-2">
                {progMetrics.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate">{m.label}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-line text-muted whitespace-nowrap">
                      {m.kind === "number" ? "Number" : m.kind === "yesno" ? "Yes/No" : "Note"}
                      {m.on_dashboard ? " · on dashboard" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </form>
  );
}
