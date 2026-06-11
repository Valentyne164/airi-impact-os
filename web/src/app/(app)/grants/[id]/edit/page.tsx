import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getGrant, getPrograms, getProfile } from "@/lib/data";
import { updateGrant, archiveGrant, deleteGrant } from "./actions";
import DeleteButton from "../../../DeleteButton";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function EditGrantPage({ params }: Props) {
  const profile = await getProfile();
  if (!profile || profile.role !== "manager") redirect("/");

  const [grant, programs] = await Promise.all([getGrant(params.id), getPrograms()]);
  if (!grant) notFound();

  const saveAction    = updateGrant.bind(null, params.id);
  const archiveAction = archiveGrant.bind(null, params.id);
  const deleteAction  = deleteGrant.bind(null, params.id);

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href={`/grants/${params.id}`} className="text-muted hover:text-ink transition-colors flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-3xl text-ink leading-none">Edit grant</h1>
            <p className="page-subtitle">{grant.name}</p>
          </div>
        </div>
      </div>

      <div className="page-body max-w-xl space-y-6">

        {/* ── Main form ── */}
        <div className="card-elevated p-8">
          <form action={saveAction} className="space-y-5">

            <div>
              <label className="field-label">Grant name *</label>
              <input name="name" defaultValue={grant.name} required className="field-input" />
            </div>

            <div>
              <label className="field-label">
                Program <span className="text-red-500 normal-case font-bold">*</span>
              </label>
              <select name="program_id" required className="field-input">
                <option value="">— Select a program —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id} selected={p.id === grant.program_id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1.5">Required — commitments can&apos;t link to metrics without a program.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Funder name</label>
                <input name="funder_name" defaultValue={grant.funder_name ?? ""}
                  placeholder="Organisation name" className="field-input" />
              </div>
              <div>
                <label className="field-label">Funder email</label>
                <input name="funder_email" type="email" defaultValue={grant.funder_email ?? ""}
                  placeholder="contact@funder.org" className="field-input" />
              </div>
            </div>

            <div>
              <label className="field-label">Amount ($) *</label>
              <input name="amount" type="number" min="0" step="0.01" required
                defaultValue={grant.amount} className="field-input font-mono" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Term start</label>
                <input name="term_start" type="date" defaultValue={grant.term_start ?? ""}
                  className="field-input" />
              </div>
              <div>
                <label className="field-label">Term end</label>
                <input name="term_end" type="date" defaultValue={grant.term_end ?? ""}
                  className="field-input" />
              </div>
            </div>

            <div>
              <label className="field-label">Next report date</label>
              <input name="next_report" type="date" defaultValue={grant.next_report ?? ""}
                className="field-input" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn btn-primary">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Save changes
              </button>
              <Link href={`/grants/${params.id}`} className="btn btn-secondary">
                Cancel
              </Link>
            </div>

          </form>
        </div>

        {/* ── Danger zone ── */}
        <div className="rounded-2xl border border-red-100 overflow-hidden bg-white">
          <div className="px-7 py-5 border-b border-red-100 bg-red-50/50">
            <h2 className="font-display text-lg text-red-700">Danger zone</h2>
          </div>
          <div className="divide-y divide-red-100">

            <div className="px-7 py-5 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-ink">Archive grant</p>
                <p className="text-xs text-muted mt-1 leading-relaxed max-w-xs">
                  Hides this grant from all views. All expenses, commitments and linked data are preserved.
                </p>
              </div>
              <DeleteButton
                action={archiveAction}
                confirmMessage={`Archive "${grant.name}"? It will be hidden from all views but data is kept.`}
                className="btn btn-danger-outline btn-sm flex-shrink-0 whitespace-nowrap"
              >
                Archive
              </DeleteButton>
            </div>

            <div className="px-7 py-5 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-red-700">Delete permanently</p>
                <p className="text-xs text-muted mt-1 leading-relaxed max-w-xs">
                  Deletes all expenses and agreement commitments. This cannot be undone.
                </p>
              </div>
              <DeleteButton
                action={deleteAction}
                confirmMessage={`Permanently delete "${grant.name}"?\n\nThis will delete all its expenses and commitments. This CANNOT be undone.`}
                className="btn btn-danger btn-sm flex-shrink-0 whitespace-nowrap"
              >
                Delete
              </DeleteButton>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
