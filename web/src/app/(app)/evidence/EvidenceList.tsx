"use client";

import { useState } from "react";

export interface EvidenceLog {
  id: string;
  log_date: string;
  narrative: string | null;
  programName: string;
  attachments: Array<{
    id: string;
    file_name: string;
    kind: string | null;
    url: string | null;
  }>;
}

function openFile(url: string | null, name: string) {
  if (url) {
    window.open(url, "_blank");
  } else {
    alert(`Demo file: ${name} (files open once attached via staff log submission)`);
  }
}

export default function EvidenceList({ logs }: { logs: EvidenceLog[] }) {
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? logs.filter((l) =>
        `${l.programName} ${l.narrative ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      )
    : logs;

  return (
    <div className="p-8 max-w-3xl">
      {/* Lock note */}
      <div className="flex items-center gap-3 bg-[#e3f0e9] border border-[#cde2d5] text-green rounded-xl px-4 py-3 text-sm font-medium mb-5">
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6M9 13h6M9 17h6"/>
        </svg>
        Every approved log can carry proof — photos, attendance sheets, PDFs, certificates. When a
        funder asks "can you prove it?", it&apos;s one click away.
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search by program or activity…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-line rounded-xl text-sm bg-white focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
        />
      </div>

      {/* Evidence cards */}
      <div className="flex flex-col gap-4">
        {filtered.map((log) => (
          <div key={log.id} className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-semibold text-base">
                  {log.programName} · {log.log_date}
                </h3>
                {log.narrative && (
                  <p className="text-muted text-sm mt-0.5">{log.narrative}</p>
                )}
              </div>
              <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e4f5ec] text-[#1f9d6b] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                Verified
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {log.attachments.map((a) => {
                const isImage = a.kind === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(a.file_name);
                return (
                  <button
                    key={a.id}
                    onClick={() => openFile(a.url, a.file_name)}
                    className="inline-flex items-center gap-1.5 bg-[#f3f7f2] border border-line rounded-lg px-3 py-2 text-sm font-semibold text-green hover:bg-lime transition-colors"
                  >
                    {isImage ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <path d="M14 2v6h6M9 13h6M9 17h6"/>
                      </svg>
                    )}
                    {a.file_name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white border border-line rounded-2xl p-12 text-center text-muted">
            {logs.length === 0 ? (
              <>
                <svg className="w-10 h-10 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6M9 13h6M9 17h6"/>
                </svg>
                <p className="font-display text-lg">No evidence files yet</p>
                <p className="text-sm mt-1">Staff can attach photos, PDFs and sheets when submitting daily logs.</p>
              </>
            ) : (
              <p className="font-display text-lg">No results for &ldquo;{q}&rdquo;</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
