"use client";

import { useState } from "react";
import { submitLog } from "./actions";
import type { Metric } from "@/types/database";

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
        <div className="card-elevated overflow-hidden">
          <div className="px-7 pt-6 pb-5 border-b border-[#f2f5f2]">
            <h3 className="font-display text-xl text-ink">
              {isEditing ? "Revise daily log" : "New daily log"}
            </h3>
          </div>

          <div className="px-7 py-6 space-y-5">

            {isEditing && editLog!.manager_note && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span><b>Manager asked:</b> {editLog!.manager_note}</span>
              </div>
            )}

            <div>
              <label className="field-label">Program</label>
              <select
                name="program_id"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="field-input"
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

            <div>
              <label className="field-label">Date</label>
              <input
                type="date"
                name="log_date"
                defaultValue={editLog?.log_date ?? today}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">What did you do today?</label>
              <textarea
                name="narrative"
                defaultValue={editLog?.narrative ?? ""}
                placeholder="Describe the session, activity or work delivered…"
                className="field-input min-h-[90px] resize-y"
              />
            </div>

            {progMetrics.length > 0 && (
              <div>
                <label className="field-label mb-3">
                  {progName} — what you measured today
                </label>
                <div className="space-y-4">
                  {progMetrics.map((m) => (
                    <div key={m.id}>
                      <label className="field-label">
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
                          className="field-input font-mono"
                        />
                      )}

                      {m.kind === "percent" && (
                        <div className="relative">
                          <input
                            type="number"
                            name={`metric_${m.id}`}
                            defaultValue={editLog ? (Number(editLog.values[m.id]) || 0) : 0}
                            min={0}
                            max={100}
                            className="field-input font-mono pr-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold pointer-events-none">
                            %
                          </span>
                        </div>
                      )}

                      {m.kind === "yesno" && (
                        <>
                          <input type="hidden" name={`metric_${m.id}`} value={yesno[m.id] ? "true" : "false"} />
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
                              yesno[m.id] ? "border-green bg-green" : "border-line bg-white"
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
                          className="field-input min-h-[70px] resize-y"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="field-label">Outcome evidence</label>
              <input
                type="text"
                name="evidence_note"
                defaultValue={editLog?.evidence_note ?? ""}
                placeholder="Link or note to verify the outcome"
                className="field-input"
              />
              <p className="text-xs text-muted mt-1.5">
                Add a URL, sheet reference, or brief note describing the evidence for this session.
              </p>
            </div>

            <div>
              <label className="field-label">
                Attach evidence{" "}
                <span className="font-normal normal-case text-muted/70">(photos, PDFs, sheets)</span>
              </label>
              <div className="border border-dashed border-line rounded-xl p-4 text-center hover:border-green/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-success-light file:text-success file:text-sm file:font-semibold hover:file:bg-lime cursor-pointer"
                />
                <p className="text-xs text-muted mt-2">Photos, PDFs, spreadsheets, or any supporting document</p>
              </div>
            </div>

            <div className="pt-1">
              <button type="submit" className="btn btn-primary btn-lg">
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

          <div className="card-elevated p-6">
            <h3 className="font-display text-lg text-ink mb-1">How this counts</h3>
            <p className="text-muted text-xs mb-5">
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

          {progMetrics.length > 0 && (
            <div className="card p-5">
              <div className="field-label mb-3">
                {progMetrics.length} field{progMetrics.length !== 1 ? "s" : ""} in this program
              </div>
              <div className="space-y-2">
                {progMetrics.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate">{m.label}</span>
                    <span className="badge-muted whitespace-nowrap">
                      {m.kind === "number" ? "Number" : m.kind === "yesno" ? "Yes/No" : m.kind === "percent" ? "Percentage" : "Note"}
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
