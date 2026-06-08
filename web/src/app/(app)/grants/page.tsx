import Link from "next/link";
import { getGrants, getPrograms, getExpenses } from "@/lib/data";
import { burnPct, dueStatus } from "@/lib/impact";

export const dynamic = "force-dynamic";

const fmt = (n: number) => "$" + n.toLocaleString();

export default async function GrantsPage() {
  const [grants, programs, expenses] = await Promise.all([getGrants(), getPrograms(), getExpenses()]);
  const programName = (id: string | null) => programs.find((p) => p.id === id)?.name ?? "—";

  return (
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <h1 className="font-display text-2xl">Grants</h1>
        <p className="text-muted text-sm">Funding, budgets and report deadlines across every program.</p>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-5">
          <p className="text-muted text-sm">Click a grant to open its dashboard.</p>
          <Link
            href="/grants/new"
            className="inline-flex items-center gap-2 bg-lime text-green text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-lime-deep transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add grant
          </Link>
        </div>
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted text-xs uppercase tracking-wide">
              <tr className="border-b border-line">
                <th className="text-left p-3">Grant</th>
                <th className="text-left p-3">Program</th>
                <th className="text-left p-3">Funder</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Spent</th>
                <th className="text-left p-3">Next report</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => {
                const burn = burnPct(g, expenses);
                const d = dueStatus(g);
                const due =
                  d.n === Infinity ? "—" : d.n < 0 ? "Overdue" : `${d.n}d`;
                return (
                  <tr key={g.id} className="border-b border-line last:border-0 hover:bg-[#f7faf6]">
                    <td className="p-3 font-semibold">
                      <Link href={`/grants/${g.id}`} className="hover:underline">{g.name}</Link>
                    </td>
                    <td className="p-3">{programName(g.program_id)}</td>
                    <td className="p-3">{g.funder_name}</td>
                    <td className="p-3 text-right font-mono">{fmt(g.amount)}</td>
                    <td className="p-3 text-right font-mono">
                      {burn}% <span className="text-muted">of budget</span>
                    </td>
                    <td className="p-3">
                      {g.next_report ?? "—"}{" "}
                      <span className={d.n <= 7 ? "text-red-600" : d.n <= 14 ? "text-amber-600" : "text-green"}>
                        ({due})
                      </span>
                    </td>
                  </tr>
                );
              })}
              {grants.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted">No grants yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
