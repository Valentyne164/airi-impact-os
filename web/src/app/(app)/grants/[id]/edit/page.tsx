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
    <div>
      {/* Header */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <Link href={`/grants/${params.id}`}
            className="text-muted hover:text-ink transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-xl">Edit: {grant.name}</h1>
            <p className="text-muted text-sm">Update grant details, amounts and reporting dates.</p>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-xl">
        <section className="bg-white border border-line rounded-2xl p-6">
          <form action={saveAction} className="space-y-4">

            {/* Grant name */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                Grant name *
              </label>
              <input name="name" defaultValue={grant.name} required
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10" />
            </div>

            {/* Program link */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                Program <span className="text-red-500 normal-case">*</span>
              </label>
              <select name="program_id" required
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green bg-white">
                <option value="">— Select a program —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id} selected={p.id === grant.program_id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-muted text-xs mt-1">Required — commitments can&apos;t link to metrics without a program.</p>
            </div>

            {/* Funder */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Funder name
                </label>
                <input name="funder_name" defaultValue={grant.funder_name ?? ""}
                  placeholder="Organisation name"
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Funder email
                </label>
                <input name="funder_email" type="email" defaultValue={grant.funder_email ?? ""}
                  placeholder="contact@funder.org"
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green" />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                Amount ($) *
              </label>
              <input name="amount" type="number" min="0" step="0.01" required
                defaultValue={grant.amount}
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10 font-mono" />
            </div>

            {/* Term dates */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Term start
                </label>
                <input name="term_start" type="date" defaultValue={grant.term_start ?? ""}
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Term end
                </label>
                <input name="term_end" type="date" defaultValue={grant.term_end ?? ""}
                  className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green" />
              </div>
            </div>

            {/* Next report */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                Next report date
              </label>
              <input name="next_report" type="date" defaultValue={grant.next_report ?? ""}
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green" />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="submit"
                className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Save changes
              </button>
              <Link href={`/grants/${params.id}`}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl border border-line hover:bg-paper transition-colors">
                Cancel
              </Link>
            </div>

          </form>
        </section>
        {/* ── Danger zone ── */}
        <section className="bg-white border border-red-100 rounded-2xl overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50/40">
            <h2 className="font-display text-lg text-red-700">Danger zone</h2>
          </div>
          <div className="divide-y divide-red-100">
            {/* Archive */}
            <div className="px-6 py-4 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold">Archive grant</p>
                <p className="text-muted text-xs mt-0.5">
                  Hides this grant from all views. All expenses, commitments and linked data are preserved and can be restored from the database.
                </p>
              </div>
              <DeleteButton
                action={archiveAction}
                confirmMessage={`Archive "${grant.name}"? It will be hidden from all views but data is kept.`}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/>
                  <line x1="10" y1="12" x2="14" y2="12"/>
                </svg>
                Archive
              </DeleteButton>
            </div>
            {/* Delete */}
            <div className="px-6 py-4 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-red-700">Delete grant permanently</p>
                <p className="text-muted text-xs mt-0.5">
                  Deletes all expenses and agreement commitments for this grant. This cannot be undone.
                </p>
              </div>
              <DeleteButton
                action={deleteAction}
                confirmMessage={`Permanently delete "${grant.name}"?\n\nThis will delete all its expenses and commitments. This CANNOT be undone.`}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Delete
              </DeleteButton>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
