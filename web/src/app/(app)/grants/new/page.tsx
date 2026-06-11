import { getPrograms, getMetrics } from "@/lib/data";
import NewGrantForm from "./NewGrantForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewGrantPage() {
  const [programs, metrics] = await Promise.all([getPrograms(), getMetrics()]);
  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/grants" className="text-muted hover:text-ink transition-colors flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-3xl text-ink leading-none">New Grant</h1>
            <p className="page-subtitle">Set up a grant and lock in its agreement commitments.</p>
          </div>
        </div>
      </div>
      <div className="page-body">
        <NewGrantForm programs={programs} allMetrics={metrics} />
      </div>
    </div>
  );
}
