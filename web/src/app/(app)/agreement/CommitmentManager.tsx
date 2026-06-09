"use client";

import { useState, useTransition } from "react";
import { updateCommitment, deleteCommitment, addCommitment } from "./actions";
import type { Commitment, Metric } from "@/types/database";

const INPUT =
  "px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10 bg-white";

interface Props {
  commitments: Commitment[];
  grantId: string;
  metrics: Metric[];
}

export default function CommitmentManager({ commitments, grantId, metrics }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!window.confirm("Remove this commitment? This cannot be undone.")) return;
    startTransition(() => deleteCommitment(id, grantId));
  }

  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 border-b border-line flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg leading-none">Manage commitments</h2>
          <p className="text-muted text-xs mt-1">
            What this grant requires — tracked automatically against your verified data.
          </p>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white hover:bg-green-900 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add
          </button>
        )}
      </div>

      {/* Commitment list */}
      <div className="divide-y divide-line">
        {commitments.length === 0 && !showAdd && (
          <div className="px-6 py-10 text-center text-muted">
            <div className="w-10 h-10 rounded-2xl bg-[#f0f5f1] grid place-items-center mx-auto mb-3">
              <svg className="w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink">No commitments yet</p>
            <p className="text-xs mt-1">
              Paste agreement text above to extract them automatically, or click <b>Add</b> to enter manually.
            </p>
          </div>
        )}

        {commitments.map((c) =>
          editingId === c.id ? (
            <EditRow
              key={c.id}
              commitment={c}
              grantId={grantId}
              metrics={metrics}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <DisplayRow
              key={c.id}
              commitment={c}
              metrics={metrics}
              onEdit={() => setEditingId(c.id)}
              onDelete={() => handleDelete(c.id)}
              disabled={isPending}
            />
          ),
        )}

        {showAdd && (
          <AddRow grantId={grantId} metrics={metrics} onDone={() => setShowAdd(false)} />
        )}
      </div>
    </div>
  );
}

/* ── Display row ───────────────────────────────────────────────── */

function DisplayRow({
  commitment: c,
  metrics,
  onEdit,
  onDelete,
  disabled,
}: {
  commitment: Commitment;
  metrics: Metric[];
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const targetFmt =
    c.kind === "budget"  ? `$${c.target.toLocaleString()}` :
    c.kind === "percent" ? `${c.target}%` :
    c.target.toLocaleString();

  const linkedMetric = metrics.find((m) => m.id === c.metric_id);

  return (
    <div className="flex items-center gap-4 px-6 py-4 group hover:bg-[#fafdf8] transition-colors">
      {/* Colour dot */}
      <div className="w-2 h-2 rounded-full bg-green flex-shrink-0" />

      {/* Label + meta */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{c.label}</div>
        <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>Target: <b className="text-ink font-semibold">{targetFmt}</b></span>
          <span className="text-muted/50">·</span>
          <span className="capitalize">{c.kind}</span>
          <span className="text-muted/50">·</span>
          {linkedMetric ? (
            <span className="text-[#084734] font-semibold flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              {linkedMetric.label}
            </span>
          ) : (
            <span className="text-amber-600 font-semibold">No linked metric</span>
          )}
        </div>
      </div>

      {/* Actions — fade in on hover */}
      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          title="Edit"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-[#e3f0e9] transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          title="Delete"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Edit row ──────────────────────────────────────────────────── */

function EditRow({
  commitment: c,
  grantId,
  metrics,
  onDone,
}: {
  commitment: Commitment;
  grantId: string;
  metrics: Metric[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const action = updateCommitment.bind(null, c.id, grantId);

  return (
    <form
      action={(fd) => startTransition(async () => { await action(fd); onDone(); })}
      className="px-6 py-4 space-y-3 bg-[#fafdf8] border-l-2 border-green"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Edit commitment</p>
      <input
        name="label"
        defaultValue={c.label}
        required
        placeholder="Commitment label"
        className={`${INPUT} w-full`}
      />
      <div className="flex gap-2">
        <input
          name="target"
          type="number"
          min="0"
          step="any"
          defaultValue={c.target}
          required
          placeholder="Target"
          className={`${INPUT} w-28`}
        />
        <select name="kind" defaultValue={c.kind} className={`${INPUT} flex-1`}>
          <option value="count">Count</option>
          <option value="percent">Percent (%)</option>
          <option value="budget">Budget ($)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
          Track using metric
        </label>
        <select
          name="metric_id"
          defaultValue={c.metric_id ?? ""}
          className={`${INPUT} w-full`}
        >
          <option value="">None — track manually</option>
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}{m.target ? ` (target: ${m.target})` : ""}
            </option>
          ))}
        </select>
        {metrics.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            No metrics defined for this program yet.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white hover:bg-green-900 transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold px-4 py-2 rounded-xl border border-line bg-white hover:bg-paper transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Add row ───────────────────────────────────────────────────── */

function AddRow({
  grantId,
  metrics,
  onDone,
}: {
  grantId: string;
  metrics: Metric[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const action = addCommitment.bind(null, grantId);

  return (
    <form
      action={(fd) => startTransition(async () => { await action(fd); onDone(); })}
      className="px-6 py-4 space-y-3 bg-[#fafdf8] border-t border-line"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-muted">New commitment</p>
      <input
        name="label"
        required
        autoFocus
        placeholder="e.g. Trainers certified"
        className={`${INPUT} w-full`}
      />
      <div className="flex gap-2">
        <input
          name="target"
          type="number"
          min="1"
          step="any"
          required
          placeholder="Target"
          className={`${INPUT} w-28`}
        />
        <select name="kind" className={`${INPUT} flex-1`}>
          <option value="count">Count</option>
          <option value="percent">Percent (%)</option>
          <option value="budget">Budget ($)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
          Track using metric
        </label>
        <select name="metric_id" className={`${INPUT} w-full`}>
          <option value="">None — track manually</option>
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}{m.target ? ` (target: ${m.target})` : ""}
            </option>
          ))}
        </select>
        {metrics.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            No metrics defined for this program yet — add some in Programs first.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white hover:bg-green-900 transition-colors disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add commitment"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold px-4 py-2 rounded-xl border border-line bg-white hover:bg-paper transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
