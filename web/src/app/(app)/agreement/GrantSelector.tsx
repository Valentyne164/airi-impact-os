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
      className="field-input mt-1.5"
    >
      {grants.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name} — {g.funder_name ?? "—"}
        </option>
      ))}
    </select>
  );
}
