"use client";

import { useState, useTransition } from "react";
import { updateCommitment, deleteCommitment, addCommitment } from "./actions";
import type { Commitment, Metric } from "@/types/database";

const INPUT =
  "field-input";

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
    <div className="card-elevated overflow-hidden">

      {/* Header */}
      <div className="px-8 pt-7 pb-6 border-b border-[#f2f5f2] flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ink leading-none">Commitments</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            What this grant requires — tracked automatically against your verified data.
          </p>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="btn btn-cta btn-sm flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add
          </button>
        )}
      </div>

      {/* Commitment list */}
      <div className="divide-y divide-[#f5f7f5]">

        {commitments.length === 0 && !showAdd && (
          <div className="px-8 py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-success-light grid place-items-center mx-auto mb-5">
              <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <p className="font-semibold text-sm text-ink">No commitments yet</p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xs mx-auto">
              Paste agreement text above to extract them automatically, or click <strong>Add</strong> to enter manually.
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

/* ── Display row ── */
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
    <div className="flex items-center gap-5 px-8 py-5 group hover:bg-surface transition-colors">
      <div className="w-2 h-2 rounded-full bg-green flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ink leading-snug">{c.label}</p>
        <div className="text-xs text-muted mt-1 flex items-center gap-1.5 flex-wrap">
          <span>Target: <strong className="text-ink font-semibold">{targetFmt}</strong></span>
          <span className="text-muted/40">·</span>
          <span className="capitalize">{c.kind}</span>
          <span className="text-muted/40">·</span>
          {linkedMetric ? (
            <span className="text-green font-semibold flex items-center gap-1">
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

      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          title="Edit"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-success-light transition-colors"
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

/* ── Edit row ── */
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
      className="px-8 py-7 space-y-4 bg-surface border-l-2 border-green"
    >
      <p className="field-label">Edit commitment</p>
      <input
        name="label"
        defaultValue={c.label}
        required
        placeholder="Commitment label"
        className={INPUT}
      />
      <div className="flex gap-3">
        <input
          name="target"
          type="number"
          min="0"
          step="any"
          defaultValue={c.target}
          required
          placeholder="Target"
          className="field-input w-28"
        />
        <select name="kind" defaultValue={c.kind} className="field-input flex-1">
          <option value="count">Count</option>
          <option value="percent">Percent (%)</option>
          <option value="budget">Budget ($)</option>
        </select>
      </div>
      <div>
        <label className="field-label">Track using metric</label>
        <select name="metric_id" defaultValue={c.metric_id ?? ""} className={INPUT}>
          <option value="">None — track manually</option>
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}{m.target ? ` (target: ${m.target})` : ""}
            </option>
          ))}
        </select>
        {metrics.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">No metrics defined for this program yet.</p>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Add row ── */
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
      className="px-8 py-7 space-y-4 bg-surface border-t border-[#f2f5f2]"
    >
      <p className="field-label">New commitment</p>
      <input
        name="label"
        required
        autoFocus
        placeholder="e.g. Trainers certified"
        className={INPUT}
      />
      <div className="flex gap-3">
        <input
          name="target"
          type="number"
          min="1"
          step="any"
          required
          placeholder="Target"
          className="field-input w-28"
        />
        <select name="kind" className="field-input flex-1">
          <option value="count">Count</option>
          <option value="percent">Percent (%)</option>
          <option value="budget">Budget ($)</option>
        </select>
      </div>
      <div>
        <label className="field-label">Track using metric</label>
        <select name="metric_id" className={INPUT}>
          <option value="">None — track manually</option>
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}{m.target ? ` (target: ${m.target})` : ""}
            </option>
          ))}
        </select>
        {metrics.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            No metrics defined for this program yet — add some in Programs first.
          </p>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary"
        >
          {isPending ? "Adding…" : "Add commitment"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
