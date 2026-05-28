import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, BookOpen, FolderOpen, Heart, Upload, Paperclip } from "lucide-react";

// ── Constants (mirror pages) ──────────────────────────────────────────────────
const IMPACT_TYPES = [
  "School Attendance Impact","Social Participation Impact","Behaviour Escalation",
  "Emotional Regulation Difficulty","Therapy Disruption","Medical Episode",
  "Fatigue / Shutdown","Support Breakdown","Community Access Difficulty",
  "Family Participation Impact","Other",
];
const IMPACT_LEVELS = [
  { value: "minor", label: "Minor", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "moderate", label: "Moderate", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "major", label: "Major", color: "bg-red-100 text-red-800 border-red-300" },
];
const SUPPORT_OPTIONS = [
  { value: "no_additional", label: "No additional support required" },
  { value: "parent_carer", label: "Parent/carer intervention required" },
  { value: "therapy_worker", label: "Therapy/support worker required" },
  { value: "school_intervention", label: "School intervention required" },
  { value: "medical_support", label: "Medical support required" },
];
const EVIDENCE_TYPES = ["school","therapy","medical","behaviour","other"];
const METRICS = [
  { key: "fatigue_level", label: "Fatigue", color: "#f59e0b" },
  { key: "emotional_load", label: "Emotional Load", color: "#ef4444" },
  { key: "sleep_impact", label: "Sleep Impact", color: "#8b5cf6" },
  { key: "administrative_load", label: "Admin Load", color: "#06b6d4" },
];

const EMPTY_IMPACT = { participant_id:"", plan_goal_id:"", plan_goal_ids:[], date:today(), severity:3, impact_level:"", impact_types:[], functional_impact:"", support_required:"", environment:"home", duration:"", notes:"" };
const EMPTY_EVIDENCE = { participant_id:"", plan_goal_id:"", upload_date:today(), description:"", type:"other", file_url:"", file_name:"" };
const EMPTY_CARER = { carer_name:"", participant_id:"", date:today(), fatigue_level:3, emotional_load:3, sleep_impact:3, administrative_load:3, notes:"" };

function today() { return new Date().toISOString().slice(0,10); }

// ── Main FAB Component ────────────────────────────────────────────────────────
export default function QuickLogFAB() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null); // "impact" | "evidence" | "carer"
  const [participants, setParticipants] = useState([]);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (!user) return;
      Promise.all([
        base44.entities.ParticipantProfile.filter({ created_by: user.email }),
        base44.entities.PlanGoal.filter({ created_by: user.email }),
      ]).then(([p, g]) => { setParticipants(p); setGoals(g); });
    });
  }, []);

  const open = (type) => { setModal(type); setMenuOpen(false); };
  const close = () => setModal(null);

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-24 right-6 z-40 md:bottom-6 flex flex-col items-end gap-3">
        {/* Action menu */}
        {menuOpen && (
          <div className="flex flex-col items-end gap-2 mb-1">
            <FabOption icon={<BookOpen className="w-4 h-4" />} label="Log Impact" color="bg-amber-700" onClick={() => open("impact")} />
            <FabOption icon={<FolderOpen className="w-4 h-4" />} label="Upload Evidence" color="bg-teal-600" onClick={() => open("evidence")} />
            <FabOption icon={<Heart className="w-4 h-4" />} label="Log Caregiver Capacity" color="bg-rose-600" onClick={() => open("carer")} />
          </div>
        )}
        {/* Main button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-14 h-14 rounded-full bg-amber-700 text-white shadow-lg flex items-center justify-center hover:bg-amber-800 transition-all"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop for menu */}
      {menuOpen && <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />}

      {/* Modals */}
      {modal === "impact" && (
        <ImpactModal participants={participants} goals={goals} onClose={close} />
      )}
      {modal === "evidence" && (
        <EvidenceModal participants={participants} goals={goals} onClose={close} />
      )}
      {modal === "carer" && (
        <CarerModal participants={participants} goals={goals} onClose={close} />
      )}
    </>
  );
}

