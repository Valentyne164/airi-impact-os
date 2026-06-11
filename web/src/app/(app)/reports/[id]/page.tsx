import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrograms } from "@/lib/data";
import { approveReport, rejectReport, sendReport } from "../actions";
import type { Report } from "@/types/database";

export const dynamic = "force-dynamic";

async function getReport(id: string): Promise<Report | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("reports").select("*").eq("id", id).single();
  return data as Report | null;
}

const STATUS_CLS: Record<string, string> = {
  pending:  "badge-amber",
  approved: "badge-green",
  rejected: "badge-red",
  sent:     "badge-blue",
  draft:    "badge-muted",
};

interface Props {
  params: { id: string };
}

export default async function ReportDetailPage({ params }: Props) {
  const [report, programs] = await Promise.all([getReport(params.id), getPrograms()]);
  if (!report) notFound();

  const program      = programs.find((p) => p.id === report.program_id);
  const approveAction = approveReport.bind(null, report.id);
  const rejectAction  = rejectReport.bind(null, report.id);
  const sendAction    = sendReport.bind(null, report.id);

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/reports?tab=list" className="text-muted hover:text-ink transition-colors flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-3xl text-ink leading-none">{report.title}</h1>
            <p className="page-subtitle flex items-center gap-2 flex-wrap">
              {program?.name}
              {report.period_from && report.period_to
                && ` · ${report.period_from} to ${report.period_to}`}
              <span className={STATUS_CLS[report.status] ?? "badge-muted"}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {report.status === "pending" && (
              <>
                <form action={approveAction}>
                  <button type="submit" className="btn btn-secondary btn-sm text-success">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Approve
                  </button>
                </form>
                <form action={rejectAction}>
                  <button type="submit" className="btn btn-danger-outline btn-sm">
                    Reject
                  </button>
                </form>
              </>
            )}
            {report.status === "approved" && (
              <form action={sendAction}>
                <button type="submit" className="btn btn-cta">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send to funder
                </button>
              </form>
            )}
            {report.status === "sent" && report.recipient_email && (
              <a href={`mailto:${report.recipient_email}?subject=${encodeURIComponent("AIRI report: " + report.title)}&body=${encodeURIComponent(report.body ?? "")}`}
                className="btn btn-secondary">
                Email again
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="page-body max-w-3xl">
        <div className="card-elevated p-7">
          {report.qa && report.qa.length > 0 ? (
            <div className="space-y-6">
              {report.qa.map((item, i) => (
                <div key={i}>
                  <p className="font-semibold text-sm text-ink mb-1.5">Q{i + 1}. {item.q}</p>
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
