"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { extractAndLock } from "./actions";

const SAMPLE =
  "This Agreement between AIRI Foundation and the Government Partner sets out that the grantee will train 500 participants in practical AI skills, deliver 25 workshops across the funding period, ensure at least 40% women participation, and spend under $150,000 in total program costs.";

interface Props {
  grantId: string;
  existingText: string;
  programName: string;
}

type PdfStatus = "idle" | "loading" | "done" | "error";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
          Extracting…
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Extract commitments
        </>
      )}
    </button>
  );
}

export default function AgreementForm({ grantId, existingText, programName }: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  const [pdfMessage, setPdfMessage] = useState("");
  const action = extractAndLock.bind(null, grantId);

  async function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfStatus("loading");
    setPdfMessage("");

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Dynamic import keeps pdfjs-dist out of the initial bundle
      const pdfjs = await import("pdfjs-dist");
      // Worker served from CDN — same version as the installed package,
      // no build-time copy step required.
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pageParts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page    = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        // TextItem has `str`; TextMarkedContent does not — filter accordingly
        const pageText = content.items
          .filter((item) => "str" in item)
          .map((item) => (item as { str: string }).str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (pageText) pageParts.push(pageText);
      }

      const extracted = pageParts.join("\n\n").trim();

      if (!extracted) {
        setPdfStatus("error");
        setPdfMessage(
          "This PDF appears to be image-only (scanned) — no selectable text was found. " +
          "Please paste the agreement text manually in the box below.",
        );
        return;
      }

      if (textRef.current) textRef.current.value = extracted;
      setPdfStatus("done");
      setPdfMessage(
        `${pdf.numPages} page${pdf.numPages !== 1 ? "s" : ""} extracted — review the text below, then click Extract commitments.`,
      );
    } catch (err) {
      console.error("[PDF extract]", err);
      setPdfStatus("error");
      setPdfMessage(
        "Could not read this PDF. Make sure it is not password-protected, then try again — or paste the agreement text manually.",
      );
    } finally {
      // Reset so the same file can be re-uploaded
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        Upload a PDF or paste the grant agreement text below. The engine extracts all measurable
        commitments and adds them to the tracker — auto-matched against{" "}
        <strong className="text-ink font-semibold">{programName}</strong>&apos;s verified data.
      </p>

      {/* ── PDF upload ── */}
      <div>
        <input
          ref={fileRef}
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={handlePdf}
          className="hidden"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="pdf-upload"
            className={`btn btn-secondary cursor-pointer select-none ${
              pdfStatus === "loading" ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {pdfStatus === "loading" ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
                </svg>
                Reading PDF…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="13" x2="12" y2="17"/>
                  <line x1="10" y1="15" x2="14" y2="15"/>
                </svg>
                Upload PDF
              </>
            )}
          </label>

          {pdfStatus === "done" && (
            <span className="flex items-center gap-1.5 text-sm text-success font-medium">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {pdfMessage}
            </span>
          )}
        </div>

        {pdfStatus === "error" && (
          <div className="mt-3 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 leading-relaxed">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {pdfMessage}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 text-muted">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs font-bold uppercase tracking-widest flex-shrink-0">or paste text</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      {/* ── Text area ── */}
      <textarea
        ref={textRef}
        name="agreement_text"
        defaultValue={existingText}
        placeholder="e.g. The grantee will train 500 participants, deliver 25 workshops, ensure 40% women participation, and spend under $150,000."
        className="field-input min-h-[120px] resize-y"
      />

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <button
          type="button"
          onClick={() => { if (textRef.current) textRef.current.value = SAMPLE; }}
          className="btn btn-secondary"
        >
          Load sample
        </button>
        <p className="text-xs text-muted leading-relaxed ml-auto max-w-xs text-right hidden sm:block">
          Extracts headcount, session counts, equity %, budget caps, and more.
          Missed something? Add it manually below.
        </p>
      </div>
    </form>
  );
}
