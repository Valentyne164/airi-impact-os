import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Program, Grant, Log } from "@/types/database";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { q?: string };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? "").trim();

  let programs: Program[] = [];
  let grants: Grant[]     = [];
  let logs: Log[]         = [];

  if (q.length >= 2) {
    const supabase = await createClient();
    const pattern  = `%${q}%`;

    const [pRes, gRes, lRes] = await Promise.all([
      supabase.from("programs").select("*").or(`name.ilike.${pattern},aim.ilike.${pattern}`).is("archived_at", null).limit(10),
      supabase.from("grants").select("*").or(`name.ilike.${pattern},funder_name.ilike.${pattern}`).is("archived_at", null).limit(10),
      supabase.from("logs").select("*").ilike("narrative", pattern).eq("status", "approved").order("log_date", { ascending: false }).limit(20),
    ]);

    // Fallback: archived_at column may not exist yet (pre-migration)
    if (pRes.error) {
      const fb = await supabase.from("programs").select("*").or(`name.ilike.${pattern},aim.ilike.${pattern}`).limit(10);
      programs = (fb.data ?? []) as Program[];
    } else {
      programs = (pRes.data ?? []) as Program[];
    }
    if (gRes.error) {
      const fb = await supabase.from("grants").select("*").or(`name.ilike.${pattern},funder_name.ilike.${pattern}`).limit(10);
      grants = (fb.data ?? []) as Grant[];
    } else {
      grants = (gRes.data ?? []) as Grant[];
    }
    logs = (lRes.data ?? []) as Log[];
  }

  const total = programs.length + grants.length + logs.length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <h1 className="font-display text-2xl">Search</h1>
        <p className="text-muted text-sm">Find programs, grants and approved log entries.</p>
      </div>

      <div className="p-8 max-w-2xl">

        {/* ── Search form ── */}
        <form method="GET" action="/search" className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                name="q"
                defaultValue={q}
                autoFocus
                placeholder="Search programs, grants, log narratives…"
                className="w-full pl-12 pr-4 py-3.5 border border-line rounded-2xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10 bg-white shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-green-900 transition-colors whitespace-nowrap shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Search
            </button>
          </div>
          {q && (
            <p className="text-muted text-xs mt-2 px-1">
              {total === 0 ? "No results" : `${total} result${total !== 1 ? "s" : ""}`} for &ldquo;<b className="text-ink">{q}</b>&rdquo;
            </p>
          )}
        </form>

        {/* ── Results ── */}
        {q.length >= 2 && total === 0 && (
          <div className="text-center text-muted py-12">
            <svg className="w-12 h-12 opacity-20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="font-display text-lg">Nothing found</p>
            <p className="text-sm mt-1">Try a shorter term or check the spelling.</p>
          </div>
        )}

        <div className="space-y-7">

          {/* Programs */}
          {programs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Programs</h2>
                <span className="text-xs text-muted font-semibold ml-auto">{programs.length}</span>
              </div>
              <div className="bg-white border border-line rounded-2xl overflow-hidden divide-y divide-line">
                {programs.map((p) => (
                  <Link key={p.id} href={`/programs?p=${p.id}`}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#f7faf6] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#e3f0e9] text-green grid place-items-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{highlight(p.name, q)}</div>
                      {p.aim && <div className="text-muted text-xs mt-0.5 truncate">{highlight(p.aim, q)}</div>}
                    </div>
                    <svg className="w-4 h-4 text-muted flex-shrink-0 ml-auto mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Grants */}
          {grants.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Grants</h2>
                <span className="text-xs text-muted font-semibold ml-auto">{grants.length}</span>
              </div>
              <div className="bg-white border border-line rounded-2xl overflow-hidden divide-y divide-line">
                {grants.map((g) => (
                  <Link key={g.id} href={`/grants/${g.id}`}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#f7faf6] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#e8f0ff] text-[#4a7aff] grid place-items-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{highlight(g.name, q)}</div>
                      <div className="text-muted text-xs mt-0.5">
                        {g.funder_name ? highlight(g.funder_name, q) : "No funder"}{" "}
                        · ${g.amount.toLocaleString()}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-muted flex-shrink-0 ml-auto mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Log narratives */}
          {logs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Log narratives</h2>
                <span className="text-xs text-muted font-semibold ml-auto">{logs.length}</span>
              </div>
              <div className="bg-white border border-line rounded-2xl overflow-hidden divide-y divide-line">
                {logs.map((l) => (
                  <Link key={l.id} href="/approvals"
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#f7faf6] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#f0f5f1] text-muted grid place-items-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted font-semibold mb-0.5">{l.log_date}</div>
                      <div className="text-sm text-ink leading-snug line-clamp-2">
                        {l.narrative ? highlight(l.narrative, q) : <em className="text-muted">No narrative</em>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Prompt before typing */}
          {q.length === 0 && (
            <div className="text-center text-muted py-12">
              <svg className="w-12 h-12 opacity-20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p className="text-sm">Type at least 2 characters to search.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-lime/60 text-green rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
