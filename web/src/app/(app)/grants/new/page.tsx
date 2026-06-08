import { getPrograms, getMetrics } from "@/lib/data";
import NewGrantForm from "./NewGrantForm";

export const dynamic = "force-dynamic";

export default async function NewGrantPage() {
  const [programs, metrics] = await Promise.all([getPrograms(), getMetrics()]);
  return (
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <h1 className="font-display text-2xl">New Grant</h1>
        <p className="text-muted text-sm">
          Set up a grant and lock in its agreement commitments.
        </p>
      </div>
      <div className="p-8">
        <NewGrantForm programs={programs} allMetrics={metrics} />
      </div>
    </div>
  );
}