function FabOption({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium shadow-md ${color} hover:opacity-90 transition-opacity`}
    >
      {icon} {label}
    </button>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSave, saving, saveLabel, saveColor = "bg-amber-700 hover:bg-amber-800", children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400" /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="flex gap-3 p-5 border-t border-stone-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
          <button onClick={onSave} disabled={saving} className={`flex-1 py-2.5 text-white rounded-xl text-sm disabled:opacity-60 ${saveColor}`}>
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Impact Modal ──────────────────────────────────────────────────────────────
function ImpactModal({ participants, goals, onClose }) {
  const [form, setForm] = useState(EMPTY_IMPACT);
  const [saving, setSaving] = useState(false);

  const toggleType = (t) => setForm((f) => ({
    ...f, impact_types: f.impact_types.includes(t) ? f.impact_types.filter(x => x !== t) : [...f.impact_types, t]
  }));

  const toggleGoal = (id) => setForm((f) => ({
    ...f, plan_goal_ids: f.plan_goal_ids.includes(id) ? f.plan_goal_ids.filter(x => x !== id) : [...f.plan_goal_ids, id]
  }));

  const save = async () => {
    if (!form.participant_id || form.impact_types.length === 0) return;
    setSaving(true);
    await base44.entities.DailyImpactLog.create({ ...form, severity: Number(form.severity) });
    setSaving(false);
    onClose();
  };

  const pGoals = goals.filter(g => g.participant_id === form.participant_id);

  return (
    <Modal title="New Impact Entry" onClose={onClose} onSave={save} saving={saving} saveLabel="Save Entry">
      <SelectField label="Participant *" value={form.participant_id} onChange={v => setForm({ ...form, participant_id: v, plan_goal_id: "", plan_goal_ids: [] })} options={participants.map(p => ({ value: p.id, label: p.name }))} placeholder="Select participant…" />
      <InputField label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">Severity *</label>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" onClick={() => setForm({ ...form, severity: n })}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.severity === n ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-600 hover:border-amber-300"}`}>{n}</button>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-1">1 = mild · 5 = severe</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">Impact Level</label>
        <div className="grid grid-cols-3 gap-2">
          {IMPACT_LEVELS.map(({ value, label, color }) => (
            <button key={value} type="button" onClick={() => setForm({ ...form, impact_level: form.impact_level === value ? "" : value })}
              className={`py-2 rounded-xl text-xs font-medium border transition-colors ${form.impact_level === value ? color + " ring-2 ring-offset-1 ring-amber-400" : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">What happened? * <span className="text-stone-400 font-normal">(select all that apply)</span></label>
        <div className="flex flex-wrap gap-2">
          {IMPACT_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.impact_types.includes(t) ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"}`}>
              {t}
            </button>
          ))}
        </div>
        {form.impact_types.length === 0 && <p className="text-xs text-red-400 mt-1">Please select at least one option</p>}
      </div>
      <TextareaField label="Functional Impact" value={form.functional_impact} onChange={v => setForm({ ...form, functional_impact: v })} />
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">Support Required</label>
        <div className="flex flex-col gap-2">
          {SUPPORT_OPTIONS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setForm({ ...form, support_required: form.support_required === value ? "" : value })}
              className={`text-left px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${form.support_required === value ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Environment</label>
        <div className="grid grid-cols-4 gap-2">
          {["home","school","community","other"].map(env => (
            <button key={env} type="button" onClick={() => setForm({ ...form, environment: env })}
              className={`py-2 rounded-xl text-xs font-medium border capitalize transition-colors ${form.environment === env ? "bg-amber-700 text-white border-amber-700" : "border-stone-200 text-stone-600 hover:border-amber-300"}`}>{env}</button>
          ))}
        </div>
      </div>
      <InputField label="Duration" value={form.duration} onChange={v => setForm({ ...form, duration: v })} placeholder="e.g. 45 minutes" />
      {pGoals.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-2">
            Linked Goals & Supports <span className="text-stone-400 font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-col gap-2">
            {pGoals.map((g) => {
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
        </div>
      )}
      <TextareaField label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
    </Modal>
  );
}

// ── Evidence Modal ────────────────────────────────────────────────────────────
function EvidenceModal({ participants, goals, onClose }) {
  const [form, setForm] = useState(EMPTY_EVIDENCE);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url, file_name: file.name }));
    setUploading(false);
  };

  const save = async () => {
    if (!form.participant_id || !form.description.trim()) return;
    setSaving(true);
    await base44.entities.EvidenceItem.create(form);
    setSaving(false);
    onClose();
  };

  const pGoals = goals.filter(g => g.participant_id === form.participant_id && g.status === "active");

  return (
    <Modal title="Upload Evidence" onClose={onClose} onSave={save} saving={saving || uploading} saveLabel="Save Evidence" saveColor="bg-teal-600 hover:bg-teal-700">
      <SelectField label="Participant *" value={form.participant_id} onChange={v => setForm({ ...form, participant_id: v, plan_goal_id: "" })} options={participants.map(p => ({ value: p.id, label: p.name }))} placeholder="Select participant…" />
      <InputField label="Upload Date" type="date" value={form.upload_date} onChange={v => setForm({ ...form, upload_date: v })} />
      <TextareaField label="Description *" value={form.description} onChange={v => setForm({ ...form, description: v })} />
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Evidence Type</label>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300">
          {EVIDENCE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </div>
      {pGoals.length > 0 && (
        <SelectField label="Linked Goal" value={form.plan_goal_id} onChange={v => setForm({ ...form, plan_goal_id: v })} options={pGoals.map(g => ({ value: g.id, label: g.title }))} placeholder="None" />
      )}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">File</label>
        <label className="flex flex-col items-center gap-2 border-2 border-dashed border-stone-200 rounded-xl p-5 cursor-pointer hover:border-teal-300 hover:bg-teal-50 transition-colors">
          <Upload className="w-5 h-5 text-stone-400" />
          <span className="text-sm text-stone-500">{uploading ? "Uploading…" : form.file_name || "Click to select a file"}</span>
          <input type="file" className="hidden" onChange={handleFile} accept="image/*,video/*,.pdf,.doc,.docx" />
        </label>
      </div>
    </Modal>
  );
}

// ── Carer Modal ───────────────────────────────────────────────────────────────
function CarerModal({ participants, goals, onClose }) {
  const [form, setForm] = useState(EMPTY_CARER);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.carer_name.trim()) return;
    setSaving(true);
    await base44.entities.CarerCapacityLog.create({
      ...form,
      fatigue_level: Number(form.fatigue_level),
      emotional_load: Number(form.emotional_load),
      sleep_impact: Number(form.sleep_impact),
      administrative_load: Number(form.administrative_load),
    });
    setSaving(false);
    onClose();
  };

  const pGoals = goals.filter(g => g.participant_id === form.participant_id && g.status === "active");

  return (
    <Modal title="Log Caregiver Capacity" onClose={onClose} onSave={save} saving={saving} saveLabel="Save Entry" saveColor="bg-rose-600 hover:bg-rose-700">
      <InputField label="Caregiver Name *" value={form.carer_name} onChange={v => setForm({ ...form, carer_name: v })} placeholder="Enter name…" />
      <InputField label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
      <SelectField label="Person Profile" value={form.participant_id} onChange={v => setForm({ ...form, participant_id: v, plan_goal_id: "" })} options={participants.map(p => ({ value: p.id, label: p.name }))} placeholder="None" />
      {METRICS.map(m => (
        <div key={m.key}>
          <label className="block text-xs font-medium text-stone-600 mb-2">{m.label}</label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setForm({ ...form, [m.key]: n })}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${Number(form[m.key]) === n ? "text-white border-transparent" : "border-stone-200 text-stone-600 hover:border-stone-300"}`}
                style={Number(form[m.key]) === n ? { backgroundColor: m.color, borderColor: m.color } : {}}>{n}</button>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-1">1 = minimal · 5 = very high</p>
        </div>
      ))}
      {pGoals.length > 0 && (
        <SelectField label="Linked Goal" value={form.plan_goal_id} onChange={v => setForm({ ...form, plan_goal_id: v })} options={pGoals.map(g => ({ value: g.id, label: g.title }))} placeholder="None" />
      )}
      <TextareaField label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
    </Modal>
  );
}

// ── Shared form helpers ───────────────────────────────────────────────────────
function InputField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 2 }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}