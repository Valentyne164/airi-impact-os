import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getPrograms, getGrants } from "@/lib/data";
import type { Report } from "@/types/database";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function FunderReportDetailPage({ params }: Props) {
  const profile = await getProfile();
  if (!profile || profile.role !== "funder") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();
  const report = data as Report;

  const [programs, grants] = await Promise.all([getPrograms(), getGrants()]);
  const program = programs.find((p) => p.id === report.program_id);
  const grant   = grants.find((g) => g.id === report.grant_id);

  return (
    <div>
      {/* Header */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/funder/reports"
            className="text-muted hover:text-ink transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl">{report.title}</h1>
            <p className="text-muted text-sm">
              {program?.name}
              {grant && <> · {grant.name}</>}
              {report.period_from && report.period_to && (
                <> · {report.period_from} to {report.period_to}</>
              )}
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
            Sent
          </span>
        </div>
      </div>

      <div className="p-8 max-w-3xl">
        {/* Lock note */}
        <div className="flex items-center gap-3 bg-[#e3f0e9] border border-[#cde2d5] text-green rounded-xl px-4 py-3 text-sm font-medium mb-6">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Manager-verified report — read-only. All data reflects approved outcomes only.
        </div>

        <div className="bg-white border border-line rounded-2xl p-6">
          {report.qa && report.qa.length > 0 ? (
            <div className="space-y-6">
              {report.qa.map((item, i) => (
                <div key={i}>
                  <p className="font-semibold text-sm mb-1.5 text-green">
                    Q{i + 1}. {item.q}
                  </p>
                  <p className="text-sm text-ink leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed">
              {report.body}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
