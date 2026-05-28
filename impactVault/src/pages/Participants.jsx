import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, User, Pencil, Trash2, X, Check, Paperclip, Upload, RefreshCw, Clock } from "lucide-react";
import HelpButton from "../components/shared/HelpButton";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import { usePlanLimit, PlanLimitWarning } from "../components/PlanEnforcement";

const EMPTY = { name: "", dob: "", diagnoses: "", carer_name: "", carer_email: "", plan_start_date: "", plan_end_date: "", no_plan: false, plan_document_url: "", plan_document_name: "", plan_history: [] };

export default function Participants() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { profileLimit } = usePlanLimit();

  const handlePlanFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, plan_document_url: file_url, plan_document_name: file.name }));
    setUploading(false);
  };

  const load = async () => {
    const user = await base44.auth.me();
    if (!user) return;
    const d = await base44.entities.ParticipantProfile.filter({ created_by: user.email });
    setProfiles(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, dob: p.dob || "", diagnoses: p.diagnoses || "", carer_name: p.carer_name || "", carer_email: p.carer_email || "", plan_start_date: p.plan_start_date || "", plan_end_date: p.plan_end_date || "", no_plan: p.no_plan || false, plan_document_url: p.plan_document_url || "", plan_document_name: p.plan_document_name || "", plan_history: p.plan_history || [] }); setShowForm(true); };

  const startNewPlanPeriod = () => {
    if (!editing) return;
    // Archive current plan into history — copy array first to avoid mutation
    const history = [...(form.plan_history || [])];
    if (form.plan_start_date || form.plan_end_date || form.plan_document_url) {
      history.push({
        plan_start_date: form.plan_start_date,
        plan_end_date: form.plan_end_date,
        plan_document_url: form.plan_document_url,
        plan_document_name: form.plan_document_name,
        archived_at: new Date().toISOString().slice(0, 10),
      });
    }
    setForm(f => ({ ...f, plan_start_date: "", plan_end_date: "", plan_document_url: "", plan_document_name: "", plan_history: history }));
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      await base44.entities.ParticipantProfile.update(editing.id, form);
    } else {
      await base44.entities.ParticipantProfile.create(form);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this person profile?")) return;
    await base44.entities.ParticipantProfile.delete(id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Person Profiles"
        subtitle="Capture functional impact, support needs, and daily life over time."
        action={
          <div className="flex items-center gap-2">
            <HelpButton pageName="Participants" />
            <button onClick={openNew} disabled={profileLimit && profiles.length >= profileLimit} className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" /> Add Profile
            </button>
          </div>
        }
      />

      {profileLimit && <PlanLimitWarning currentCount={profiles.length} profileLimit={profileLimit} />}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">{editing ? "Edit Profile" : "New Person Profile"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Full Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
              <Textarea label="Diagnoses / Conditions" value={form.diagnoses} onChange={(v) => setForm({ ...form, diagnoses: v })} rows={2} />
              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs font-medium text-stone-600 mb-3">Primary Carer</p>
                <div className="space-y-3">
                  <Field label="Carer Name" value={form.carer_name} onChange={(v) => setForm({ ...form, carer_name: v })} />
                  <Field label="Carer Email" type="email" value={form.carer_email} onChange={(v) => setForm({ ...form, carer_email: v })} />
                </div>
              </div>
              {/* Plan dates */}
              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-stone-600">Support Plan</p>
                  {editing && (form.plan_start_date || form.plan_end_date || form.plan_document_url) && (
                    <button
                      type="button"
                      onClick={startNewPlanPeriod}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> New Plan Period
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer mb-3">
                  <div
                    onClick={() => setForm({ ...form, no_plan: !form.no_plan, plan_start_date: "", plan_end_date: "" })}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${form.no_plan ? "bg-amber-700 border-amber-700" : "border-stone-300"}`}
                  >
                    {form.no_plan && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-stone-600">No current plan</span>
                </label>
                {!form.no_plan && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Plan Start Date" type="date" value={form.plan_start_date} onChange={(v) => setForm({ ...form, plan_start_date: v })} />
                      <Field label="Plan End Date" type="date" value={form.plan_end_date} onChange={(v) => setForm({ ...form, plan_end_date: v })} />
                    </div>
                    {/* Plan document upload */}
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Attach Current Support Plan</label>
                      {form.plan_document_url ? (
                        <div className="flex items-center gap-2 p-2.5 border border-stone-200 rounded-xl bg-stone-50">
                          <Paperclip className="w-4 h-4 text-stone-400 shrink-0" />
                          <a href={form.plan_document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{form.plan_document_name || "View file"}</a>
                          <button type="button" onClick={() => setForm((f) => ({ ...f, plan_document_url: "", plan_document_name: "" }))} className="text-stone-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-stone-300 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                          {uploading ? <div className="w-4 h-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4 text-stone-400" />}
                          <span className="text-sm text-stone-500">{uploading ? "Uploading…" : "Upload plan document (PDF, image, etc.)"}</span>
                          <input type="file" className="hidden" onChange={(e) => handlePlanFileUpload(e.target.files[0])} />
                        </label>
                      )}
                    </div>

                    {/* Previous plan history */}
                    {(form.plan_history || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Previous Plans</p>
                        <div className="space-y-2">
                          {(form.plan_history || []).slice().reverse().map((h, i) => (
                            <div key={i} className="flex items-center gap-2 p-2.5 border border-stone-100 rounded-xl bg-stone-50">
                              <Paperclip className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-stone-500">{h.plan_start_date || "?"} → {h.plan_end_date || "?"}</p>
                                {h.plan_document_url
                                  ? <a href={h.plan_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{h.plan_document_name || "View plan"}</a>
                                  : h.plan_document_name ? <p className="text-xs text-stone-400">{h.plan_document_name}</p> : null
                                }
                              </div>
                              <span className="text-xs text-stone-300 shrink-0">{h.archived_at}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-100">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-amber-700 text-white rounded-xl text-sm hover:bg-amber-800 disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : profiles.length === 0 ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h3 className="text-base font-semibold text-stone-800 mb-2">Start Capturing Daily Life</h3>
            <p className="text-sm text-stone-600 mb-6">Create a profile to begin capturing functional impacts, support needs, and supporting evidence over time.</p>
            <button 
              onClick={openNew} 
              className="px-5 py-2.5 bg-amber-700 text-white text-sm font-medium rounded-xl hover:bg-amber-800 transition-colors"
            >
              Add First Profile
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800">{p.name}</p>
                {p.dob && <p className="text-xs text-stone-400 mt-0.5">DOB: {p.dob}</p>}
                {p.diagnoses && <p className="text-sm text-stone-500 mt-1 truncate">{p.diagnoses}</p>}
                {p.carer_name && <p className="text-xs text-stone-400 mt-0.5">Carer: {p.carer_name}{p.carer_email ? ` · ${p.carer_email}` : ""}</p>}
                {p.no_plan ? (
                  <p className="text-xs text-stone-400 mt-0.5">No current plan</p>
                ) : (p.plan_start_date || p.plan_end_date) ? (
                  <p className="text-xs text-stone-400 mt-0.5">Plan: {p.plan_start_date || "?"} → {p.plan_end_date || "?"}</p>
                ) : null}
                {p.plan_document_url && (
                  <a href={p.plan_document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5">
                    <Paperclip className="w-3 h-3" /> {p.plan_document_name || "Support Plan"}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-stone-100"><Pencil className="w-4 h-4 text-stone-400" /></button>
                <button onClick={() => remove(p.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
    </div>
  );
}