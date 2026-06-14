"use client";

import { useState, useTransition } from "react";
import {
  updateCommitment,
  deleteCommitment,
  addCommitment,
  incrementActivityCount,
  decrementActivityCount,
} from "./actions";
import type { Commitment, Metric } from "@/types/database";

const INPUT = "field-input";

/* ── Type badge ── */
const TYPE_BADGE_CLS: Record<Commitment["type"], string> = {
  measurable: "bg-emerald-50 text-emerald-700 border-emerald-200",
  activity:   "bg-blue-50   text-blue-700   border-blue-200",
  outcome:    "bg-amber-50  text-amber-700  border-amber-200",
  milestone:  "bg-purple-50 text-purple-700 border-purple-200",
};

function TypeBadge({ type }: { type: Commitment["type"] }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-none tracking-wide uppercase flex-shrink-0 ${TYPE_BADGE_CLS[type]}`}>
      {type}
    </span>
  );
}

/* ── Placeholder hint for outcome / milestone ── */
const TYPE_HINT: Record<"outcome" | "milestone", string> = {
  outcome:   "Tracked by evidence items",
  milestone: "Tracked by milestone status",
};

/* ── Activity completion counter ── */
function ActivityCounter({
  commitment: c,
  grantId,
}: {
  commitment: Commitment;
  grantId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const count = c.activity_count ?? 0;
  const hasGoal = c.target > 0;
  const pct = hasGoal ? Math.min(100, Math.round((count / c.target) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 mt-1 flex-wrap">
      <span className="text-xs text-muted">
        {hasGoal ? (
          <>
            <strong className="text-ink font-semibold">{count}</strong>
            {" of "}
            <strong className="text-ink font-semibold">{c.target}</strong>
            {" completed"}
          </>
        ) : (
          <>
            <strong className="text-ink font-semibold">{count}</strong>
            {" completed"}
          </>
        )}
      </span>

      {hasGoal && (
        <div className="w-20 h-1.5 rounded-full bg-[#eef2ee] overflow-hidden flex-shrink-0">
          <div
            className="h-full rounded-full bg-blue-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex gap-0.5 flex-shrink-0">
        <button
          type="button"
          title="Decrease count"
          disabled={isPending || count <= 0}
          onClick={() => startTransition(() => decrementActivityCount(c.id, grantId))}
          className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold text-muted hover:text-ink hover:bg-[#eef2ee] transition-colors disabled:opacity-30"
        >
          −
        </button>
        <button
          type="button"
          title="Increase count"
          disabled={isPending}
          onClick={() => startTransition(() => incrementActivityCount(c.id, grantId))}
          className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold text-muted hover:text-ink hover:bg-[#eef2ee] transition-colors disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

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
              grantId={grantId}
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
  grantId,
  metrics,
  onEdit,
  onDelete,
  disabled,
}: {
  commitment: Commitment;
  grantId: string;
  metrics: Metric[];
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const linkedMetric = metrics.find((m) => m.id === c.metric_id);

  return (
    <div className="flex items-start gap-5 px-8 py-5 group hover:bg-surface transition-colors">

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-1">
          <TypeBadge type={c.type} />
          <p className="font-semibold text-sm text-ink leading-snug">{c.label}</p>
        </div>

        {c.type === "measurable" && (
          <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
            <span>
              Target:{" "}
              <strong className="text-ink font-semibold">
                {c.kind === "budget"  ? `$${c.target.toLocaleString()}`
                 : c.kind === "percent" ? `${c.target}%`
                 : c.target.toLocaleString()}
              </strong>
            </span>
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
        )}

        {c.type === "activity" && (
          <ActivityCounter commitment={c} grantId={grantId} />
        )}

        {(c.type === "outcome" || c.type === "milestone") && (
          <p className="text-xs text-muted italic">{TYPE_HINT[c.type]}</p>
        )}
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
  const [selectedType, setSelectedType] = useState<Commitment["type"]>(c.type);
  const action = updateCommitment.bind(null, c.id, grantId);
  const isMeasurable = selectedType === "measurable";

  return (
    <form
      action={(fd) => startTransition(async () => { await action(fd); onDone(); })}
      className="px-8 py-7 space-y-4 bg-surface border-l-2 border-green"
    >
      <p className="field-label">Edit commitment</p>

      {/* Type reclassification */}
      <div>
        <label className="field-label">Type</label>
        <select
          name="type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as Commitment["type"])}
          className={INPUT}
        >
          <option value="measurable">Measurable — has a numeric target</option>
          <option value="activity">Activity — recurring action</option>
          <option value="outcome">Outcome — evidence-based result</option>
          <option value="milestone">Milestone — one-time deliverable</option>
        </select>
      </div>

      <input
        name="label"
        defaultValue={c.label}
        required
        placeholder="Commitment label"
        className={INPUT}
      />

      {/* Measurable-only fields */}
      {isMeasurable && (
        <>
          <div className="flex gap-3">
            <input
              name="target"
              type="number"
              min="0"
              step="any"
              defaultValue={c.target || undefined}
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
        </>
      )}

      {/* Activity: optional goal */}
      {selectedType === "activity" && (
        <div>
          <label className="field-label">Goal (optional)</label>
          <input
            name="target"
            type="number"
            min="0"
            step="1"
            defaultValue={c.type === "activity" && c.target > 0 ? c.target : undefined}
            placeholder="No goal — leave blank"
            className="field-input w-36"
          />
          <p className="text-xs text-muted mt-1.5">
            Set a goal to show progress (e.g. 24 sessions). Leave blank for an open-ended count.
          </p>
        </div>
      )}

      {/* Outcome / milestone: hint only */}
      {(selectedType === "outcome" || selectedType === "milestone") && (
        <p className="text-xs text-muted italic px-1">
          {selectedType === "outcome"
            ? "Tracking widgets for evidence items and assessments come in the next layer."
            : "Tracking widgets for milestone checklists come in the next layer."}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Add row (measurable only — reclassify after adding if needed) ── */
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
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? "Adding…" : "Add commitment"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
