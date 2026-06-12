"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    // Hard full-page navigation so no previous user's RSC cache leaks into
    // the new session. window.location.href destroys the in-memory router cache.
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-green-900">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-green grid place-items-center text-lime font-display font-bold text-lg">
            AI
          </div>
          <div>
            <div className="font-display text-2xl">AIRI Impact OS</div>
            <div className="text-xs uppercase tracking-widest text-muted">Grant & Impact Automation</div>
          </div>
        </div>
        <p className="text-muted mt-3 mb-6 text-sm">Sign in to your workspace.</p>
        <label className="block text-sm font-semibold mb-3">
          Email
          <input
            className="w-full mt-1 px-3 py-2.5 border border-line rounded-lg"
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold mb-4">
          Password
          <input
            className="w-full mt-1 px-3 py-2.5 border border-line rounded-lg"
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && signIn()}
          />
        </label>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button
          onClick={signIn} disabled={loading}
          className="w-full bg-green text-white font-semibold py-3 rounded-xl hover:bg-green-900 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs text-muted mt-4">
          Accounts are provisioned by an administrator. Roles (manager / staff / funder)
          are enforced by Row-Level Security.
        </p>
      </div>
    </main>
  );
}
