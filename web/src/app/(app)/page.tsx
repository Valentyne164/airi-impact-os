import { getPrograms, getMetrics, getGrants, getApprovedLogs, getExpenses, getCommitments } from "@/lib/data";
import { aggregate, impactScore, grantSpent, agreementHealth, dueStatus } from "@/lib/impact";
import Link from "next/link";

export const dynamic = "force-dynamic"; // always read fresh data

export default async function ExecutivePage() {
  const [programs, metrics, grants, logs, expenses, commitments] = await Promise.all([
    getPrograms(), getMetrics(), getGrants(), getApprovedLogs(), getExpenses(), getCommitments(),
  ]);

  const funding = grants.reduce((a, g) => a + g.amount, 0);
  const reach = programs.reduce((a, p) => {
    const m = metrics.find((x) => x.program_id === p.id && x.kind === "number");
    return a + (m ? aggregate(m, logs) : 0);
  }, 0);
  const avgImpact = programs.length
    ? Math.round(programs.reduce((a, p) => a + impactScore(metrics.filter((m) => m.program_id === p.id), logs), 0) / programs.length)
    : 0;
  const reportsDue = grants.filter((g) => dueStatus(g).n <= 14).length;
  const fmt = (n: number) => "$" + n.toLocaleString();

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
      <div className="text-muted text-sm font-semibold">{label}</div>
      <div className="font-mono text-3xl font-semibold mt-2">{value}</div>
      {sub && <div className="text-sm font-semibold text-green mt-1">{sub}</div>}
    </div>
  );

  return (
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Executive Dashboard</h1>
        <p className="text-muted text-sm">The whole organisation at a glance.</p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
          <Tile label="Funding active" value={fmt(funding)} sub={`${grants.length} grants`} />
          <Tile label="People reached" value={reach} sub="verified" />
          <Tile label="Programs" value={programs.length} />
          <Tile label="Reports due" value={reportsDue} sub="within 14 days" />
          <Tile label="Impact score" value={`${avgImpact}%`} />
        </div>

        <h2 className="font-display text-lg mt-8 mb-3">Grants</h2>
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted text-xs uppercase tracking-wide">
              <tr className="border-b border-line">
                <th className="text-left p-3">Grant</th>
                <th className="text-left p-3">Funder</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Spent</th>
                <th className="text-right p-3">Agreement health</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => {
                const gc = commitments.filter((c) => c.grant_id === g.id);
                const pMetrics = metrics.filter((m) => m.program_id === g.program_id);
                const h = agreementHealth(gc, { metrics: pMetrics, logs, grant: g, expenses });
                const spent = grantSpent(g.id, expenses);
                return (
                  <tr key={g.id} className="border-b border-line last:border-0 hover:bg-[#f7faf6]">
                    <td className="p-3 font-semibold">
                      <Link href={`/grants/${g.id}`} className="hover:underline">{g.name}</Link>
                    </td>
                    <td className="p-3">{g.funder_name}</td>
                    <td className="p-3 text-right font-mono">{fmt(g.amount)}</td>
                    <td className="p-3 text-right font-mono">{fmt(spent)}</td>
                    <td className="p-3 text-right font-mono">{gc.length ? `${h.overall}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
