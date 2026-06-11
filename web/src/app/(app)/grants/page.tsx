import Link from "next/link";
import { getGrants, getPrograms, getExpenses } from "@/lib/data";
import { burnPct, dueStatus } from "@/lib/impact";

export const dynamic = "force-dynamic";

const fmt = (n: number) => "$" + n.toLocaleString();

export default async function GrantsPage() {
  const [grants, programs, expenses] = await Promise.all([getGrants(), getPrograms(), getExpenses()]);
  const programName = (id: string | null) => programs.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-ink leading-none">Grants</h1>
            <p className="page-subtitle">Funding, budgets and report deadlines across every program.</p>
          </div>
          <Link href="/grants/new" className="btn btn-cta flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add grant
          </Link>
        </div>
      </div>

      <div className="page-body">
        {grants.length === 0 ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center max-w-xs">
              <div className="w-14 h-14 rounded-2xl bg-success-light grid place-items-center mx-auto mb-7">
                <svg className="w-7 h-7 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <h2 className="font-display text-2xl text-ink mb-3">No grants yet</h2>
              <p className="text-base text-muted leading-relaxed">Add your first grant to start tracking funding and report deadlines.</p>
              <Link href="/grants/new" className="btn btn-cta mt-7">Add first grant</Link>
            </div>
          </div>
        ) : (
          <div className="card-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f2f5f2]">
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Grant</th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Program</th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Funder</th>
                  <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Amount</th>
                  <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Spent</th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Next report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f7f5]">
                {grants.map((g) => {
                  const burn = burnPct(g, expenses);
                  const d    = dueStatus(g);
                  const due  = d.n === Infinity ? "—" : d.n < 0 ? "Overdue" : `${d.n}d`;
                  const dueColor = d.n <= 7 ? "text-red-600" : d.n <= 14 ? "text-amber-600" : "text-success";
                  return (
                    <tr key={g.id} className="hover:bg-surface transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/grants/${g.id}`}
                          className="font-semibold text-ink group-hover:text-green transition-colors">
                          {g.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-muted">{programName(g.program_id)}</td>
                      <td className="px-6 py-4 text-muted">{g.funder_name ?? "—"}</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-ink">{fmt(g.amount)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-semibold text-ink">{burn}%</span>
                        <span className="text-muted text-xs ml-1">of budget</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-ink">{g.next_report ?? "—"}</span>
                        {d.n !== Infinity && (
                          <span className={`ml-2 text-xs font-semibold ${dueColor}`}>({due})</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
