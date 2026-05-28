import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, BookOpen, X, Trash2, Upload, Paperclip, Pencil, LayoutGrid, AlignJustify, GitCommit, Archive, RefreshCw } from "lucide-react";
import HelpButton from "../components/shared/HelpButton";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import SeverityBadge from "../components/shared/SeverityBadge";
import { CardView, ListView, TimelineView } from "../components/impactlog/ImpactLogViews";
import usePullToRefresh from "../hooks/usePullToRefresh";

const IMPACT_TYPES = [
  "School Attendance Impact",
  "Social Participation Impact",
  "Behaviour Escalation",
  "Emotional Regulation Difficulty",
  "Therapy Disruption",
  "Medical Episode",
  "Fatigue / Shutdown",
  "Support Breakdown",
  "Community Access Difficulty",
  "Family Participation Impact",
  "Other",
];

const IMPACT_LEVELS = [
  { value: "minor", label: "Minor", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "moderate", label: "Moderate", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "major", label: "Major", color: "bg-red-100 text-red-800 border-red-300" },
];

const SUPPORT_REQUIRED_OPTIONS = [
  { value: "no_additional", label: "Independent recovery / no additional support needed" },
  { value: "parent_carer", label: "Parent/carer support required" },
  { value: "therapy_worker", label: "Therapy/support worker required" },
  { value: "school_intervention", label: "School support required" },
  { value: "medical_support", label: "Health or medical support required" },
];

const EMPTY = { participant_id: "", plan_goal_id: "", plan_goal_ids: [], date: new Date().toISOString().slice(0, 10), severity: 3, impact_level: "", impact_types: [], description: "", functional_impact: "", support_required: "no_additional", environment: "", duration: "", notes: "", reported_by: "" };

const REPORTED_BY_OPTIONS = [
  "School",
  "Therapist",
  "Parent/Carer",
  "Support Worker",
  "Other"
];

const SEVERITY_COLORS = {
  1: "bg-stone-100 text-stone-800 border-stone-300",
  2: "bg-blue-100 text-blue-800 border-blue-300",
  3: "bg-amber-100 text-amber-800 border-amber-300",
  4: "bg-orange-100 text-orange-800 border-orange-300",
  5: "bg-red-100 text-red-800 border-red-300",
};
const EMPTY_EVIDENCE = { description: "", type: "Document", file_url: "", file_name: "" };
const EVIDENCE_TYPES = ["Document", "Photo", "Email", "Report", "Assessment", "Other"];


