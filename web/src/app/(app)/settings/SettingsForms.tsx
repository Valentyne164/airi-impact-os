"use client";

import { useRef, useState, useTransition } from "react";
import { updateName, updatePassword } from "./actions";

interface Props {
  fullName: string;
  email: string;
  role: string;
}

export default function SettingsForms({ fullName, email, role }: Props) {
  const [namePending, startNameTrans]   = useTransition();
  const [passPending, startPassTrans]   = useTransition();
  const [nameStatus, setNameStatus]     = useState<{ ok?: boolean; msg?: string } | null>(null);
  const [passStatus, setPassStatus]     = useState<{ ok?: boolean; msg?: string } | null>(null);
  const passFormRef = useRef<HTMLFormElement>(null);

  function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setNameStatus(null);
    startNameTrans(async () => {
      const res = await updateName(fd);
      setNameStatus(res.error ? { ok: false, msg: res.error } : { ok: true, msg: "Name updated." });
    });
  }

  function handlePassSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPassStatus(null);
    startPassTrans(async () => {
      const res = await updatePassword(fd);
      if (res.error) {
        setPassStatus({ ok: false, msg: res.error });
      } else {
        setPassStatus({ ok: true, msg: "Password changed successfully." });
        passFormRef.current?.reset();
      }
    });
  }

  return (
    <div className="space-y-6">

      {/* Profile section */}
      <section className="card-elevated p-7">
        <h2 className="font-display text-xl text-ink mb-5">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="field-label">Email</label>
            <div className="px-3 py-2.5 bg-surface border border-line rounded-xl text-sm text-muted select-all">
              {email}
            </div>
          </div>
          <div>
            <label className="field-label">Role</label>
            <div className="px-3 py-2.5 bg-surface border border-line rounded-xl text-sm">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                role === "manager" ? "badge-green" :
                role === "funder"  ? "badge-blue"  :
                                     "badge-amber"
              }`}>
                {role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div>
            <label className="field-label">Display name</label>
            <input
              name="full_name"
              defaultValue={fullName}
              required
              className="field-input max-w-sm"
            />
          </div>
          {nameStatus && (
            <p className={`text-xs font-semibold ${nameStatus.ok ? "text-success" : "text-red-600"}`}>
              {nameStatus.msg}
            </p>
          )}
          <button type="submit" disabled={namePending} className="btn btn-primary">
            {namePending ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
            Save name
          </button>
        </form>
      </section>

      {/* Password section */}
      <section className="card-elevated p-7">
        <h2 className="font-display text-xl text-ink mb-1">Change password</h2>
        <p className="text-muted text-sm mb-5">Minimum 8 characters.</p>

        <form ref={passFormRef} onSubmit={handlePassSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className="field-label">New password</label>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Confirm password</label>
            <input
              name="confirm"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="field-input"
            />
          </div>
          {passStatus && (
            <p className={`text-xs font-semibold ${passStatus.ok ? "text-success" : "text-red-600"}`}>
              {passStatus.msg}
            </p>
          )}
          <button type="submit" disabled={passPending} className="btn btn-primary">
            {passPending ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
            Update password
          </button>
        </form>
      </section>

    </div>
  );
}
