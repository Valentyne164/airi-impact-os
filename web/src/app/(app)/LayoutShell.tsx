"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function LayoutShell({ sidebar, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes (nav link tapped on mobile)
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">

      {/* ── Backdrop (mobile only) ── */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 md:hidden
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* ── Sidebar
            mobile:  fixed, translates in/out from the left edge
            desktop: sticky in-flow 260 px grid column (md:translate-x-0 resets
                     any mobile transform so it's always visible) ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-[260px]
          transition-transform duration-300 ease-in-out
          md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebar}
      </aside>

      {/* ── Content column ── */}
      <div className="flex flex-col min-h-screen">

        {/* Mobile top bar — hidden on desktop */}
        <header className="md:hidden flex items-center gap-3 bg-green px-4 h-14 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="p-2 -ml-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-5 h-5" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lime text-green grid place-items-center font-display font-bold text-sm flex-shrink-0">
              AI
            </div>
            <span className="font-display text-white text-base leading-none">AIRI Impact OS</span>
          </div>
        </header>

        {/* Page content — scrolls independently of the sidebar */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}
