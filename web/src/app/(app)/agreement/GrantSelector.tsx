"use client";

import { useRouter } from "next/navigation";

interface Props {
  grants: Array<{ id: string; name: string; funder_name: string | null }>;
  selectedId: string;
}

export default function GrantSelector({ grants, selectedId }: Props) {
  const router = useRouter();
  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/agreement?grant=${e.target.value}`)}
      className="w-full mt-1.5 px-3 py-2.5 border border-line rounded-xl text-sm bg-white focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10"
    >
      {grants.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name} — {g.funder_name ?? "—"}
        </option>
      ))}
    </select>
  );
}
