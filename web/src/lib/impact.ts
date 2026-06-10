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
  if (metric.kind === "percent") {
    // Average percentage across approved logs — summing percentages is meaningless.
    // base is intentionally ignored for averages.
    const vals = ls.map((l) => Number(l.values[metric.id]) || 0);
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 10) / 10;
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
  unlinked?: boolean;
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
  if (!commitment.metric_id) {
    return {
      display: "—",
      pct: 0,
      met: false,
      sub: `Target ${commitment.target}`,
      src: "not-linked",
      unlinked: true,
    };
  }
  const m = metrics.find((x) => x.id === commitment.metric_id);
  if (!m) {
    return {
      display: `— / ${commitment.target}`,
      pct: 0,
      met: false,
      sub: `Target ${commitment.target}`,
      src: "metric not found",
      unlinked: true,
    };
  }
  const actual = aggregate(m, logs);
  const isPerc = m.kind === "percent";
  return {
    display: isPerc
      ? `${actual}% / ${commitment.target}%`
      : `${actual} / ${commitment.target}`,
    pct: Math.round((actual / commitment.target) * 100),
    met: actual >= commitment.target,
    sub: isPerc ? `Target ${commitment.target}% (avg)` : `Target ${commitment.target}`,
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

function commitmentPhrase(c: Commitment): string {
  const fmt = (n: number) => "$" + n.toLocaleString();
  if (c.kind === "budget") return `spend under ${fmt(c.target)}`;
  if (c.kind === "percent")
    return `reach ${c.target}% ${c.label.toLowerCase().replace("participation", "").trim()}`;
  return `${c.label.toLowerCase()} (${c.target})`;
}

export function agreementSummary(
  grant: Grant,
  commitments: Commitment[],
  ctx: { metrics: Metric[]; logs: Log[]; grant: Grant; expenses: Expense[] },
): string {
  if (!commitments.length) return "No commitments parsed yet.";
  const h = agreementHealth(commitments, ctx);
  const phrases = commitments.map(commitmentPhrase);
  const last = phrases.pop()!;
  const funder = grant.funder_name ?? "the funder";
  return (
    `This agreement with ${funder} commits AIRI to ` +
    `${phrases.join(", ")}${phrases.length ? ", and " : ""}${last}. ` +
    `Against manager-verified data, ${h.met} of ${h.total} commitments are already met ` +
    `and overall delivery sits at ${h.overall}%. ` +
    (h.behind.length
      ? `Focus area${h.behind.length > 1 ? "s" : ""}: ${h.behind.join(", ")}.`
      : "Every commitment is on or ahead of track.")
  );
}

/** Extract commitments from pasted agreement text. Returns rows ready to insert.
 *
 *  Robustness design:
 *  - Optional-adjective prefix on nouns: "community workshops", "adult learners", etc.
 *  - Within-sentence lazy matching (`[^.;!?]*?`) for women % so phrasing order doesn't matter.
 *  - Metric-based deduplication: one commitment per metric, one per label.
 *  - first() short-circuits on the first regex that yields a number capture.
 */
export function extractCommitments(
  text: string,
  metrics: Metric[],
): Array<Pick<Commitment, "label" | "kind" | "target" | "metric_id">> {
  const out: Array<Pick<Commitment, "label" | "kind" | "target" | "metric_id">> = [];
  const usedMetricIds = new Set<string>();
  const usedLabels    = new Set<string>();

  const toNum = (s: string) => Number(s.replace(/[$,\s]/g, ""));

  const metId = (...words: string[]): string | null =>
    metrics.find((m) =>
      words.some((w) => m.label.toLowerCase().includes(w.toLowerCase()))
    )?.id ?? null;

  function tryAdd(
    label: string,
    kind: Commitment["kind"],
    rawTarget: string,
    metric_id: string | null,
  ): boolean {
    const target = toNum(rawTarget);
    if (!target || target <= 0)                    return false;
    if (usedLabels.has(label))                     return false;
    if (metric_id && usedMetricIds.has(metric_id)) return false;
    usedLabels.add(label);
    if (metric_id) usedMetricIds.add(metric_id);
    out.push({ label, kind, target, metric_id });
    return true;
  }

  function first(...patterns: RegExp[]): RegExpMatchArray | null {
    for (const p of patterns) {
      const m = text.match(p);
      if (m?.[1]) return m;
    }
    return null;
  }

  // Optional quantifier prefix (non-capturing)
  const QP  = "(?:(?:a\\s+minimum\\s+of|at\\s+least|no\\s+fewer\\s+than|up\\s+to|at\\s+minimum|no\\s+less\\s+than)\\s+)?";
  const N   = "([\\d][\\d,]*)";
  // Allow 0-2 optional adjective words before a core noun ("community workshops", "adult learners")
  const ADJ = "(?:(?:\\w+-?\\w*\\s+){0,2})";

  const studentMid = metId("student", "youth", "young");

  // ── 1. People / participants ──────────────────────────────────────
  {
    const CORE_NARROW = "(?:participants?|people|individuals?|beneficiar(?:ies|y)|members?|residents?|clients?|recipients?|persons?|trainees?|attendees?|citizens?|trainers?|educators?|coaches?)";
    const CORE_BROAD  = "(?:participants?|people|individuals?|beneficiar(?:ies|y)|members?|residents?|clients?|recipients?|persons?|trainees?|attendees?|citizens?|trainers?|educators?|coaches?|students?|youth|learners?|young\\s+people)";
    const CORE = studentMid ? CORE_NARROW : CORE_BROAD;
    const NOUN = `${ADJ}${CORE}`;
    const mid  = metId("people", "participant", "reach", "train", "individual", "beneficiar", "member", "resident", "client");

    const m = first(
      // verb + [quantifier] + N + [adj] + noun: "train 500 participants", "serve a minimum of 200 adult learners"
      new RegExp(`(?:train(?:ing)?|reach|serve|support|assist|enrol[l]?|engage|target|register|contact|impact|empower|benefit)\\s+${QP}${N}\\s*${NOUN}`, "i"),
      // N + [adj] + noun + passive: "500 community members will be trained"
      new RegExp(`${N}\\s*${NOUN}\\s+(?:will|shall|are?(?:\\s+expected)?\\s+to)\\s+(?:be\\s+)?(?:trained|reached|served|supported|engaged|assisted|enrolled)`, "i"),
      // quantifier + N + [adj] + noun: "a minimum of 500 individuals", "no fewer than 200 people"
      new RegExp(`(?:a\\s+minimum\\s+of|at\\s+least|no\\s+fewer\\s+than|no\\s+less\\s+than)\\s+${N}\\s*${NOUN}`, "i"),
      // provide [...up to 5 words...] to N noun: "provide AI literacy training to 500 adult learners"
      new RegExp(`provide(?:\\s+[\\w-]+){0,5}\\s+to\\s+${QP}${N}\\s*${NOUN}`, "i"),
      // deliver services / programming to N noun
      new RegExp(`(?:deliver|offer)\\s+(?:[\\w-]+\\s+){0,4}to\\s+${QP}${N}\\s*${NOUN}`, "i"),
    );
    if (m) tryAdd("People reached", "count", m[1], mid ?? null);
  }

  // ── 2. Students / youth (only when a dedicated metric exists) ────
  if (studentMid) {
    const CORE_S = "(?:students?|youth|young\\s+people|learners?|pupils?)";
    const NOUN_S = `${ADJ}${CORE_S}`;
    const m = first(
      new RegExp(`(?:reach|serve|train|support|enrol[l]?|engage|work\\s+with)\\s+${QP}${N}\\s*${NOUN_S}`, "i"),
      new RegExp(`${N}\\s*${NOUN_S}\\s+(?:will|shall)\\s+(?:be\\s+)?(?:reached|served|trained|supported|engaged)`, "i"),
      new RegExp(`(?:a\\s+minimum\\s+of|at\\s+least|no\\s+fewer\\s+than)\\s+${N}\\s*${NOUN_S}`, "i"),
    );
    if (m) tryAdd("Students reached", "count", m[1], studentMid);
  }

  // ── 3. Sessions / workshops ───────────────────────────────────────
  {
    // CORE_S allows "workshop", "session", etc.; ADJ handles "community workshops", "outreach events"
    const CORE_S = "(?:workshops?|sessions?|events?|clinics?|training(?:\\s+sessions?)?|classes?|seminars?|webinars?|programs?)";
    const NOUN_S = `${ADJ}${CORE_S}`;
    const mid    = metId("workshop", "session", "event", "training", "seminar");
    const m = first(
      new RegExp(`(?:deliver|run|host|hold|facilitate|conduct|offer|provide|organize|coordinate|arrange|schedule)\\s+${QP}${N}\\s*${NOUN_S}`, "i"),
      new RegExp(`${N}\\s*${NOUN_S}\\s+(?:will|shall)\\s+(?:be\\s+)?(?:delivered|held|facilitated|conducted|run|offered|organized|hosted)`, "i"),
      new RegExp(`(?:a\\s+minimum\\s+of|at\\s+least|no\\s+fewer\\s+than)\\s+${N}\\s*${NOUN_S}`, "i"),
    );
    if (m) tryAdd("Sessions delivered", "count", m[1], mid ?? null);
  }

  // ── 4. Women / gender equity ─────────────────────────────────────
  // Uses within-sentence lazy match so phrasing order doesn't matter.
  {
    const mid = metId("women", "girl", "female", "gender");
    const m = first(
      // percentage BEFORE "women/girls/female" anywhere in the same clause
      /(\d+)\s*%[^.;!?]*?(?:women|girls?|female)/i,
      // "women / girls" BEFORE percentage in same clause
      /(?:women|girls?)(?:\s+and\s+(?:girls?|women))?[^.;!?]*?(\d+)\s*%/i,
      // "female" before percentage
      /female[^.;!?]*?(\d+)\s*%/i,
      // "no less/fewer than X% women"
      /no\s+(?:less|fewer)\s+than\s+(\d+)\s*%[^.;!?]{0,40}(?:women|girls?|female)/i,
    );
    if (m) tryAdd("Women & girls reached", "percent", m[1], mid ?? null);
  }

  // ── 5. Cohorts / groups ───────────────────────────────────────────
  {
    const CORE_C = "(?:cohorts?|groups?|clubs?|cycles?|batches?)";
    const NOUN_C = `${ADJ}${CORE_C}`;
    const mid    = metId("cohort", "group", "club", "batch");
    const m = first(
      new RegExp(`(?:create|form|start|establish|launch|run|host|initiate)\\s+${QP}${N}\\s*${NOUN_C}`, "i"),
      new RegExp(`${N}\\s*${NOUN_C}\\s+(?:will|shall)\\s+(?:be\\s+)?(?:started|formed|launched|established|run|initiated)`, "i"),
    );
    if (m) tryAdd("Cohorts started", "count", m[1], mid ?? null);
  }

  // ── 6. Certifications ─────────────────────────────────────────────
  // Covers both the credential object ("issue 80 certifications") and
  // the people being certified ("certify 80 trainers").
  {
    const CORE_CR = "(?:certifications?|certificates?|credentials?|diplomas?|micro-credentials?|accreditations?|trainers?|facilitators?|educators?|coaches?|practitioners?)";
    const NOUN_CR = `${ADJ}${CORE_CR}`;
    const mid     = metId("cert", "certif", "credential", "diploma", "trainer", "facilitator");
    const m = first(
      // "certify|qualify|accredit|issue|award 80 trainers / certifications"
      new RegExp(`(?:certify|qualify|accredit|issue|award|complete|grant|provide|earn|obtain|confer)\\s+${QP}${N}\\s*${NOUN_CR}`, "i"),
      // passive: "80 trainers will be certified"
      new RegExp(`${N}\\s*${NOUN_CR}\\s+(?:will|shall)\\s+(?:be\\s+)?(?:certified|qualified|accredited|issued|awarded|completed|granted|earned|conferred)`, "i"),
      // "a minimum of 80 trainers certified"
      new RegExp(`(?:a\\s+minimum\\s+of|at\\s+least|no\\s+fewer\\s+than)\\s+${N}\\s*${NOUN_CR}`, "i"),
    );
    if (m) tryAdd("Certifications issued", "count", m[1], mid ?? null);
  }

  // ── 7. Projects (youth-tech or deliverable-based programs) ───────
  {
    const mid = metId("project", "prototype", "deliverable", "product");
    if (mid) {
      const CORE_P = "(?:projects?|prototypes?|deliverables?|applications?|demos?|products?|builds?)";
      const NOUN_P = `${ADJ}${CORE_P}`;
      const m = first(
        new RegExp(`(?:complete|deliver|build|create|produce|develop|submit)\\s+${QP}${N}\\s*${NOUN_P}`, "i"),
        new RegExp(`${N}\\s*${NOUN_P}\\s+(?:will|shall)\\s+(?:be\\s+)?(?:completed|delivered|built|created|developed|submitted)`, "i"),
      );
      if (m) tryAdd("Projects completed", "count", m[1], mid);
    }
  }

  // ── 8. Communities / geographic reach ────────────────────────────
  // Catches "across 8 communities", "in 6 locations", "serve 5 regions".
  {
    const CORE_G = "(?:communities|community\\s+sites?|locations?|sites?|neighborhoods?|regions?|districts?|areas?|towns?|boroughs?|villages?|cities)";
    const NOUN_G = `${ADJ}${CORE_G}`;
    const mid    = metId("communit", "location", "site", "region", "area", "geographic", "neighborhood");
    const m = first(
      // "across / in N communities"
      new RegExp(`(?:across|in)\\s+${N}\\s*${NOUN_G}`, "i"),
      // "serve / reach / establish N communities"
      new RegExp(`(?:serve|reach|establish|operate\\s+in|expand\\s+to|partner\\s+with|include)\\s+${QP}${N}\\s*${NOUN_G}`, "i"),
      // "N communities will be served"
      new RegExp(`${N}\\s*${NOUN_G}\\s+(?:will|shall)\\s+(?:be\\s+)?(?:served|reached|supported|included|engaged)`, "i"),
      // "a minimum of N communities"
      new RegExp(`(?:a\\s+minimum\\s+of|at\\s+least|no\\s+fewer\\s+than)\\s+${N}\\s*${NOUN_G}`, "i"),
    );
    if (m) tryAdd("Communities reached", "count", m[1], mid ?? null);
  }

  // ── 9. Performance / retention rates ─────────────────────────────
  // Catches "trainer retention rate of at least 90%", "completion rate of 85%".
  // Runs after the women extractor so gender percentages are already claimed.
  {
    const mid = metId("retention", "completion", "success", "graduation", "performance", "satisfaction", "attendance");
    const isGender = (s: string) => /women|girls?|female|gender/i.test(s);

    let rateM: RegExpMatchArray | null = null;
    for (const p of [
      // "achieve/maintain [words] rate of at least N%"
      /(?:achieve|maintain|ensure|reach|target|meet)\s+[^.;!?]{0,40}?\brate\s+of\s+(?:at\s+least\s+|no\s+less\s+than\s+)?(\d+)\s*%/i,
      // "[word] rate of [at least] N%"
      /(?:\w+)\s+rate\s+of\s+(?:at\s+least\s+|no\s+less\s+than\s+)?(\d+)\s*%/i,
      // "N% [word] rate" (percentage first)
      /(\d+)\s*%\s+(?:\w+\s+){0,2}rate/i,
      // "rate of [at least] N%"
      /rate\s+of\s+(?:at\s+least\s+|no\s+less\s+than\s+)?(\d+)\s*%/i,
    ] as RegExp[]) {
      const candidate = text.match(p);
      if (candidate?.[1] && !isGender(candidate[0])) { rateM = candidate; break; }
    }

    if (rateM) {
      const ctx = text.match(/(\w+)\s+rate\s+(?:of|at\s+least)/i);
      const rateWord = ctx?.[1]?.toLowerCase() ?? "performance";
      const skip = new Set(["the","a","an","of","this","that","at","be","or","to","will","shall","our"]);
      const typeName = skip.has(rateWord) ? "performance" : rateWord;
      const label = typeName.charAt(0).toUpperCase() + typeName.slice(1) + " rate";
      tryAdd(label, "percent", rateM[1], mid ?? null);
    }
  }

  // ── 11. Budget cap ───────────────────────────────────────────────
  {
    const m = first(
      // "total [program] costs/budget/expenditures shall not exceed $X" / "capped at $X"
      /total\s+(?:(?:\w+\s+){0,3})?(?:costs?|budget|expenditures?|spend(?:ing)?)\s+(?:(?:shall|will|must)\s+not\s+exceed|(?:is\s+)?capped\s+at)\s*\$?\s*([\d][\d,]*)/i,
      // "shall/will/must not exceed $X" / "not to exceed $X" / "not exceeding $X"
      /(?:(?:shall|will|must)\s+not\s+exceed|not\s+to\s+exceed|not\s+exceeding|must\s+remain\s+(?:at\s+or\s+)?under)\s*\$?\s*([\d][\d,]*)/i,
      // "aggregate [costs/expenditure] not [to] exceed[ing] $X"
      /aggregate\s+(?:[\w\s]+?\s+)?(?:not\s+(?:to\s+)?exceed(?:ing)?)\s*\$?\s*([\d][\d,]*)/i,
      // "no more than $X" / "within a/the [total] budget of $X"
      /(?:no\s+more\s+than|within\s+(?:a\s+|the\s+)?(?:total\s+)?budget\s+of)\s*\$?\s*([\d][\d,]*)/i,
      // "spend under/below/within $X"
      /spend(?:ing)?\s+(?:under|below|within)\s*\$?\s*([\d][\d,]*)/i,
      // "budget of/set at/capped at $X"
      /budget\s+(?:of|is|set\s+at|capped\s+at)\s*\$?\s*([\d][\d,]*)/i,
      // "$X or less / maximum / total budget"
      /\$\s*([\d][\d,]*)\s+(?:or\s+less|maximum|budget\s+cap|total\s+budget)/i,
      // "expenditures not exceeding $X" / "costs not exceeding $X"
      /(?:expenditures?|costs?|expenses?)\s+not\s+exceeding\s*\$?\s*([\d][\d,]*)/i,
    );
    if (m) tryAdd("Budget limit", "budget", m[1], null);
  }

  return out;
}

/* ---------- report generation helpers ---------- */

export function verifiedLines(metrics: Metric[], logs: Log[]): string {
  return goalMetrics(metrics)
    .map((m) => {
      const a = aggregate(m, logs);
      const valStr = m.kind === "percent" ? `${a}% (avg)` : String(a);
      const tgtStr = m.kind === "percent" ? `${m.target}%` : String(m.target);
      return `• ${m.label}: ${valStr}${m.target ? ` (${Math.round((a / m.target) * 100)}% of the ${tgtStr} target)` : ""}`;
    })
    .join("\n");
}

export function genOverviewBody(
  program: Program,
  metrics: Metric[],
  logs: Log[],
  grants: Grant[],
  expenses: Expense[],
  period: string,
  extraCtx: string,
): string {
  const fmt = (n: number) => "$" + n.toLocaleString();
  const score = impactScore(metrics, logs);
  const progGrants = grants.filter((g) => g.program_id === program.id);
  const fundingLines =
    progGrants.map((g) => `• ${g.funder_name}: ${fmt(g.amount)} (${burnPct(g, expenses)}% deployed)`).join("\n") ||
    "• Seeking funding partners";

  const lines: string[] = [
    `PROJECT OVERVIEW — ${program.name}`,
    `Period: ${period}`,
    "",
    "ABOUT",
    program.aim ?? "",
    "",
    "WHO WE SERVE",
    program.audience ?? "",
    "",
    "VERIFIED OUTCOMES (manager-approved)",
    verifiedLines(metrics, logs),
    "",
    `IMPACT SCORE: ${score} / 100`,
    "",
    "FUNDING",
    fundingLines,
  ];
  if (extraCtx) lines.push("", "ADDITIONAL CONTEXT", extraCtx);
  lines.push("", "This overview is built only from verified data and is designed to be adapted into future proposals for this program.");
  return lines.join("\n");
}

export function answerFor(
  q: string,
  program: Program,
  metrics: Metric[],
  logs: Log[],
  allGrants: Grant[],
  expenses: Expense[],
  grant: Grant | null,
  period: string,
): string {
  const lq = q.toLowerCase();
  const fmt = (n: number) => "$" + n.toLocaleString();
  const goals = goalMetrics(metrics);

  const find = (...keys: string[]): Metric | undefined =>
    metrics.find((m) => keys.some((k) => m.label.toLowerCase().includes(k)));

  const line = (m: Metric | undefined): string => {
    if (!m) return "";
    const a = aggregate(m, logs);
    return `${a}${m.target ? ` (${Math.round((a / m.target) * 100)}% of the ${m.target} target)` : ""}`;
  };

  const allFigs =
    goals.map((m) => `${m.label}: ${aggregate(m, logs)}`).join("; ") ||
    "verified activity across the program";

  const score = impactScore(metrics, logs);
  const progGrants = allGrants.filter((g) => g.program_id === program.id);
  const totalSpent = progGrants.reduce((a, g) => a + grantSpent(g.id, expenses), 0);
  const totalBudget = progGrants.reduce((a, g) => a + g.amount, 0);

  if (/(budget|fund|spent|money|cost|financ|resource)/.test(lq)) {
    if (grant) {
      const sp = grantSpent(grant.id, expenses);
      return `During ${period}, ${fmt(sp)} of the ${fmt(grant.amount)} ${grant.funder_name} grant was deployed (${Math.round((sp / Math.max(1, grant.amount)) * 100)}%), directed toward delivery of ${program.name}. Spending is tracked against committed deliverables and reviewed each reporting cycle.`;
    }
    return `Across ${program.name}, ${fmt(totalSpent)} of ${fmt(totalBudget)} in committed funding has been deployed (${Math.round((totalSpent / Math.max(1, totalBudget)) * 100)}%).`;
  }
  if (/(women|girl|equity|gender|inclusi|divers|underrepresent|marginal)/.test(lq)) {
    const m = find("women", "girl", "female", "equity");
    return m
      ? `Equity is central to ${program.name}: during ${period} we reached ${line(m)}. We serve ${program.audience ?? "our target group"}, and report demographic breakdowns every cycle.`
      : `We serve ${program.audience ?? "our target group"} and track participation to advance equitable access; demographic breakdowns are reported each cycle.`;
  }
  if (/(outcome|impact|achiev|result|deliver|progress|accomplish)/.test(lq)) {
    const main = goals[0];
    return `In ${period}, verified outcomes for ${program.name} included ${main ? main.label.toLowerCase() + " of " + line(main) : "measurable progress"}. Overall verified figures: ${allFigs}. Composite impact score: ${score}/100 — all manager-verified.`;
  }
  if (/(reach|participant|people|served|train|student|attend|enrol)/.test(lq)) {
    const m = find("people", "student", "reach", "participant", "train") ?? goals[0];
    return `During ${period}, ${program.name} reached ${line(m)}. These figures reflect manager-verified daily logs only.`;
  }
  if (/(challenge|risk|barrier|difficult|lesson|learn)/.test(lq)) {
    const behind = goals
      .filter((m) => aggregate(m, logs) / (m.target as number) < 0.65)
      .map((m) => m.label.toLowerCase());
    return behind.length
      ? `The main area needing attention this period is ${behind.join(" and ")}, where progress trails target; a corrective plan is in place. Other metrics are on track.`
      : `No significant delivery risks this period — all tracked metrics are on or near target. We continue to monitor capacity and participant follow-through.`;
  }
  if (/(sustain|future|next|continue|scale|plan|going forward)/.test(lq)) {
    return `Building on verified results (${allFigs}), ${program.name} plans to consolidate gains, deepen partnerships, and extend reach to more of our target group (${program.audience ?? "our community"}) in the next period.`;
  }
  if (/(partner|collaborat|stakeholder)/.test(lq)) {
    const funders = progGrants.map((g) => g.funder_name).filter(Boolean).join(", ");
    return `${program.name} works with community partners and ${funders || "funding partners"} to deliver and verify outcomes. We welcome introductions that extend reach to ${program.audience ?? "our target group"}.`;
  }
  const main = goals[0];
  return `For ${program.name} during ${period}: ${main ? main.label + " reached " + line(main) + ". " : ""}Verified figures: ${allFigs}. (Drawn from manager-verified logs — add any program-specific detail here.)`;
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
