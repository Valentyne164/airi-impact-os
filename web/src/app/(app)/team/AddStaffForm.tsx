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
      {!open && (
        <button onClick={() => setOpen(true)} className="btn btn-cta">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M19 8v6M22 11h-6"/>
          </svg>
          Add staff member
        </button>
      )}

      {created && !open && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-success-light border border-line text-success text-sm font-semibold">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Account created for <b>{created}</b>. Share their email and password so they can log in.
        </div>
      )}

      {open && (
        <div className="card-elevated p-6 mb-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg text-ink">Add staff member</h3>
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

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Full name *</label>
              <input name="name" required placeholder="e.g. Grace Okafor" className="field-input" />
            </div>
            <div>
              <label className="field-label">Email *</label>
              <input name="email" type="email" required placeholder="grace@org.org" className="field-input" />
            </div>
            <div>
              <label className="field-label">Role</label>
              <select name="role" className="field-input">
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="field-label">Temporary password *</label>
              <input name="password" type="text" required placeholder="min 6 characters"
                className="field-input font-mono" />
            </div>

            {error && (
              <div className="sm:col-span-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-2 pt-1">
              <button type="submit" disabled={isPending} className="btn btn-primary">
                {isPending ? "Creating…" : "Create account"}
              </button>
              <button type="button" onClick={() => { setOpen(false); setError(null); }}
                className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
