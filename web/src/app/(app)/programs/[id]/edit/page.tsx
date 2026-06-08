import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMetrics, getProfile } from "@/lib/data";
import type { Program } from "@/types/database";
import { updateProgram, addMetric, updateMetric, deleteMetric, archiveProgram, deleteProgram } from "./actions";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

const KIND_LABELS: Record<string, string> = {
  number: "Number",
  yesno:  "Yes / No",
  text:   "Note (text)",
};

export default async function EditProgramPage({ params }: Props) {
  const profile = await getProfile();
  if (!profile || profile.role !== "manager") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const program = data as Program;

  const allMetrics = await getMetrics();
  const metrics = allMetrics
    .filter((m) => m.program_id === params.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const saveAction      = updateProgram.bind(null, params.id);
  const addMetricAction = addMetric.bind(null, params.id);
  const archiveAction   = archiveProgram.bind(null, params.id);
  const deleteAction    = deleteProgram.bind(null, params.id);

  return (
    <div>
      {/* Header */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <Link href={`/programs?p=${params.id}`}
            className="text-muted hover:text-ink transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-xl">Edit: {program.name}</h1>
            <p className="text-muted text-sm">Update program details and manage its metrics.</p>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-2xl space-y-8">

        {/* ── Program details ── */}
        <section className="bg-white border border-line rounded-2xl p-6">
          <h2 className="font-display text-lg mb-4">Program details</h2>
          <form action={saveAction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                Program name *
              </label>
              <input name="name" defaultValue={program.name} required
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                Aim / mission
              </label>
              <textarea name="aim" defaultValue={program.aim ?? ""} rows={3}
                placeholder="What does this program aim to achieve?"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                Target audience
              </label>
              <input name="audience" defaultValue={program.audience ?? ""}
                placeholder="Who does this program serve?"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10" />
            </div>
            <div className="pt-2">
              <button type="submit"
                className="inline-flex items-center gap-2 bg-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-900 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Save changes
              </button>
            </div>
          </form>
        </section>

        {/* ── Metrics ── */}
        <section className="bg-white border border-line rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-display text-lg">Metrics</h2>
            <span className="text-xs text-muted">{metrics.length} total</span>
          </div>

          {metrics.length === 0 && (
            <p className="px-5 py-4 text-muted text-sm italic">No metrics yet — add one below.</p>
          )}

          {metrics.map((m, idx) => {
            const updateAction = updateMetric.bind(null, m.id, params.id);
            const deleteAction = deleteMetric.bind(null, m.id, params.id);
            return (
              <details key={m.id} className="group border-b border-line last:border-0">
                {/* Summary row (collapsed by default) */}
                <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-[#f7faf6] transition-colors list-none">
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-[#e3f0e9] text-green text-[10px] font-bold grid place-items-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm truncate">{m.label}</span>
                    <span className="text-xs text-muted hidden sm:inline-block">
                      {KIND_LABELS[m.kind]}
                      {m.target ? ` · target ${m.target}` : ""}
                      {m.on_dashboard ? " · on dashboard" : ""}
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-muted group-open:rotate-90 transition-transform flex-shrink-0"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </summary>

                {/* Expanded edit form */}
                <div className="px-5 pb-5 bg-[#f7faf6] border-t border-line">
                  <form action={updateAction} className="mt-4 grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                        Label
                      </label>
                      <input name="label" defaultValue={m.label} required
                        className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                        Target (optional)
                      </label>
                      <input name="target" type="number" min="0" defaultValue={m.target ?? ""}
                        placeholder="e.g. 200"
                        className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                        Sort order
                      </label>
                      <input name="sort_order" type="number" defaultValue={m.sort_order}
                        className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green bg-white" />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="hidden"
                          name="on_dashboard"
                          value={m.on_dashboard ? "true" : "false"}
                        />
                        <input
                          type="checkbox"
                          name="on_dashboard_cb"
                          defaultChecked={m.on_dashboard}
                          onChange={(e) => {
                            const form = e.currentTarget.form;
                            if (form) {
                              const hidden = form.querySelector<HTMLInputElement>(
                                'input[name="on_dashboard"]',
                              );
                              if (hidden) hidden.value = e.currentTarget.checked ? "true" : "false";
                            }
                          }}
                          className="w-4 h-4 accent-[#084734]"
                        />
                        <span className="text-sm font-semibold">Show on funder dashboard</span>
                      </label>
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                      <button type="submit"
                        className="text-sm font-semibold px-4 py-2 rounded-xl bg-green text-white hover:bg-green-900 transition-colors">
                        Save metric
                      </button>
                      <form action={deleteAction}>
                        <button type="submit"
                          className="text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          onClick={(e) => {
                            if (!confirm(`Delete metric "${m.label}"? This cannot be undone.`))
                              e.preventDefault();
                          }}>
                          Delete
                        </button>
                      </form>
                    </div>
                  </form>
                </div>
              </details>
            );
          })}

          {/* Add metric form */}
          <div className="p-5 bg-[#f7faf6] border-t border-line">
            <h3 className="font-display text-base mb-3">Add metric</h3>
            <form action={addMetricAction} className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Label *
                </label>
                <input name="label" placeholder="e.g. Women trained" required
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Type
                </label>
                <select name="kind"
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green bg-white">
                  <option value="number">Number</option>
                  <option value="yesno">Yes / No</option>
                  <option value="text">Note (text)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Target (optional)
                </label>
                <input name="target" type="number" min="0" placeholder="e.g. 200"
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-green bg-white" />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="hidden" name="on_dashboard" value="false" id="od-hidden" />
                  <input type="checkbox" name="on_dashboard_cb"
                    onChange={(e) => {
                      const hidden = document.getElementById("od-hidden") as HTMLInputElement | null;
                      if (hidden) hidden.value = e.currentTarget.checked ? "true" : "false";
                    }}
                    className="w-4 h-4 accent-[#084734]" />
                  <span className="text-sm font-semibold">Show on funder dashboard</span>
                </label>
              </div>
              <div className="sm:col-span-2">
                <button type="submit"
                  className="inline-flex items-center gap-2 bg-lime text-green text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-lime-deep transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Add metric
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── Danger zone ── */}
        <section className="bg-white border border-red-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50/40">
            <h2 className="font-display text-lg text-red-700">Danger zone</h2>
          </div>
          <div className="divide-y divide-red-100">
            {/* Archive */}
            <div className="px-6 py-4 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold">Archive program</p>
                <p className="text-muted text-xs mt-0.5">
                  Hides this program from all views. All metrics, logs and linked grants are preserved and can be restored from the database.
                </p>
              </div>
              <form action={archiveAction} className="flex-shrink-0">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
                  onClick={(e) => {
                    if (!confirm(`Archive "${program.name}"? It will be hidden from all views but data is kept.`))
                      e.preventDefault();
                  }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/>
                    <line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                  Archive
                </button>
              </form>
            </div>
            {/* Delete */}
            <div className="px-6 py-4 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-red-700">Delete program permanently</p>
                <p className="text-muted text-xs mt-0.5">
                  Deletes all metrics and staff logs for this program. Linked grants are unlinked but not deleted. This cannot be undone.
                </p>
              </div>
              <form action={deleteAction} className="flex-shrink-0">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap"
                  onClick={(e) => {
                    if (!confirm(`Permanently delete "${program.name}"?\n\nThis will delete all its metrics and staff logs. This CANNOT be undone.`))
                      e.preventDefault();
                  }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Delete
                </button>
              </form>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
