"use client";

import { useState } from "react";
import { submitLog } from "./actions";
import type { Metric } from "@/types/database";

const INPUT =
  "w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10";

interface EditLog {
  id: string;
  program_id: string;
  log_date: string;
  narrative: string | null;
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
  const progName = programs.find((p) => p.id === programId)?.name ?? "";

  return (
    <form action={submitLog}>
      {isEditing && <input type="hidden" name="log_id" value={editLog!.id} />}

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">

        {/* LEFT: form fields */}
        <div className="bg-white border border-line rounded-2xl p-5">
          <h3 className="font-display text-lg mb-4">
            {isEditing ? "Revise daily log" : "New daily log"}
          </h3>

          {isEditing && editLog!.manager_note && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium mb-4">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>
                <b>Manager asked:</b> {editLog!.manager_note}
              </span>
            </div>
          )}

          {/* Program */}
          <label className="block font-semibold text-sm mb-1.5">Program</label>
          <select
            name="program_id"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className={`${INPUT} mb-3`}
            disabled={isEditing}
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {isEditing && (
            <input type="hidden" name="program_id" value={programId} />
          )}

          {/* Date */}
          <label className="block font-semibold text-sm mb-1.5">Date</label>
          <input
            type="date"
            name="log_date"
            defaultValue={editLog?.log_date ?? today}
            className={`${INPUT} mb-3`}
          />

          {/* Narrative */}
          <label className="block font-semibold text-sm mb-1.5">
            What did you do today?
          </label>
          <textarea
            name="narrative"
            defaultValue={editLog?.narrative ?? ""}
            placeholder="Describe the session, activity or work delivered…"
            className={`${INPUT} min-h-[90px] resize-y mb-4`}
          />

          {/* Dynamic metric fields */}
          {progMetrics.length > 0 && (
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-3">
              {progName} fields
            </div>
          )}
          {progMetrics.map((m) => (
            <div key={m.id} className="mb-4">
              <label className="block font-semibold text-sm mb-1.5">{m.label}</label>

              {m.kind === "number" && (
                <input
                  type="number"
                  name={`metric_${m.id}`}
                  defaultValue={
                    editLog ? (Number(editLog.values[m.id]) || "") : ""
                  }
                  placeholder={m.target ? `Target: ${m.target}` : "Enter number"}
                  min={0}
                  className={INPUT}
                />
              )}

              {m.kind === "yesno" && (
                <>
                  <input type="hidden" name={`metric_${m.id}`} value={yesno[m.id] ? "true" : "false"} />
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors ${
                      yesno[m.id]
                        ? "bg-lime text-green border-transparent"
                        : "bg-paper border-line text-muted hover:text-ink"
                    }`}
                  >
                    {yesno[m.id] ? (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Yes — did this today
                      </>
                    ) : (
                      "No — did not do this today"
                    )}
                  </button>
                </>
              )}

              {m.kind === "text" && (
                <textarea
                  name={`metric_${m.id}`}
                  defaultValue={
                    editLog ? ((editLog.values[m.id] as string) ?? "") : ""
                  }
                  placeholder="Add notes or observations…"
                  className={`${INPUT} min-h-[70px] resize-y`}
                />
              )}
            </div>
          ))}

          {/* File attachment */}
          <label className="block font-semibold text-sm mb-1.5">
            Attach evidence{" "}
            <span className="text-muted font-normal">(photos, PDFs, sheets)</span>
          </label>
          <input
            type="file"
            multiple
            className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#f0f0f0] file:text-sm file:font-semibold hover:file:bg-lime mb-5"
          />

          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {isEditing ? "Resubmit for review" : "Submit for verification"}
          </button>
        </div>

        {/* RIGHT: how this counts */}
        <div className="sticky top-24">
          <div className="bg-white border border-line rounded-2xl p-5">
            <h3 className="font-display text-lg mb-2">How this counts</h3>
            <p className="text-muted text-xs mb-4">
              These fields are defined by the{" "}
              <b className="text-ink">{progName}</b> program — every program logs
              different things.
            </p>
            {[
              "You submit verified work with evidence",
              "A manager reviews — Accept, Request changes, or Deny",
              "Any note comes back to you here",
              "On Accept, numbers update everywhere and feed funder reports",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                <span className="w-7 h-7 rounded-lg bg-green text-lime flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </form>
  );
}
