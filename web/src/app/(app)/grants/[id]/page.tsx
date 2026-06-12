import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGrant, getCommitments, getMetrics, getApprovedLogs, getExpenses, getPrograms,
} from "@/lib/data";
import {
  grantSpent, burnPct, termElapsed, burnStatus,
  commitmentActual, agreementHealth, dueStatus, DEADLINE_STAGES,
} from "@/lib/impact";
import { addExpense, deleteExpense } from "./actions";
import { deleteGrant } from "./edit/actions";
import DeleteButton from "../../DeleteButton";

export const dynamic = "force-dynamic";

const fmt = (n: number) => "$" + n.toLocaleString();

export default async function GrantDashboard({ params }: { params: { id: string } }) {
  const grant = await getGrant(params.id);
  if (!grant) notFound();

  const [commitments, allMetrics, logs, expenses, programs] = await Promise.all([
    getCommitments(grant.id), getMetrics(), getApprovedLogs(), getExpenses(), getPrograms(),
  ]);

  const metrics       = allMetrics.filter((m) => m.program_id === grant.program_id);
  const program       = programs.find((p) => p.id === grant.program_id) ?? null;
  const grantExpenses = expenses.filter((e) => e.grant_id === grant.id);
  const ctx           = { metrics, logs, grant, expenses };

  const spent  = grantSpent(grant.id, expenses);
  const burn   = burnPct(grant, expenses);
  const te     = termElapsed(grant);
  const bs     = burnStatus(grant, expenses);
  const health = agreementHealth(commitments, ctx);
  const d      = dueStatus(grant);

  const addExpenseAction = addExpense.bind(null, grant.id);

  const deadlineBadge =
    d.n < 0     ? "badge-red"   :
    d.n <= 7    ? "badge-red"   :
    d.n <= 21   ? "badge-amber" : "badge-green";
  const deadlineText =
    d.n < 0            ? "Overdue"        :
    d.n === Infinity   ? "No deadline"    :
    d.n <= 7           ? `Due in ${d.n}d` :
    d.n <= 21          ? `Due in ${d.n}d` : `${d.n}d out`;

  const kpis = [
    { label: "Funding",         val: fmt(grant.amount),        sub: grant.term_start ? `${grant.term_start} → ${grant.term_end ?? "—"}` : undefined, tone: "text-muted" },
    { label: "Spent",           val: fmt(spent),               sub: `${burn}% of budget`,    tone: burn > 70 ? "text-amber-600" : "text-success" },
    { label: "Remaining",       val: fmt(grant.amount - spent), sub: `${100 - burn}% left`,  tone: "text-success" },
    ...(te !== null ? [{ label: "Time elapsed", val: `${te}%`, sub: bs.label, tone: bs.tone === "bad" ? "text-red-600" : bs.tone === "warn" ? "text-amber-600" : "text-success" }] : []),
    ...(commitments.length > 0 ? [{ label: "Agreement health", val: `${health.overall}%`, sub: `${health.met}/${health.total} met`, tone: health.overall >= 80 ? "text-success" : health.overall >= 55 ? "text-amber-600" : "text-red-600" }] : []),
  ];

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Sticky header ── */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-0.5">
          <Link href="/grants" className="text-xs font-semibold text-muted hover:text-ink transition-colors flex-shrink-0">
            ← All grants
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4 mt-1">
          <div className="min-w-0">
            <h1 className="font-display text-3xl text-ink leading-none truncate">{grant.name}</h1>
            <p className="page-subtitle">
              {grant.funder_name}
              {" · "}
              {program
                ? <>funds <strong className="text-ink font-semibold">{program.name}</strong></>
                : <span className="text-amber-600">not linked to a program</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <span className={`${deadlineBadge} flex-shrink-0`}>{deadlineText}</span>
            <Link href={`/grants/${grant.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
            <Link href={`/agreement?grant=${grant.id}`} className="btn btn-secondary btn-sm whitespace-nowrap">
              {commitments.length > 0 ? "Edit agreement" : "Add agreement"}
            </Link>
            <Link href="/reports" className="btn btn-secondary btn-sm">Report</Link>
            <DeleteButton
              action={deleteGrant.bind(null, grant.id)}
              confirmMessage={`Delete "${grant.name}" permanently?\n\nThis removes all linked commitments and expenses. This CANNOT be undone.`}
              className="btn btn-ghost btn-sm text-muted hover:text-red-600"
            >
              Delete
            </DeleteButton>
          </div>
        </div>
      </div>

      <div className="page-body space-y-6">

        {/* ── KPI tiles ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {kpis.map(({ label, val, sub, tone }) => (
            <div key={label} className="card-elevated p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-4 leading-none">{label}</p>
              <p className="font-mono text-3xl font-black leading-none text-ink tracking-tight">{val}</p>
              {sub && <p className={`text-sm font-medium mt-2 leading-snug ${tone}`}>{sub}</p>}
            </div>
          ))}
          {/* Next report tile */}
          <div className="card-elevated p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-4 leading-none">Next report</p>
            <p className={`font-mono text-3xl font-black leading-none tracking-tight ${d.n <= 7 ? "text-red-600" : d.n <= 14 ? "text-amber-600" : "text-ink"}`}>
              {d.n === Infinity ? "—" : d.n < 0 ? "Overdue" : `${d.n}d`}
            </p>
            {grant.next_report && <p className="text-sm text-muted font-medium mt-2">{grant.next_report}</p>}
          </div>
        </div>

        {/* ── 2-col body ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── Impact accountability ── */}
          <section className="card-elevated p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl text-ink">Impact accountability</h2>
              {commitments.length > 0 && (
                <span className="badge-blue">vs verified data</span>
              )}
            </div>

            {commitments.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-success-light grid place-items-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>
                  </svg>
                </div>
                <p className="font-semibold text-sm text-ink mb-1">No commitments yet</p>
                <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                  {program
                    ? "Paste this grant's agreement to track its promises."
                    : "Link this grant to a program, then add its agreement."}
                </p>
                <Link href={`/agreement?grant=${grant.id}`} className="btn btn-primary mt-6 inline-flex">
                  Open Agreement Engine
                </Link>
              </div>
            ) : (
              <>
                {/* Bar chart */}
                <div className="h-[180px] flex items-end gap-3 px-1 mb-6">
                  {commitments.map((c) => {
                    const r   = commitmentActual(c, ctx);
                    const pct = Math.min(100, r.pct);
                    return (
                      <div key={c.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className={`font-mono text-xs font-semibold ${r.unlinked ? "text-muted/40" : r.met ? "text-success" : "text-muted"}`}>
                          {r.unlinked ? "—" : `${Math.min(999, r.pct)}%`}
                        </span>
                        <div className="w-full max-w-[48px] bg-surface rounded-t-xl h-full flex items-end overflow-hidden">
                          <div
                            className="w-full rounded-t-xl min-h-[6px] transition-all duration-700"
                            style={{
                              height: r.unlinked ? "6px" : `${Math.max(6, pct)}%`,
                              background: r.unlinked
                                ? "#d5ddd5"
                                : r.met
                                  ? "linear-gradient(180deg,#cef17b,#acd84e)"
                                  : "linear-gradient(180deg,#0a5a42,#084734)",
                            }}
                          />
                        </div>
                        <span className="text-muted text-[10px] font-semibold text-center leading-tight max-w-[60px] truncate">
                          {c.label.split(" ").slice(0, 2).join(" ")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Detail rows */}
                <div className="divide-y divide-[#f5f7f5]">
                  {commitments.map((c) => {
                    const r      = commitmentActual(c, ctx);
                    const status = r.unlinked ? "Not linked" : r.met ? "Met" : r.pct >= 65 ? "On track" : "Behind";
                    const badge  = r.unlinked ? "badge-muted" : r.met ? "badge-green" : r.pct >= 65 ? "badge-amber" : "badge-red";
                    return (
                      <div key={c.id} className="py-3.5 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-ink leading-snug">{c.label}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {r.unlinked ? "Not linked — link a metric to track progress" : `${r.sub} · from ${r.src}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-mono text-sm font-semibold text-ink">
                            {r.unlinked ? "—" : r.display.split(" / ")[0]}
                          </p>
                          <p className="text-xs text-muted">
                            {r.unlinked ? "" : `${Math.min(999, r.pct)}%`}
                          </p>
                        </div>
                        <span className={`${badge} flex-shrink-0`}>{status}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── RIGHT column ── */}
          <div className="flex flex-col gap-6">

            {/* Budget vs time */}
            <section className="card-elevated p-7">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl text-ink">Budget vs time</h2>
                <span className={
                  bs.tone === "bad"  ? "badge-red"   :
                  bs.tone === "warn" ? "badge-amber" : "badge-green"
                }>{bs.label}</span>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">Budget spent</span>
                    <span className="font-mono text-xs font-semibold text-ink">{burn}%</span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, burn)}%`, background: "linear-gradient(90deg,#084734,#0a5a42)" }} />
                  </div>
                </div>

                {te !== null && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Time elapsed</span>
                        <span className="font-mono text-xs font-semibold text-ink">{te}%</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${te}%`, background: "linear-gradient(90deg,#acd84e,#cef17b)" }} />
                      </div>
                    </div>
                    <p className="text-sm text-muted leading-relaxed">
                      {burn > te + 12
                        ? `Spending is ahead of the timeline (${burn}% of budget vs ${te}% of the term). Worth reviewing burn rate before the next report.`
                        : burn < te - 15
                        ? `Underspending relative to the timeline (${burn}% spent vs ${te}% elapsed) — funds may need to be deployed faster.`
                        : `Spending is well-paced: ${burn}% of budget against ${te}% of the grant term.`}
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* Expenses */}
            <section className="card-elevated p-7">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-xl text-ink">Expenses</h2>
                <span className="text-xs text-muted">Manager-logged only</span>
              </div>
              <p className="text-sm text-muted mb-6 leading-relaxed">
                Each expense backs the "Spent" figure with an invoice reference.
              </p>

              <form action={addExpenseAction} className="mb-6">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="field-label">Amount ($)</label>
                    <input name="amount" type="number" placeholder="5000" min="0" step="0.01"
                      className="field-input-sm" />
                  </div>
                  <div>
                    <label className="field-label">Category</label>
                    <input name="category" placeholder="e.g. Venue" className="field-input-sm" />
                  </div>
                  <div>
                    <label className="field-label">Invoice ref</label>
                    <input name="invoice" placeholder="inv-001.pdf" className="field-input-sm" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Log expense
                </button>
              </form>

              <p className="field-label mb-3">Ledger</p>
              {grantExpenses.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-[#f0f2f0]">
                  <table className="w-full text-sm">
                    <thead className="bg-surface border-b border-[#f0f2f0]">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted">Date</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted">Category</th>
                        <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted">Amount</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted">Invoice</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f7f5]">
                      {grantExpenses.map((e) => (
                        <tr key={e.id} className="group">
                          <td className="px-4 py-3 font-mono text-xs text-muted">{e.expense_date}</td>
                          <td className="px-4 py-3 text-sm">{e.category ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{fmt(e.amount)}</td>
                          <td className="px-4 py-3 text-xs text-muted">{e.invoice_ref ?? "—"}</td>
                          <td className="px-4 py-3">
                            <DeleteButton
                              action={deleteExpense.bind(null, e.id, grant.id)}
                              confirmMessage={`Delete this expense?\n\n${e.category ?? "General"} — ${fmt(e.amount)}${e.invoice_ref ? `\nInvoice: ${e.invoice_ref}` : ""}\n\nThis cannot be undone.`}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                              </svg>
                            </DeleteButton>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-surface">
                        <td colSpan={2} className="px-4 py-3 font-semibold text-sm">Total spent</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-sm">{fmt(spent)}</td>
                        <td /><td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-6">No expenses logged yet.</p>
              )}
            </section>

            {/* Reporting timeline */}
            <section className="card-elevated p-7">
              <h2 className="font-display text-xl text-ink mb-6">Reporting</h2>
              <div className="flex gap-2 flex-wrap mb-5">
                {DEADLINE_STAGES.map((s) => {
                  const done = d.n <= s.offset;
                  const cur  = d.current?.key === s.key;
                  return (
                    <div key={s.key}
                      className={`flex-1 min-w-[110px] rounded-xl p-4 text-xs transition-colors border
                        ${cur  ? "border-amber-300 bg-amber-50"
                        : done ? "border-success/20 bg-success-light/40"
                        :        "border-line bg-surface/60 opacity-50"}`}>
                      <strong className="block mb-1 text-ink">{s.label}</strong>
                      <span className="text-muted">{s.offset === 0 ? "on due date" : `${s.offset}d before`}</span>
                    </div>
                  );
                })}
              </div>
              {d.current && (
                <div className="flex items-center gap-2.5 text-xs font-semibold px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {d.current.label} stage active
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
