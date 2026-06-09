import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGrant, getCommitments, getMetrics, getApprovedLogs, getExpenses, getPrograms,
} from "@/lib/data";
import {
  grantSpent, burnPct, termElapsed, burnStatus,
  commitmentActual, agreementHealth, dueStatus, DEADLINE_STAGES,
} from "@/lib/impact";
import { addExpense } from "./actions";
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

  const burnTone = bs.tone === "bad"  ? "bg-red-100 text-red-700"
                 : bs.tone === "warn" ? "bg-amber-100 text-amber-700"
                 : "bg-[#e3f0e9] text-green";

  return (
    <div>
      {/* ── Sticky header ── */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <Link href="/grants" className="text-xs font-semibold text-muted hover:underline">
          ← All grants
        </Link>
        <div className="flex items-start justify-between mt-1 gap-4">
          <div>
            <h1 className="font-display text-2xl">{grant.name}</h1>
            <p className="text-muted text-sm">
              {grant.funder_name}
              {" · "}
              {program
                ? <>funds <b className="text-ink">{program.name}</b></>
                : <span className="text-amber-600">not linked to a program</span>}
              {grant.funder_email && ` · ${grant.funder_email}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Deadline badge */}
            {d.n < 0 ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Overdue</span>
            ) : d.n <= 7 ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Due in {d.n}d</span>
            ) : d.n <= 21 ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Due in {d.n}d</span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e3f0e9] text-green">{d.n}d out</span>
            )}
            <Link
              href={`/grants/${grant.id}/edit`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </Link>
            <DeleteButton
              action={deleteGrant.bind(null, grant.id)}
              confirmMessage={`Delete "${grant.name}" permanently?\n\nThis removes all linked commitments and expenses. This CANNOT be undone.`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete
            </DeleteButton>
            <Link
              href={`/agreement?grant=${grant.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>
              </svg>
              {commitments.length > 0 ? "Edit agreement" : "Add agreement"}
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Report
            </Link>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* ── KPI tiles ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Funding",      val: fmt(grant.amount),        sub: grant.term_start ? `${grant.term_start} → ${grant.term_end}` : undefined },
            { label: "Spent",        val: fmt(spent),               sub: `${burn}% of budget`,            tone: burn > 70 ? "text-amber-600" : "text-green" },
            { label: "Remaining",    val: fmt(grant.amount - spent), sub: `${100 - burn}% left`,           tone: "text-green" },
            ...(te !== null ? [{ label: "Time elapsed", val: `${te}%`,  sub: bs.label,                    tone: bs.tone === "bad" ? "text-red-600" : bs.tone === "warn" ? "text-amber-600" : "text-green" }] : []),
            ...(commitments.length > 0 ? [{ label: "Agreement health", val: `${health.overall}%`, sub: `${health.met}/${health.total} met`, tone: "text-green" }] : []),
            { label: "Next report",  val: d.n === Infinity ? "—" : d.n < 0 ? "Overdue" : `${d.n}d`, sub: grant.next_report ?? undefined, tone: d.n <= 7 ? "text-red-600" : d.n <= 14 ? "text-amber-600" : "text-green" },
          ].map(({ label, val, sub, tone }) => (
            <div key={label} className="bg-[#f7fbf7] rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted/80 mb-2">{label}</div>
              <div className="font-mono text-2xl font-bold leading-none">{val}</div>
              {sub && <div className={`text-sm font-medium mt-1.5 ${tone ?? "text-muted"}`}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* ── 2-column body ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── LEFT: Impact accountability ── */}
          <section className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg">Impact accountability</h2>
              {commitments.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e8f0ff] text-[#4a7aff]">
                  vs verified data
                </span>
              )}
            </div>

            {commitments.length === 0 ? (
              <div className="py-8 text-center">
                <svg className="w-8 h-8 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>
                </svg>
                <p className="font-display text-base text-muted">No commitments yet</p>
                <p className="text-sm text-muted mt-1">
                  {program
                    ? "Paste this grant's agreement to track its promises."
                    : "Link this grant to a program, then add its agreement."}
                </p>
                <Link
                  href={`/agreement?grant=${grant.id}`}
                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white hover:bg-green-900 transition-colors"
                >
                  Open Agreement Engine
                </Link>
              </div>
            ) : (
              <>
                {/* Bar chart */}
                <div className="h-[190px] flex items-end gap-4 pt-3 px-1 mb-4">
                  {commitments.map((c) => {
                    const r   = commitmentActual(c, ctx);
                    const pct = Math.min(100, r.pct);
                    return (
                      <div key={c.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className={`font-mono text-xs font-semibold ${r.unlinked ? "text-muted/50" : r.met ? "text-green" : "text-muted"}`}>
                          {r.unlinked ? "—" : `${Math.min(999, r.pct)}%`}
                        </span>
                        <div className="w-full max-w-[50px] bg-[#eef2ee] rounded-t-xl h-full flex items-end overflow-hidden">
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
                        <span className="text-muted text-[11px] font-semibold text-center leading-tight max-w-[60px] truncate">
                          {c.label.split(" ").slice(0, 2).join(" ")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Detail table */}
                <table className="w-full text-sm">
                  <thead className="text-muted text-xs uppercase tracking-wide">
                    <tr className="border-b border-line">
                      <th className="text-left p-2">Commitment</th>
                      <th className="text-right p-2">Verified</th>
                      <th className="text-right p-2">%</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commitments.map((c) => {
                      const r      = commitmentActual(c, ctx);
                      const status = r.unlinked ? "Not linked"
                                   : r.met       ? "Met"
                                   : r.pct >= 65 ? "On track"
                                   :               "Behind";
                      const tone   = r.unlinked   ? "bg-[#f0f2f0] text-muted"
                                   : r.met         ? "bg-[#e4f5ec] text-[#1f9d6b]"
                                   : r.pct >= 65   ? "bg-amber-100 text-amber-700"
                                   :                 "bg-red-100 text-red-700";
                      return (
                        <tr key={c.id} className="border-b border-line last:border-0">
                          <td className="p-2">
                            <div className="font-semibold">{c.label}</div>
                            <div className="text-muted text-xs">
                              {r.unlinked
                                ? "Not linked — link a metric to track progress"
                                : `${r.sub} · from ${r.src}`}
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono text-muted">
                            {r.unlinked ? "—" : r.display.split(" / ")[0]}
                          </td>
                          <td className="p-2 text-right font-mono text-muted">
                            {r.unlinked ? "—" : `${Math.min(999, r.pct)}%`}
                          </td>
                          <td className="p-2">
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${tone}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </section>

          {/* ── RIGHT: Budget vs time + Expenses + Reporting ── */}
          <div className="flex flex-col gap-6">

            {/* Budget vs time */}
            <section className="bg-white border border-line rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg">Budget vs time</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${burnTone}`}>
                  {bs.label}
                </span>
              </div>
              <div className="text-xs font-semibold text-muted mb-1.5">Budget spent</div>
              <div className="h-2.5 bg-[#eef2ee] rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, burn)}%`, background: "linear-gradient(90deg,#084734,#0a5a42)" }} />
              </div>
              <div className="text-right font-mono text-xs text-muted mb-3">{burn}%</div>

              {te !== null && (
                <>
                  <div className="text-xs font-semibold text-muted mb-1.5">Time elapsed</div>
                  <div className="h-2.5 bg-[#eef2ee] rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${te}%`, background: "linear-gradient(90deg,#acd84e,#cef17b)" }} />
                  </div>
                  <div className="text-right font-mono text-xs text-muted mb-3">{te}%</div>
                  <p className="text-xs text-muted leading-relaxed">
                    {burn > te + 12
                      ? `Spending is ahead of the timeline (${burn}% of budget vs ${te}% of the term). Worth reviewing burn rate before the next report.`
                      : burn < te - 15
                      ? `Underspending relative to the timeline (${burn}% spent vs ${te}% elapsed) — funds may need to be deployed faster.`
                      : `Spending is well-paced: ${burn}% of budget against ${te}% of the grant term.`}
                  </p>
                </>
              )}
            </section>

            {/* Expenses */}
            <section className="bg-white border border-line rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-lg">Expenses</h2>
                <span className="text-xs text-muted">Spent = sum of entries</span>
              </div>
              <p className="text-muted text-xs mb-4">
                Finance is logged by the manager, not staff. Each expense backs the "Spent" figure
                with an invoice reference.
              </p>

              {/* Expense form */}
              <form action={addExpenseAction}>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Amount ($)</label>
                    <input name="amount" type="number" placeholder="5000" min="0" step="0.01"
                      className="w-full px-2.5 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Category</label>
                    <input name="category" placeholder="e.g. Venue"
                      className="w-full px-2.5 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Invoice ref</label>
                    <input name="invoice" placeholder="inv-001.pdf"
                      className="w-full px-2.5 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green" />
                  </div>
                </div>
                <button type="submit"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl bg-green text-white hover:bg-green-900 transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Log expense
                </button>
              </form>

              {/* Ledger */}
              <div className="text-xs font-bold uppercase tracking-wide text-muted mt-5 mb-2">Ledger</div>
              {grantExpenses.length > 0 ? (
                <div className="border border-line rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="text-muted text-xs uppercase tracking-wide">
                      <tr className="border-b border-line bg-paper/40">
                        <th className="text-left p-2.5">Date</th>
                        <th className="text-left p-2.5">Category</th>
                        <th className="text-right p-2.5">Amount</th>
                        <th className="text-left p-2.5">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grantExpenses.map((e) => (
                        <tr key={e.id} className="border-b border-line last:border-0">
                          <td className="p-2.5 font-mono text-xs">{e.expense_date}</td>
                          <td className="p-2.5">{e.category ?? "—"}</td>
                          <td className="p-2.5 text-right font-mono">{fmt(e.amount)}</td>
                          <td className="p-2.5 text-xs text-muted">{e.invoice_ref ?? "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-paper/40">
                        <td colSpan={2} className="p-2.5 font-semibold text-sm">Total spent</td>
                        <td className="p-2.5 text-right font-mono font-bold">{fmt(spent)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-xs italic py-4 text-center">No expenses logged yet.</p>
              )}
            </section>

            {/* Reporting timeline */}
            <section className="bg-white border border-line rounded-2xl p-5">
              <h2 className="font-display text-lg mb-4">Reporting</h2>
              <div className="flex gap-2 flex-wrap mb-4">
                {DEADLINE_STAGES.map((s) => {
                  const done = d.n <= s.offset;
                  const cur  = d.current?.key === s.key;
                  return (
                    <div key={s.key}
                      className={`flex-1 min-w-[110px] rounded-xl border p-3 text-xs transition-colors
                        ${cur  ? "border-amber-400 bg-amber-50"
                        : done ? "border-green/30 bg-green/5"
                        :        "border-line bg-paper/40 opacity-50"}`}>
                      <b className="block mb-0.5">{s.label}</b>
                      <span className="text-muted">{s.offset === 0 ? "on due date" : `${s.offset}d before`}</span>
                    </div>
                  );
                })}
              </div>
              {d.current && (
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
