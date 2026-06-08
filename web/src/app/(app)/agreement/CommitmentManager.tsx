"use client";

import { useState, useTransition } from "react";
import { updateCommitment, deleteCommitment, addCommitment } from "./actions";
import type { Commitment } from "@/types/database";

const KIND_LABELS: Record<string, string> = {
  count: "Count",
  percent: "Percent (%)",
  budget: "Budget ($)",
};

interface Props {
  commitments: Commitment[];
  grantId: string;
}

export default function CommitmentManager({ commitments, grantId }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!window.confirm("Remove this commitment? This cannot be undone.")) return;
    startTransition(() => deleteCommitment(id, grantId));
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-5 mt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-lg">Manage commitments</h2>
          <p className="text-muted text-xs mt-0.5">
            Edit, remove, or manually add commitments the engine missed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green text-white hover:bg-green-900 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add commitment
        </button>
      </div>

      <div className="divide-y divide-line">
        {commitments.map((c) =>
          editingId === c.id ? (
            <EditRow
              key={c.id}
              commitment={c}
              grantId={grantId}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <DisplayRow
              key={c.id}
              commitment={c}
              onEdit={() => setEditingId(c.id)}
              onDelete={() => handleDelete(c.id)}
              disabled={isPending}
            />
          ),
        )}

        {commitments.length === 0 && (
          <p className="py-4 text-muted text-sm text-center">No commitments yet — extract from agreement text or add one manually.</p>
        )}

        {showAdd && (
          <AddRow grantId={grantId} onDone={() => setShowAdd(false)} />
        )}
      </div>
    </div>
  );
}

/* ── Display row ─────────────────────────────────────────────── */

function DisplayRow({
  commitment: c,
  onEdit,
  onDelete,
  disabled,
}: {
  commitment: Commitment;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{c.label}</div>
        <div className="text-muted text-xs mt-0.5">
          Target: {c.kind === "budget" ? `$${c.target.toLocaleString()}` : c.kind === "percent" ? `${c.target}%` : c.target.toLocaleString()}
          <span className="mx-1.5">·</span>
          <span className="capitalize">{c.kind}</span>
          {!c.metric_id && (
            <span className="ml-1.5 text-amber-600 font-semibold">· No linked metric</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paper transition-colors"
          title="Edit commitment"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete commitment"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Edit row ────────────────────────────────────────────────── */

function EditRow({
  commitment: c,
  grantId,
  onDone,
}: {
  commitment: Commitment;
  grantId: string;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const action = updateCommitment.bind(null, c.id, grantId);

  return (
    <form
      action={(fd) => startTransition(async () => { await action(fd); onDone(); })}
      className="py-3 space-y-2"
    >
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          name="label"
          defaultValue={c.label}
          required
          className="px-3 py-1.5 border border-line rounded-lg text-sm focus:outline-none focus:border-green focus:ring-1 focus:ring-green/20"
          placeholder="Commitment label"
        />
        <input
          name="target"
          type="number"
          min="0"
          step="any"
          defaultValue={c.target}
          required
          className="w-24 px-3 py-1.5 border border-line rounded-lg text-sm focus:outline-none focus:border-green focus:ring-1 focus:ring-green/20"
          placeholder="Target"
        />
        <select
          name="kind"
          defaultValue={c.kind}
          className="px-2 py-1.5 border border-line rounded-lg text-sm focus:outline-none focus:border-green bg-white"
        >
          <option value="count">Count</option>
          <option value="percent">Percent</option>
          <option value="budget">Budget</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green text-white hover:bg-green-900 transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Add row ─────────────────────────────────────────────────── */

function AddRow({ grantId, onDone }: { grantId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const action = addCommitment.bind(null, grantId);

  return (
    <form
      action={(fd) => startTransition(async () => { await action(fd); onDone(); })}
      className="pt-3 space-y-2"
    >
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">New commitment</p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          name="label"
          required
          autoFocus
          className="px-3 py-1.5 border border-line rounded-lg text-sm focus:outline-none focus:border-green focus:ring-1 focus:ring-green/20"
          placeholder="e.g. Trainers certified"
        />
        <input
          name="target"
          type="number"
          min="1"
          step="any"
          required
          className="w-24 px-3 py-1.5 border border-line rounded-lg text-sm focus:outline-none focus:border-green focus:ring-1 focus:ring-green/20"
          placeholder="Target"
        />
        <select
          name="kind"
          className="px-2 py-1.5 border border-line rounded-lg text-sm focus:outline-none focus:border-green bg-white"
        >
          <option value="count">Count</option>
          <option value="percent">Percent</option>
          <option value="budget">Budget</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green text-white hover:bg-green-900 transition-colors disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add commitment"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
