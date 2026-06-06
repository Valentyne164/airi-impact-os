import Link from "next/link";
import { notFound } from "next/navigation";
import { getGrant, getCommitments, getMetrics, getApprovedLogs, getExpenses, getPrograms } from "@/lib/data";
import {
  grantSpent, burnPct, termElapsed, burnStatus,
  commitmentActual, agreementHealth, dueStatus, DEADLINE_STAGES,
} from "@/lib/impact";

export const dynamic = "force-dynamic";

const fmt = (n: number) => "$" + n.toLocaleString();

export default async function GrantDashboard({ params }: { params: { id: string } }) {
  const grant = await getGrant(params.id);
  if (!grant) notFound();

  const [commitments, allMetrics, logs, expenses, programs] = await Promise.all([
    getCommitments(grant.id), getMetrics(), getApprovedLogs(), getExpenses(), getPrograms(),
  ]);

  const metrics = allMetrics.filter((m) => m.program_id === grant.program_id);
  const program = programs.find((p) => p.id === grant.program_id) ?? null;
  const ctx = { metrics, logs, grant, expenses };

  const spent = grantSpent(grant.id, expenses);
  const burn = burnPct(grant, expenses);
  const te = termElapsed(grant);
  const bs = burnStatus(grant, expenses);
  const health = agreementHealth(commitments, ctx);
  const d = dueStatus(grant);

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
      <div className="text-muted text-sm font-semibold">{label}</div>
      <div className="font-mono text-2xl font-semibold mt-2">{value}</div>
      {sub && <div className="text-sm font-semibold text-green mt-1">{sub}</div>}
    </div>
  );

  return (
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <Link href="/grants" className="text-sm text-muted hover:underline">← All grants</Link>
        <h1 className="font-display text-2xl mt-1">{grant.name}</h1>
        <p className="text-muted text-sm">
          {grant.funder_name} · {program ? <>funds <b>{program.name}</b></> : <span className="text-amber-600">not linked to a program</span>}
        </p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <Tile label="Funding" value={fmt(grant.amount)} sub={grant.term_start ? `${grant.term_start} → ${grant.term_end}` : undefined} />
          <Tile label="Spent" value={fmt(spent)} sub={`${burn}% of budget`} />
          <Tile label="Remaining" value={fmt(grant.amount - spent)} sub={`${100 - burn}% left`} />
          {te !== null && <Tile label="Time elapsed" value={`${te}%`} sub={bs.label} />}
          {commitments.length > 0 && <Tile label="Agreement health" value={`${health.overall}%`} sub={`${health.met}/${health.total} met`} />}
          <Tile label="Next report" value={d.n === Infinity ? "—" : d.n < 0 ? "Overdue" : `${d.n}d`} sub={grant.next_report ?? undefined} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {/* Impact accountability */}
          <section className="bg-white border border-line rounded-2xl p-5">
            <h2 className="font-display text-lg mb-3">Impact accountability</h2>
            {commitments.length === 0 ? (
              <p className="text-muted text-sm">
                No commitments yet. {program ? "Add this grant's agreement to track its promises." : "Link a program, then add the agreement."}
              </p>
            ) : (
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
                    const r = commitmentActual(c, ctx);
                    const status = r.met ? "Met" : r.pct >= 65 ? "On track" : "Behind";
                    const tone = r.met ? "text-green" : r.pct >= 65 ? "text-amber-600" : "text-red-600";
                    return (
                      <tr key={c.id} className="border-b border-line last:border-0">
                        <td className="p-2">
                          <div className="font-semibold">{c.label}</div>
                          <div className="text-muted text-xs">{r.sub} · from {r.src}</div>
                        </td>
                        <td className="p-2 text-right font-mono">{r.display.split(" / ")[0]}</td>
                        <td className="p-2 text-right font-mono">{Math.min(999, r.pct)}%</td>
                        <td className={`p-2 font-semibold ${tone}`}>{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Finance + reporting */}
          <div className="flex flex-col gap-6">
            <section className="bg-white border border-line rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg">Budget vs time</h2>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${bs.tone === "bad" ? "bg-red-100 text-red-700" : bs.tone === "warn" ? "bg-amber-100 text-amber-700" : "bg-green/10 text-green"}`}>
                  {bs.label}
                </span>
              </div>
              <div className="text-xs text-muted">Budget spent</div>
              <div className="h-2.5 bg-paper rounded-full mt-1 mb-1 overflow-hidden">
                <div className="h-full bg-green" style={{ width: `${Math.min(100, burn)}%` }} />
              </div>
              <div className="text-right font-mono text-xs">{burn}%</div>
              {te !== null && (
                <>
                  <div className="text-xs text-muted mt-3">Time elapsed</div>
                  <div className="h-2.5 bg-paper rounded-full mt-1 mb-1 overflow-hidden">
                    <div className="h-full bg-lime-deep" style={{ width: `${te}%` }} />
                  </div>
                  <div className="text-right font-mono text-xs">{te}%</div>
                </>
              )}
            </section>

            <section className="bg-white border border-line rounded-2xl p-5">
              <h2 className="font-display text-lg mb-3">Reporting</h2>
              <div className="flex gap-2 flex-wrap">
                {DEADLINE_STAGES.map((s) => {
                  const done = d.n <= s.offset;
                  const cur = d.current?.key === s.key;
                  return (
                    <div key={s.key}
                      className={`flex-1 min-w-[110px] rounded-xl border p-3 text-xs ${cur ? "border-amber-400 bg-amber-50" : done ? "border-green/30 bg-green/5" : "border-line bg-paper/40 opacity-60"}`}>
                      <b>{s.label}</b>
                      <div className="text-muted">{s.offset === 0 ? "on due date" : `${s.offset}d before`}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
