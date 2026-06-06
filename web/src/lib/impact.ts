// Pure domain logic for AIRI Impact OS — no framework, no DOM, no I/O.
// This is the verified core that the prototype proved out; the Next.js app and
// any tests import from here. Everything is a pure function of the data passed in.

import type {
  Program, Metric, Grant, Commitment, Log, Expense,
} from "@/types/database";

/* ---------- aggregation (verified, approved data only) ---------- */

export function approvedLogs(logs: Log[], programId: string): Log[] {
  return logs.filter((l) => l.program_id === programId && l.status === "approved");
}

export function aggregate(metric: Metric, logs: Log[]): number {
  const ls = approvedLogs(logs, metric.program_id);
  const base = metric.base ?? 0;
  if (metric.kind === "yesno") {
    return base + ls.filter((l) => l.values[metric.id] === true).length;
  }
  if (metric.kind === "number") {
    return base + ls.reduce((a, l) => a + (Number(l.values[metric.id]) || 0), 0);
  }
  return 0; // text metrics don't aggregate
}

export function goalMetrics(metrics: Metric[]): Metric[] {
  return metrics.filter((m) => m.kind !== "text" && (m.target ?? 0) > 0);
}

export function impactScore(metrics: Metric[], logs: Log[]): number {
  const goals = goalMetrics(metrics);
  if (!goals.length) return 0;
  const sum = goals.reduce(
    (a, m) => a + Math.min(1, aggregate(m, logs) / (m.target as number)),
    0,
  );
  return Math.round((sum / goals.length) * 100);
}

/* ---------- finances (spent = sum of the expense ledger) ---------- */

export function grantSpent(grantId: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.grant_id === grantId)
    .reduce((a, e) => a + (Number(e.amount) || 0), 0);
}

export function burnPct(grant: Grant, expenses: Expense[]): number {
  return Math.round((grantSpent(grant.id, expenses) / Math.max(1, grant.amount)) * 100);
}

export function termElapsed(grant: Grant, today = new Date()): number | null {
  if (!grant.term_start || !grant.term_end) return null;
  const s = +new Date(grant.term_start);
  const e = +new Date(grant.term_end);
  const p = Math.round(((+today - s) / Math.max(1, e - s)) * 100);
  return Math.max(0, Math.min(100, p));
}

export function burnStatus(grant: Grant, expenses: Expense[], today = new Date()) {
  const t = termElapsed(grant, today);
  const b = burnPct(grant, expenses);
  if (t === null) return { label: "—", tone: "muted" as const };
  const diff = b - t;
  if (diff > 12) return { label: "Spending ahead of schedule", tone: "bad" as const };
  if (diff < -15) return { label: "Underspending vs schedule", tone: "warn" as const };
  return { label: "Spending on pace", tone: "ok" as const };
}

/* ---------- agreement → impact ---------- */

export interface CommitmentResult {
  display: string;
  pct: number;
  met: boolean;
  sub: string;
  src: string;
}

export function commitmentActual(
  commitment: Commitment,
  ctx: { metrics: Metric[]; logs: Log[]; grant: Grant; expenses: Expense[] },
): CommitmentResult {
  const { metrics, logs, grant, expenses } = ctx;
  if (commitment.kind === "budget") {
    const spent = grantSpent(grant.id, expenses);
    return {
      display: `$${spent.toLocaleString()} / $${commitment.target.toLocaleString()}`,
      pct: Math.round((spent / commitment.target) * 100),
      met: spent <= commitment.target,
      sub: `Spend under $${commitment.target.toLocaleString()}`,
      src: "manager-logged expenses",
    };
  }
  const m =
    metrics.find((x) => x.id === commitment.metric_id) ??
    metrics.find((x) =>
      x.label.toLowerCase().includes((commitment.label.split(" ")[1] || "").toLowerCase()),
    );
  if (!m) {
    return { display: `— / ${commitment.target}`, pct: 0, met: false, sub: `Target ${commitment.target}`, src: "link a program to track" };
  }
  if (commitment.kind === "percent") {
    const reach = metrics.find((x) => x.kind === "number");
    const a = reach ? Math.round((aggregate(m, logs) / Math.max(1, aggregate(reach, logs))) * 100) : 0;
    return {
      display: `${a}% / ${commitment.target}%`,
      pct: Math.round((a / commitment.target) * 100),
      met: a >= commitment.target,
      sub: `Target ${commitment.target}%`,
      src: `staff field: "${m.label}"`,
    };
  }
  const a = aggregate(m, logs);
  return {
    display: `${a} / ${commitment.target}`,
    pct: Math.round((a / commitment.target) * 100),
    met: a >= commitment.target,
    sub: `Target ${commitment.target}`,
    src: `staff field: "${m.label}"`,
  };
}

