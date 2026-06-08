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

const STATUS_STYLE: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-[#e4f5ec] text-[#1f9d6b]",
  rejected: "bg-red-100 text-red-600",
  sent:     "bg-blue-100 text-blue-700",
  draft:    "bg-[#f3f4f6] text-muted",
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
    <div>
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/reports?tab=list"
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
              {report.period_from && report.period_to
                && ` · ${report.period_from} to ${report.period_to}`}
              {" · "}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                STATUS_STYLE[report.status] ?? STATUS_STYLE.draft
              }`}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {report.status === "pending" && (
              <>
                <form action={approveAction}>
                  <button type="submit"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-[#e4f5ec] text-[#1f9d6b] hover:bg-lime hover:text-green transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Approve
                  </button>
                </form>
                <form action={rejectAction}>
                  <button type="submit"
                    className="text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Reject
                  </button>
                </form>
              </>
            )}
            {report.status === "approved" && (
              <form action={sendAction}>
                <button type="submit"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-lime text-green hover:bg-lime-deep transition-colors">
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
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-line bg-paper hover:bg-white transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email again
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-3xl">
        <div className="bg-white border border-line rounded-2xl p-6">
          {report.qa && report.qa.length > 0 ? (
            <div className="space-y-6">
              {report.qa.map((item, i) => (
                <div key={i}>
                  <p className="font-semibold text-sm mb-1.5">Q{i + 1}. {item.q}</p>
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
