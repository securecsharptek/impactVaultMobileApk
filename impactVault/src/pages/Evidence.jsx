import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, FolderOpen, X, Trash2, ExternalLink, Upload } from "lucide-react";
import HelpButton from "../components/shared/HelpButton";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";

const EMPTY = { participant_id: "", plan_goal_id: "", daily_log_id: "", upload_date: new Date().toISOString().slice(0, 10), description: "", type: "other", file_url: "", file_name: "" };
const TYPE_COLORS = { school: "bg-purple-100 text-purple-700", therapy: "bg-blue-100 text-blue-700", medical: "bg-red-100 text-red-700", behaviour: "bg-orange-100 text-orange-700", other: "bg-stone-100 text-stone-600" };
const TYPE_LABELS = { school: "School", therapy: "Therapy", medical: "Medical", behaviour: "Functional Impact", other: "Other" };

export default function Evidence() {
  const [items, setItems] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterPid, setFilterPid] = useState("");
  const [filterType, setFilterType] = useState("");

  const load = async () => {
    const user = await base44.auth.me();
    if (!user) return;
    const [e, p, g] = await Promise.all([
      base44.entities.EvidenceItem.filter({ created_by: user.email }, "-upload_date"),
      base44.entities.ParticipantProfile.filter({ created_by: user.email }),
      base44.entities.PlanGoal.filter({ created_by: user.email }),
    ]);
    setItems(e); setParticipants(p); setGoals(g); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, file_url, file_name: file.name }));
    setUploading(false);
  };

  const save = async () => {
    if (!form.participant_id || !form.description.trim()) return;
    setSaving(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry = { ...form, id: tempId };
    setItems((prev) => [optimisticEntry, ...prev]);
    setShowForm(false);

    try {
      const saved = await base44.entities.EvidenceItem.create(form);
      setItems((prev) => prev.map((i) => i.id === tempId ? { ...i, id: saved.id } : i));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this evidence item?")) return;
    await base44.entities.EvidenceItem.delete(id);
    load();
  };

  const participantGoals = goals.filter((g) => g.participant_id === form.participant_id && g.status === "active");

  const filtered = items.filter((i) => {
    if (filterPid && i.participant_id !== filterPid) return false;
    if (filterType && i.type !== filterType) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Evidence Library"
        subtitle="Store supporting evidence, documents, and real-life records in one place."
        action={
          <div className="flex items-center gap-2">
            <HelpButton pageName="Evidence" />
            <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-700 transition-colors">
              <Plus className="w-4 h-4" /> Upload Evidence
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterPid("")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!filterPid ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:border-stone-400 bg-white"}`}>All</button>
          {participants.map((p) => (
            <button key={p.id} onClick={() => setFilterPid(filterPid === p.id ? "" : p.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterPid === p.id ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:border-stone-400 bg-white"}`}>{p.name}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterType("")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!filterType ? "bg-teal-700 text-white border-teal-700" : "border-stone-200 text-stone-600 hover:border-teal-300 bg-white"}`}>All Types</button>
          {["school", "therapy", "medical", "behaviour", "other"].map((t) => (
            <button key={t} onClick={() => setFilterType(filterType === t ? "" : t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${filterType === t ? "bg-teal-700 text-white border-teal-700" : "border-stone-200 text-stone-600 hover:border-teal-300 bg-white"}`}>{TYPE_LABELS[t] || t}</button>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">Upload Evidence</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Participant *</label>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <button key={p.id} type="button" onClick={() => setForm({ ...form, participant_id: p.id, plan_goal_id: "" })} className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${form.participant_id === p.id ? "bg-teal-600 text-white border-teal-600" : "border-stone-200 text-stone-600 hover:border-teal-300 bg-white"}`}>{p.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Upload Date</label>
                <input type="date" value={form.upload_date} onChange={(e) => setForm({ ...form, upload_date: e.target.value })} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Description *</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add context about why this document or record is important…" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Evidence Type</label>
                <div className="flex flex-wrap gap-2">
                  {["school", "therapy", "medical", "behaviour", "other"].map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${form.type === t ? "bg-teal-600 text-white border-teal-600" : "border-stone-200 text-stone-600 hover:border-teal-300 bg-white"}`}>{TYPE_LABELS[t] || t}</button>
                  ))}
                </div>
              </div>
              {participantGoals.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Linked Plan Goal</label>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => setForm({ ...form, plan_goal_id: "" })} className={`text-left px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${!form.plan_goal_id ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"}`}>None</button>
                    {participantGoals.map((g) => (
                      <button key={g.id} type="button" onClick={() => setForm({ ...form, plan_goal_id: g.id })} className={`text-left px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${form.plan_goal_id === g.id ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"}`}>{g.title}</button>
                    ))}
                  </div>
                </div>
              )}
              {/* File upload */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">File</label>
                <label className="flex flex-col items-center gap-2 border-2 border-dashed border-stone-200 rounded-xl p-6 cursor-pointer hover:border-teal-300 hover:bg-teal-50 transition-colors">
                  <Upload className="w-6 h-6 text-stone-400" />
                  <span className="text-sm text-stone-500">
                    {uploading ? "Uploading…" : form.file_name ? form.file_name : "Click to select a file"}
                  </span>
                  <input type="file" className="hidden" onChange={handleFile} accept="image/*,video/*,.pdf,.doc,.docx" />
                </label>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-100">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              <button onClick={save} disabled={saving || uploading} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700 disabled:opacity-60">
                {saving ? "Saving…" : "Save Evidence"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No evidence uploaded yet" subtitle="Upload photos, reports, or documents as supporting evidence" action={<button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="px-4 py-2 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-700">Upload Evidence</button>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((ev) => {
            const p = participants.find((x) => x.id === ev.participant_id);
            const g = goals.find((x) => x.id === ev.plan_goal_id);
            return (
              <div key={ev.id} className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                       <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[ev.type] || "bg-stone-100 text-stone-600"}`}>{TYPE_LABELS[ev.type] || ev.type}</span>
                      <span className="text-xs text-stone-400">{ev.upload_date}</span>
                      {p && <span className="text-xs text-stone-500 font-medium">{p.name}</span>}
                    </div>
                    <p className="text-sm text-stone-700 mt-2">{ev.description}</p>
                    {ev.file_name && <p className="text-xs text-stone-400 mt-1 truncate">{ev.file_name}</p>}
                    {g && <p className="text-xs text-amber-600 mt-1">Goal: {g.title}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ev.file_url && (
                      <a href={ev.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-stone-100">
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                      </a>
                    )}
                    <button onClick={() => remove(ev.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}