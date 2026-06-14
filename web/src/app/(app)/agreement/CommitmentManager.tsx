"use client";

import { useState, useTransition } from "react";
import {
  updateCommitment,
  deleteCommitment,
  addCommitment,
  incrementActivityCount,
  decrementActivityCount,
  addMilestone,
  setMilestoneStatus,
  editMilestone,
  removeMilestone,
} from "./actions";
import type { Commitment, Metric, MilestoneItem } from "@/types/database";

export interface EvidenceItem {
  note: string | null;
  fileName: string | null;
  fileUrl: string | null;
}

export interface EvidenceData {
  count: number;
  items: EvidenceItem[];
}

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

/* ── Activity completion counter ── */
function ActivityCounter({
  commitment: c,
  grantId,
  metrics,
  metricActuals,
}: {
  commitment: Commitment;
  grantId: string;
  metrics: Metric[];
  metricActuals: Record<string, number>;
}) {
  const [isPending, startTransition] = useTransition();

  const linkedMetric = c.metric_id ? metrics.find((m) => m.id === c.metric_id) : null;
  const count = linkedMetric
    ? (metricActuals[c.metric_id ?? ""] ?? 0)
    : (c.activity_count ?? 0);
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
          <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {linkedMetric ? (
        <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          via {linkedMetric.label}
        </span>
      ) : (
        <div className="flex gap-0.5 flex-shrink-0">
          <button
            type="button"
            title="Decrease count"
            disabled={isPending || count <= 0}
            onClick={() => startTransition(() => decrementActivityCount(c.id, grantId))}
            className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold text-muted hover:text-ink hover:bg-[#eef2ee] transition-colors disabled:opacity-30"
          >−</button>
          <button
            type="button"
            title="Increase count"
            disabled={isPending}
            onClick={() => startTransition(() => incrementActivityCount(c.id, grantId))}
            className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold text-muted hover:text-ink hover:bg-[#eef2ee] transition-colors disabled:opacity-30"
          >+</button>
        </div>
      )}
    </div>
  );
}

/* ── Outcome evidence tracker (read-only — staff submit via /log) ── */
function OutcomeTracker({
  commitment: c,
  evidence,
}: {
  commitment: Commitment;
  evidence: EvidenceData;
}) {
  const count     = evidence.count;
  const evTarget  = c.evidence_target ?? 0;
  const hasTarget = evTarget > 0;
  const pct       = hasTarget ? Math.min(100, Math.round((count / evTarget) * 100)) : 0;

  return (
    <div className="mt-1.5 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted">
          {hasTarget ? (
            <>
              <strong className="text-ink font-semibold">{count}</strong>
              {" of "}
              <strong className="text-ink font-semibold">{evTarget}</strong>
              {" evidence items approved"}
            </>
          ) : (
            <>
              <strong className="text-ink font-semibold">{count}</strong>
              {` approved evidence item${count !== 1 ? "s" : ""}`}
            </>
          )}
        </span>
        {hasTarget && (
          <div className="w-20 h-1.5 rounded-full bg-[#eef2ee] overflow-hidden flex-shrink-0">
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        <span className="text-xs text-muted/70 italic">Staff submit via their log page</span>
      </div>

      {evidence.items.length > 0 && (
        <ul className="space-y-1.5">
          {evidence.items.map((item, i) => (
            <li key={i} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 space-y-1.5">
              {item.note && (
                <p className="text-xs text-ink leading-relaxed">{item.note}</p>
              )}
              {item.fileUrl && item.fileName && (
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
                >
                  <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {item.fileName}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Milestone tracker (manager-managed checklist) ── */
function MilestoneTracker({
  commitment: c,
  grantId,
}: {
  commitment: Commitment;
  grantId: string;
}) {
  const [showAdd,    setShowAdd]    = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [isPending,  startTransition] = useTransition();

  const milestones = (c.milestones ?? []) as MilestoneItem[];
  const total    = milestones.length;
  const complete = milestones.filter((m) => m.status === "complete").length;
  const pct      = total > 0 ? Math.round((complete / total) * 100) : 0;
  const today    = new Date().toISOString().slice(0, 10);

  function nextStatus(s: MilestoneItem["status"]): MilestoneItem["status"] {
    if (s === "pending")     return "in_progress";
    if (s === "in_progress") return "complete";
    return "pending";
  }

  function StatusIcon({ status }: { status: MilestoneItem["status"] }) {
    if (status === "complete") return (
      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    );
    if (status === "in_progress") return (
      <div className="w-5 h-5 rounded-full border-2 border-purple-400 bg-purple-50 flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-purple-400" />
      </div>
    );
    return <div className="w-5 h-5 rounded-full border-2 border-line bg-paper flex-shrink-0" />;
  }

  return (
    <div className="mt-1.5 space-y-2">
      {/* Progress summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted">
          <strong className="text-ink font-semibold">{complete}</strong>
          {" of "}
          <strong className="text-ink font-semibold">{total}</strong>
          {" complete"}
        </span>
        {total > 0 && (
          <div className="w-20 h-1.5 rounded-full bg-[#eef2ee] overflow-hidden flex-shrink-0">
            <div className="h-full rounded-full bg-purple-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Checklist */}
      {milestones.length > 0 && (
        <ul className="space-y-0.5">
          {milestones.map((m, i) => {
            const isOverdue = Boolean(m.due_date && m.due_date < today && m.status !== "complete");
            return editingIdx === i ? (
              <li key={i}>
                <form
                  action={(fd) => startTransition(async () => {
                    await editMilestone(c.id, grantId, i, fd);
                    setEditingIdx(null);
                  })}
                  className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 mt-0.5"
                >
                  <input
                    name="label"
                    defaultValue={m.label}
                    required
                    autoFocus
                    placeholder="Milestone label"
                    className="field-input text-xs flex-1 py-1 h-7"
                  />
                  <input
                    name="due_date"
                    type="date"
                    defaultValue={m.due_date ?? ""}
                    className="field-input text-xs w-32 py-1 h-7"
                  />
                  <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">Save</button>
                  <button type="button" onClick={() => setEditingIdx(null)} className="btn btn-secondary btn-sm">Cancel</button>
                </form>
              </li>
            ) : (
              <li key={i} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-purple-50/60 transition-colors">
                {/* Status cycle button */}
                <button
                  type="button"
                  title={`Status: ${m.status} — click to advance`}
                  disabled={isPending}
                  onClick={() => startTransition(() => setMilestoneStatus(c.id, grantId, i, nextStatus(m.status)))}
                  className="flex-shrink-0 disabled:opacity-40 hover:scale-110 transition-transform"
                >
                  <StatusIcon status={m.status} />
                </button>

                {/* Label */}
                <span className={`text-xs flex-1 min-w-0 leading-snug ${m.status === "complete" ? "line-through text-muted" : "text-ink"}`}>
                  {m.label}
                </span>

                {/* Due date */}
                {m.due_date && (
                  <span className={`text-[10px] font-semibold flex-shrink-0 flex items-center gap-0.5 ${isOverdue ? "text-red-500" : "text-muted"}`}>
                    {isOverdue && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    )}
                    {new Date(m.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}

                {/* Edit / Remove */}
                <div className="flex gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    title="Edit milestone"
                    disabled={isPending}
                    onClick={() => setEditingIdx(i)}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted/40 hover:text-ink hover:bg-[#eef2ee] hover:text-opacity-100 transition-colors disabled:opacity-20"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Remove milestone"
                    disabled={isPending}
                    onClick={() => startTransition(() => removeMilestone(c.id, grantId, i))}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted/40 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-20"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add milestone */}
      {showAdd ? (
        <form
          action={(fd) => startTransition(async () => {
            await addMilestone(c.id, grantId, fd);
            setShowAdd(false);
          })}
          className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2"
        >
          <input
            name="label"
            required
            autoFocus
            placeholder="Milestone label"
            className="field-input text-xs flex-1 py-1 h-7"
          />
          <input
            name="due_date"
            type="date"
            className="field-input text-xs w-32 py-1 h-7"
          />
          <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">
            {isPending ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary btn-sm">Cancel</button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-xs text-purple-700 font-semibold hover:text-purple-900 transition-colors"
        >
          + Add milestone
        </button>
      )}
    </div>
  );
}

interface Props {
  commitments: Commitment[];
  grantId: string;
  metrics: Metric[];
  metricActuals: Record<string, number>;
  evidenceByCommitment: Record<string, EvidenceData>;
}

export default function CommitmentManager({ commitments, grantId, metrics, metricActuals, evidenceByCommitment }: Props) {
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
              metricActuals={metricActuals}
              evidence={evidenceByCommitment[c.id] ?? { count: 0, items: [] }}
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
  metricActuals,
  evidence,
  onEdit,
  onDelete,
  disabled,
}: {
  commitment: Commitment;
  grantId: string;
  metrics: Metric[];
  metricActuals: Record<string, number>;
  evidence: EvidenceData;
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
                {c.kind === "budget"   ? `$${c.target.toLocaleString()}`
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
          <ActivityCounter commitment={c} grantId={grantId} metrics={metrics} metricActuals={metricActuals} />
        )}

        {c.type === "outcome" && (
          <OutcomeTracker commitment={c} evidence={evidence} />
        )}

        {c.type === "milestone" && (
          <MilestoneTracker commitment={c} grantId={grantId} />
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

      {/* Activity: optional goal + metric link */}
      {selectedType === "activity" && (
        <>
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
          <div>
            <label className="field-label">Track using metric</label>
            <select name="metric_id" defaultValue={c.metric_id ?? ""} className={INPUT}>
              <option value="">None — use manual counter</option>
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}{m.target ? ` (target: ${m.target})` : ""}
                </option>
              ))}
            </select>
            {metrics.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">No metrics defined for this program yet.</p>
            )}
            <p className="text-xs text-muted mt-1.5">
              Link to a metric so staff-logged, manager-approved data drives the count automatically.
            </p>
          </div>
        </>
      )}

      {/* Outcome: evidence target */}
      {selectedType === "outcome" && (
        <div>
          <label className="field-label">Evidence target (optional)</label>
          <input
            name="evidence_target"
            type="number"
            min="0"
            step="1"
            defaultValue={
              c.type === "outcome" && (c.evidence_target ?? 0) > 0
                ? (c.evidence_target ?? undefined)
                : undefined
            }
            placeholder="No target — leave blank"
            className="field-input w-36"
          />
          <p className="text-xs text-muted mt-1.5">
            How many evidence items satisfy this outcome? Leave blank for open-ended.
          </p>
        </div>
      )}

      {/* Milestone: no extra fields — checklist is managed directly on the commitment card */}
      {selectedType === "milestone" && (
        <p className="text-xs text-muted italic px-1">
          Save this commitment, then add and manage milestones directly on its card.
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