export function agreementHealth(
  commitments: Commitment[],
  ctx: { metrics: Metric[]; logs: Log[]; grant: Grant; expenses: Expense[] },
) {
  if (!commitments.length) return { overall: 0, met: 0, total: 0, behind: [] as string[] };
  let sum = 0, met = 0;
  const behind: string[] = [];
  for (const c of commitments) {
    const r = commitmentActual(c, ctx);
    sum += Math.min(100, r.pct);
    if (r.met) met++;
    else if (r.pct < 65) behind.push(c.label);
  }
  return { overall: Math.round(sum / commitments.length), met, total: commitments.length, behind };
}

/** Extract commitments from pasted agreement text. Returns rows ready to insert. */
export function extractCommitments(
  text: string,
  metrics: Metric[],
): Array<Pick<Commitment, "label" | "kind" | "target" | "metric_id">> {
  const out: Array<Pick<Commitment, "label" | "kind" | "target" | "metric_id">> = [];
  const seen = new Set<string>();
  const num = (s: string) => Number(s.replace(/[, ]/g, ""));
  const metByWords = (...w: string[]) =>
    metrics.find((m) => w.some((x) => m.label.toLowerCase().includes(x)))?.id ?? null;
  const add = (label: string, kind: Commitment["kind"], target: number, metric_id: string | null) => {
    if (seen.has(label)) return;
    seen.add(label);
    out.push({ label, kind, target, metric_id });
  };
  let mm: RegExpMatchArray | null;
  if ((mm = text.match(/train(?:ing)?\s+(?:up\s+to\s+)?([\d, ]+)\s*(?:participants|people|learners|individuals)/i)))
    add("Train participants", "count", num(mm[1]), metByWords("people", "participant", "train", "reach", "student"));
  if ((mm = text.match(/(?:reach|serve|enrol[l]?)\s+(?:up\s+to\s+)?([\d, ]+)\s*(?:participants|people|residents|students|youth)/i)))
    add("Reach participants", "count", num(mm[1]), metByWords("people", "reach", "student", "participant"));
  if ((mm = text.match(/(?:deliver|run|host|hold)\s+([\d, ]+)\s*(?:workshops|sessions|events|clinics)/i)))
    add("Deliver workshops", "count", num(mm[1]), metByWords("workshop", "session"));
  if ((mm = text.match(/([\d]+)\s*%\s*(?:women|girls|female)/i)))
    add("Women participation", "percent", num(mm[1]), metByWords("women", "girl", "female"));
  if ((mm = text.match(/(?:create|form|start|establish)\s+([\d, ]+)\s*(?:cohorts|groups|clubs)/i)))
    add("Create cohorts", "count", num(mm[1]), metByWords("cohort", "group"));
  if ((mm = text.match(/(?:under|below|less than|max(?:imum)?|not exceed(?:ing)?|budget of|up to)\s*\$?\s*([\d, ]{4,})/i)))
    add("Spend under", "budget", num(mm[1]), null);
  return out;
}

/* ---------- deadline engine ---------- */

export const DEADLINE_STAGES = [
  { key: "draft", label: "Draft report", offset: 14 },
  { key: "remind", label: "Reminder", offset: 7 },
  { key: "urgent", label: "Urgent reminder", offset: 3 },
  { key: "escalate", label: "Escalation", offset: 0 },
] as const;

export function daysUntil(date: string, today = new Date()): number {
  return Math.round((+new Date(date) - +today) / 86_400_000);
}

export function dueStatus(grant: Grant, today = new Date()) {
  if (!grant.next_report) return { n: Infinity, current: null, fired: [] as typeof DEADLINE_STAGES[number][] };
  const n = daysUntil(grant.next_report, today);
  const fired = DEADLINE_STAGES.filter((s) => n <= s.offset);
  return { n, current: fired.length ? fired[fired.length - 1] : null, fired };
}
