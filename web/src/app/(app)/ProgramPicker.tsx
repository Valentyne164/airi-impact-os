"use client";

import { useRouter } from "next/navigation";

interface Props {
  programs: Array<{ id: string; name: string }>;
  activeId: string;
}

export default function ProgramPicker({ programs, activeId }: Props) {
  const router = useRouter();
  if (programs.length <= 1) return null;
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted">
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l9 4v6c0 5.5-3.8 10.7-9 12C6.8 22.7 3 17.5 3 12V6l9-4z"/>
        <path d="M2 9l9 4 9-4"/>
      </svg>
      <select
        value={activeId}
        onChange={(e) => router.push(`/?p=${e.target.value}`)}
        className="px-3 py-2 border border-line rounded-xl text-sm bg-white font-semibold text-ink focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
      >
        {programs.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