export default function ImpactLog() {
  const [logs, setLogs] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [goals, setGoals] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [evidenceList, setEvidenceList] = useState([]);
  const [evidenceForm, setEvidenceForm] = useState(EMPTY_EVIDENCE);
  const [uploading, setUploading] = useState(false);
  const [filterPid, setFilterPid] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [archiveModal, setArchiveModal] = useState(null);
  const [archiveLabel, setArchiveLabel] = useState("");

  const load = async () => {
    const user = await base44.auth.me();
    if (!user) return;
    const [l, p, g, e] = await Promise.all([
      base44.entities.DailyImpactLog.filter({ created_by: user.email }, "-date"),
      base44.entities.ParticipantProfile.filter({ created_by: user.email }),
      base44.entities.PlanGoal.filter({ created_by: user.email }),
      base44.entities.EvidenceItem.filter({ created_by: user.email }),
    ]);
    setLogs(l); setParticipants(p); setGoals(g); setEvidence(e); setLoading(false);
  };

  const { containerRef, pulling, pullDistance, refreshing } = usePullToRefresh(load);

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditingId(null); setEvidenceList([]); setEvidenceForm(EMPTY_EVIDENCE); setShowForm(true); };

  const openEdit = (log) => {
    setForm({
      participant_id: log.participant_id || "",
      plan_goal_id: log.plan_goal_id || "",
      plan_goal_ids: log.plan_goal_ids || [],
      date: log.date || new Date().toISOString().slice(0, 10),
      severity: log.severity || 3,
      impact_level: log.impact_level || "",
      impact_types: log.impact_types || [],
      description: log.description || "",
      functional_impact: log.functional_impact || "",
      support_required: log.support_required || "no_additional",
      environment: log.environment || "",
      reported_by: log.reported_by || "",
      duration: log.duration || "",
      notes: log.notes || "",
    });
    setEditingId(log.id);
    setEvidenceList([]);
    setEvidenceForm(EMPTY_EVIDENCE);
    setShowForm(true);
  };

  const handleEvidenceFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEvidenceForm((f) => ({ ...f, file_url, file_name: file.name }));
    setUploading(false);
  };

  const addEvidence = () => {
    if (!evidenceForm.description.trim() && !evidenceForm.file_url) return;
    setEvidenceList((prev) => [...prev, { ...evidenceForm }]);
    setEvidenceForm(EMPTY_EVIDENCE);
  };

  const removeEvidence = (idx) => setEvidenceList((prev) => prev.filter((_, i) => i !== idx));

  const toggleImpactType = (type) => {
    setForm((f) => ({
      ...f,
      impact_types: f.impact_types.includes(type)
        ? f.impact_types.filter((t) => t !== type)
        : [...f.impact_types, type],
    }));
  };

  const save = async () => {
    if (!form.participant_id || !form.functional_impact.trim() || !form.environment || !form.reported_by) return;
    if (evidenceForm.file_url && !evidenceForm.description.trim()) {
      if (!confirm("You have uploaded a file but haven't clicked 'Add' to attach it. Continue without saving this file?")) return;
    }
    setSaving(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry = { ...form, severity: Number(form.severity), id: tempId };
    if (editingId) {
      setLogs((prev) => prev.map((l) => l.id === editingId ? { ...l, ...optimisticEntry, id: editingId } : l));
    } else {
      setLogs((prev) => [optimisticEntry, ...prev]);
    }
    setShowForm(false);
    setEditingId(null);

    try {
      let logId = editingId;
      if (editingId) {
        await base44.entities.DailyImpactLog.update(editingId, { ...form, severity: Number(form.severity) });
      } else {
        const log = await base44.entities.DailyImpactLog.create({ ...form, severity: Number(form.severity) });
        logId = log.id;
        // Replace temp entry with real one
        setLogs((prev) => prev.map((l) => l.id === tempId ? { ...l, id: logId } : l));
      }
      if (evidenceList.length > 0) {
        await Promise.all(evidenceList.map((ev) =>
          base44.entities.EvidenceItem.create({
            participant_id: form.participant_id,
            plan_goal_id: form.plan_goal_id || "",
            daily_log_id: logId,
            upload_date: form.date,
            description: ev.description,
            type: ev.type,
            file_url: ev.file_url,
            file_name: ev.file_name,
          })
        ));
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this entry?")) return;
    await base44.entities.DailyImpactLog.delete(id);
    load();
  };

  const openArchive = (log) => { setArchiveModal(log); setArchiveLabel(""); };

  const confirmArchive = async () => {
    if (!archiveModal) return;
    await base44.entities.DailyImpactLog.update(archiveModal.id, { archived: true, archive_label: archiveLabel || undefined });
    setArchiveModal(null);
    load();
  };

  const participantGoals = goals.filter((g) => g.participant_id === form.participant_id);

  const toggleGoal = (goalId) => {
    setForm((f) => ({
      ...f,
      plan_goal_ids: f.plan_goal_ids.includes(goalId)
        ? f.plan_goal_ids.filter((id) => id !== goalId)
        : [...f.plan_goal_ids, goalId],
    }));
  };

  const filtered = logs.filter((l) => {
    if (l.archived) return false;
    if (filterPid && l.participant_id !== filterPid) return false;
    if (dateFrom && l.date < dateFrom) return false;
    if (dateTo && l.date > dateTo) return false;
    return true;
  });

  return (
    <div ref={containerRef}>
      {/* Pull-to-refresh indicator */}
      {(pulling || refreshing) && (
        <div className="flex justify-center items-center py-2" style={{ transform: `translateY(${Math.min(pullDistance * 0.5, 32)}px)`, transition: pulling ? 'none' : 'transform 0.3s' }}>
          <RefreshCw className={`w-5 h-5 text-stone-400 ${refreshing ? 'animate-spin' : ''}`} style={{ transform: !refreshing ? `rotate(${pullDistance * 2}deg)` : '' }} />
        </div>
      )}
      <PageHeader
        title="Functional Impacts"
        subtitle="Capture real-life impacts, support needs, and patterns over time."
        action={
          <div className="flex items-center gap-2">
            <HelpButton pageName="ImpactLog" />
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors">
              <Plus className="w-4 h-4" /> Capture Impact
            </button>
          </div>
        }
      />

      {/* Filters + View Toggle */}
      <div className="space-y-2 mb-4">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 w-fit">
          <button onClick={() => setViewMode("card")} title="Card View" className={`p-1 rounded-lg transition-colors ${viewMode === "card" ? "bg-white shadow-sm text-amber-700" : "text-stone-500 hover:text-stone-700"}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("timeline")} title="Timeline View" className={`p-1 rounded-lg transition-colors ${viewMode === "timeline" ? "bg-white shadow-sm text-amber-700" : "text-stone-500 hover:text-stone-700"}`}><GitCommit className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("list")} title="List View" className={`p-1 rounded-lg transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-amber-700" : "text-stone-500 hover:text-stone-700"}`}><AlignJustify className="w-3.5 h-3.5" /></button>
        </div>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterPid("")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!filterPid ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 bg-white"}`}>All</button>
            {participants.map((p) => (
              <button key={p.id} onClick={() => setFilterPid(filterPid === p.id ? "" : p.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterPid === p.id ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 bg-white"}`}>{p.name}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-1">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-300 flex-1" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-300 flex-1" />
          </div>
          {(filterPid || dateFrom || dateTo) && (
            <button onClick={() => { setFilterPid(""); setDateFrom(""); setDateTo(""); }} className="text-xs text-amber-700 hover:underline px-2 whitespace-nowrap">Clear</button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/30 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-auto max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">{editingId ? "Edit Impact Entry" : "Capture Functional Impact"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-4 md:p-5 space-y-4 md:space-y-6">
             <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-2.5 py-1.5 md:px-3 md:py-2">
               <span className="text-sm md:text-base">🎤</span>
               <p className="text-xs text-blue-700">Use the <strong>microphone</strong> on your keyboard to dictate.</p>
             </div>

             {/* BASIC INFO */}
             <div className="space-y-3 md:space-y-4 pb-3 md:pb-4 border-b border-stone-100">
               <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Basic Info</h3>
               <div>
                 <label className="block text-xs font-medium text-stone-600 mb-1">Person Profile *</label>
                 <div className="flex flex-wrap gap-2">
                   {participants.map((p) => (
                     <button key={p.id} type="button" onClick={() => setForm({ ...form, participant_id: p.id, plan_goal_id: "" })} className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${form.participant_id === p.id ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"}`}>{p.name}</button>
                   ))}
                 </div>
               </div>
               <Field label="Date *" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
               <div>
                 <label className="block text-xs font-medium text-stone-600 mb-1.5">Reported By *</label>
                 <div className="flex flex-wrap gap-1.5 md:gap-2">
                   {REPORTED_BY_OPTIONS.map((option) => (
                     <button
                       key={option}
                       type="button"
                       onClick={() => setForm({ ...form, reported_by: form.reported_by === option ? "" : option })}
                       className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                         form.reported_by === option
                           ? "bg-amber-700 text-white border-amber-700"
                           : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"
                       }`}
                     >
                       {option}
                     </button>
                   ))}
                 </div>
                 {!form.reported_by && <p className="text-xs text-red-400 mt-1">Please select who observed the impact</p>}
               </div>
               <div>
                 <label className="block text-xs font-medium text-stone-600 mb-1">Time of Day *</label>
                 <div className="grid grid-cols-4 gap-2">
                   {["Morning", "Afternoon", "Evening", "Night"].map((t) => (
                     <button key={t} type="button" onClick={() => setForm({ ...form, environment: t.toLowerCase() })} className={`py-2 rounded-xl text-xs font-medium border transition-colors ${form.environment === t.toLowerCase() ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-600 hover:border-amber-300"}`}>{t}</button>
                   ))}
                 </div>
                 {!form.environment && <p className="text-xs text-red-400 mt-1">Please select a time of day</p>}
               </div>
               <Field label="Duration" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} placeholder="e.g. 45 minutes" />
             </div>

             {/* FUNCTIONAL IMPACT */}
             <div className="space-y-3 md:space-y-4 pb-3 md:pb-4 border-b border-stone-100">
               <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Functional Impact</h3>
               <div>
                 <label className="block text-xs font-medium text-stone-600 mb-2">Severity *</label>
                 <div className="flex gap-2">
                   {[1, 2, 3, 4, 5].map((n) => (
                     <button 
                       key={n} 
                       type="button" 
                       onClick={() => setForm({ ...form, severity: n })} 
                       className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                         form.severity === n 
                           ? `${SEVERITY_COLORS[n]} ring-2 ring-offset-1 ring-amber-400`
                           : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"
                       }`}
                     >
                       {n}
                     </button>
                   ))}
                 </div>
                 <p className="text-xs text-stone-400 mt-1">1 = mild · 5 = severe</p>
               </div>
             </div>

             {/* OUTCOME */}
             <div className="space-y-3 md:space-y-4 pb-3 md:pb-4 border-b border-stone-100">
               <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Outcome</h3>
               <Textarea label="Functional Impact - What happened? *" value={form.functional_impact} onChange={(v) => setForm({ ...form, functional_impact: v })} rows={3} />
               {!form.functional_impact && <p className="text-xs text-red-400 -mt-2">Please describe what happened</p>}
             </div>

             {/* SUPPORT REQUIRED */}
             <div className="space-y-3 md:space-y-4 pb-3 md:pb-4 border-b border-stone-100">
               <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Support Required</h3>
               <div className="flex flex-col gap-2">
                 {SUPPORT_REQUIRED_OPTIONS.map(({ value, label }) => (
                   <button
                     key={value}
                     type="button"
                     onClick={() => setForm({ ...form, support_required: value })}
                     className={`text-left px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-2 ${
                       form.support_required === value
                         ? "bg-amber-700 text-white border-amber-700"
                         : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"
                     }`}
                   >
                     <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${form.support_required === value ? "bg-white border-white" : "border-stone-300"}`}>
                       {form.support_required === value && <span className="block w-2 h-2 rounded-full bg-amber-700" />}
                     </span>
                     {label}
                   </button>
                 ))}
               </div>
             </div>

             {/* NOTES */}
             <div className="space-y-3 md:space-y-4 pb-3 md:pb-4 border-b border-stone-100">
               <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Notes</h3>
               <Textarea label="" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} rows={2} />
             </div>
              <div className="space-y-3 md:space-y-4 pb-3 md:pb-4 border-b border-stone-100">
                <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Linked Goals & Supports</h3>
                {participantGoals.length === 0 ? (
                  <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                    <p className="text-xs text-stone-600 mb-2"><strong>No goals or supports added to this profile yet.</strong></p>
                    <p className="text-xs text-stone-500">Add them in the person profile to enable linking.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-stone-500 mb-2">Select any goals or supports already uploaded to the person's profile. Linking them helps identify patterns and supports deeper analysis.</p>
                    <div className="flex flex-col gap-2">
                      {participantGoals.map((g) => {
                        const selected = form.plan_goal_ids.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => toggleGoal(g.id)}
                            className={`text-left px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-2 ${
                              selected ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-700 hover:border-amber-300 bg-white"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-white border-white" : "border-stone-300"}`}>
                              {selected && <span className="block w-2 h-2 rounded-sm bg-amber-700" />}
                            </span>
                            {g.title}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Evidence attachments */}
              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs font-medium text-stone-600 mb-3 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Attach Evidence (optional)
                </p>
                {/* Added evidence list */}
                {evidenceList.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {evidenceList.map((ev, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-teal-50 rounded-xl px-3 py-2">
                        <Paperclip className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="text-xs text-teal-800 flex-1 truncate">{ev.description || ev.file_name || "File"}</span>
                        <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full capitalize">{ev.type}</span>
                        <button type="button" onClick={() => removeEvidence(idx)}><X className="w-3.5 h-3.5 text-teal-400 hover:text-red-500" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Evidence entry row */}
                <div className="space-y-2 bg-stone-50 rounded-xl p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Description…"
                      value={evidenceForm.description}
                      onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                      className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                    />
                    <select
                       value={evidenceForm.type}
                       onChange={(e) => setEvidenceForm({ ...evidenceForm, type: e.target.value })}
                       className="border border-stone-200 rounded-lg px-2 py-2 text-sm text-stone-700 bg-white"
                     >
                       {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1.5 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-600 bg-white cursor-pointer hover:border-teal-300 flex-1">
                      <Upload className="w-3.5 h-3.5 text-stone-400" />
                      <span className="truncate text-xs">{uploading ? "Uploading…" : evidenceForm.file_name || "Upload file"}</span>
                      <input type="file" className="hidden" onChange={handleEvidenceFile} accept="image/*,video/*,.pdf,.doc,.docx" />
                    </label>
                    <button
                      type="button"
                      onClick={addEvidence}
                      disabled={!evidenceForm.description.trim() && !evidenceForm.file_url}
                      className="px-3 py-2 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 disabled:opacity-40 shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-4 md:p-5 border-t border-stone-100">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 md:py-2.5 border border-stone-200 rounded-xl text-xs md:text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 md:py-2.5 bg-amber-700 text-white rounded-xl text-xs md:text-sm hover:bg-amber-800 disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update Entry" : "Save Impact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive modal */}
      {archiveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-stone-800">Archive Entry</h3>
              <button onClick={() => setArchiveModal(null)} className="p-1 rounded-lg hover:bg-stone-100"><X className="w-4 h-4 text-stone-500" /></button>
            </div>
            <p className="text-sm text-stone-500 mb-4">This entry will move to the Archive. You can restore it anytime. Optionally add a label to group it with related entries.</p>
            <label className="block text-xs font-medium text-stone-600 mb-1">Archive label (optional)</label>
            <input
              type="text"
              value={archiveLabel}
              onChange={(e) => setArchiveLabel(e.target.value)}
              placeholder="e.g. Term 1 2024, Pre-review period…"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setArchiveModal(null)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={confirmArchive} className="flex items-center gap-2 px-5 py-2 bg-stone-700 text-white text-sm rounded-xl hover:bg-stone-800 transition-colors">
                <Archive className="w-4 h-4" /> Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No functional impacts captured yet" subtitle="Capture everyday moments and support needs as they happen." action={<button onClick={openNew} className="px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800">Capture Impact</button>} />
      ) : (
        viewMode === "card" ? (
          <CardView logs={filtered} participants={participants} goals={goals} evidence={evidence} onEdit={openEdit} onDelete={remove} onArchive={openArchive} />
        ) : viewMode === "timeline" ? (
          <TimelineView logs={filtered} participants={participants} evidence={evidence} onEdit={openEdit} onDelete={remove} onArchive={openArchive} />
        ) : (
          <ListView logs={filtered} participants={participants} evidence={evidence} onEdit={openEdit} onDelete={remove} onArchive={openArchive} />
        )
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 2 }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
    </div>
  );
}