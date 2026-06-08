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
      <section className="bg-white border border-line rounded-2xl p-6">
        <h2 className="font-display text-lg mb-4">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <div className="text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Email</div>
            <div className="px-3 py-2.5 bg-[#f7faf6] border border-line rounded-xl text-sm text-muted select-all">
              {email}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Role</div>
            <div className="px-3 py-2.5 bg-[#f7faf6] border border-line rounded-xl text-sm capitalize">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                role === "manager" ? "bg-[#e3f0e9] text-green" :
                role === "funder"  ? "bg-blue-100 text-blue-700" :
                                     "bg-amber-100 text-amber-700"
              }`}>
                {role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleNameSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
              Display name
            </label>
            <input
              name="full_name"
              defaultValue={fullName}
              required
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10 max-w-sm"
            />
          </div>
          {nameStatus && (
            <p className={`text-xs font-semibold ${nameStatus.ok ? "text-[#1f9d6b]" : "text-red-600"}`}>
              {nameStatus.msg}
            </p>
          )}
          <button
            type="submit"
            disabled={namePending}
            className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 transition-colors disabled:opacity-60"
          >
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
      <section className="bg-white border border-line rounded-2xl p-6">
        <h2 className="font-display text-lg mb-1">Change password</h2>
        <p className="text-muted text-sm mb-4">Minimum 8 characters.</p>

        <form ref={passFormRef} onSubmit={handlePassSubmit} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
              New password
            </label>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
              Confirm password
            </label>
            <input
              name="confirm"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            />
          </div>
          {passStatus && (
            <p className={`text-xs font-semibold ${passStatus.ok ? "text-[#1f9d6b]" : "text-red-600"}`}>
              {passStatus.msg}
            </p>
          )}
          <button
            type="submit"
            disabled={passPending}
            className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 transition-colors disabled:opacity-60"
          >
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
