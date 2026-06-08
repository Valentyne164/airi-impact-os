"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStaff } from "./actions";

export default function AddStaffForm() {
  const router                = useRouter();
  const [open, setOpen]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null);
    setCreated(null);

    start(async () => {
      const result = await createStaff(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setCreated(result.created ?? "Staff member");
        form.reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-5">
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-lime text-green text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-lime-deep transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M19 8v6M22 11h-6"/>
          </svg>
          Add staff member
        </button>
      )}

      {/* Success banner */}
      {created && !open && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#e4f5ec] border border-[#b2dfc6] text-[#1a5c3e] text-sm font-semibold">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Account created for <b>{created}</b>. Share their email and password so they can log in.
        </div>
      )}

      {/* Form panel */}
      {open && (
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base">Add staff member</h3>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); setCreated(null); }}
              className="text-muted hover:text-ink transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Full name *</label>
              <input
                name="name" required placeholder="e.g. Grace Okafor"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Email *</label>
              <input
                name="email" type="email" required placeholder="grace@org.org"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Role</label>
              <select
                name="role"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm bg-white focus:outline-none focus:border-green"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Temporary password *</label>
              <input
                name="password" type="text" required placeholder="min 6 characters"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10 font-mono"
              />
            </div>

            {error && (
              <div className="sm:col-span-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 disabled:opacity-60 transition-colors"
              >
                {isPending ? "Creating…" : "Create account"}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl border border-line bg-paper hover:bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
