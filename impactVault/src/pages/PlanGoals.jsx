import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Target, X, Pencil, Trash2, ChevronDown, ChevronUp, Archive, RefreshCw } from "lucide-react";
import MobileSelect from "../components/shared/MobileSelect";
import { toast } from "sonner";
import HelpButton from "../components/shared/HelpButton";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";

const EMPTY = { participant_id: "", title: "", description: "", supports_strategies: "", progress_notes: "" };
const EMPTY_PERIOD = { participant_id: "", new_start: "", new_end: "", archive_label: "" };


export default function PlanGoals() {
  const [goals, setGoals] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expanded, setExpanded] = useState({});
  const [filterPid, setFilterPid] = useState("");
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodForm, setPeriodForm] = useState(EMPTY_PERIOD);
  const [periodSaving, setPeriodSaving] = useState(false);

  const load = async () => {
    const user = await base44.auth.me();
    if (!user) return;
    const [g, p] = await Promise.all([
      base44.entities.PlanGoal.filter({ created_by: user.email }),
      base44.entities.ParticipantProfile.filter({ created_by: user.email }),
    ]);
    setGoals(g); setParticipants(p); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (g) => { setEditing(g); setForm({ participant_id: g.participant_id, title: g.title, description: g.description || "", supports_strategies: g.supports_strategies || "", progress_notes: g.progress_notes || "" }); setShowForm(true); };

  const save = async () => {
    if (!form.title.trim() || !form.participant_id) return;
    setSaving(true);
    if (editing) await base44.entities.PlanGoal.update(editing.id, form);
    else await base44.entities.PlanGoal.create(form);
    setSaving(false); setShowForm(false); load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this goal?")) return;
    await base44.entities.PlanGoal.delete(id);
    load();
  };

  const openNewPeriod = () => {
    const pid = filterPid || (participants.length === 1 ? participants[0].id : "");
    const p = participants.find(x => x.id === pid);
    setPeriodForm({
      participant_id: pid,
      new_start: "",
      new_end: "",
      archive_label: p?.plan_start_date && p?.plan_end_date ? `Plan ${p.plan_start_date} → ${p.plan_end_date}` : "Previous Plan",
    });
    setShowPeriodModal(true);
  };

  const saveNewPeriod = async () => {
    if (!periodForm.participant_id) return;
    setPeriodSaving(true);
    // Archive all active goals for this participant
    const activeGoals = goals.filter(g => g.participant_id === periodForm.participant_id && !g.archived);
    await Promise.all(activeGoals.map(g =>
      base44.entities.PlanGoal.update(g.id, { archived: true, archive_label: periodForm.archive_label || "Previous Plan" })
    ));
    // Update participant plan dates if provided
    if (periodForm.new_start || periodForm.new_end) {
      await base44.entities.ParticipantProfile.update(periodForm.participant_id, {
        plan_start_date: periodForm.new_start,
        plan_end_date: periodForm.new_end,
      });
    }
    setPeriodSaving(false);
    setShowPeriodModal(false);
    toast.success(`${activeGoals.length} goal${activeGoals.length !== 1 ? 's' : ''} archived. Add your new plan goals below.`);
    load();
  };

  const activeGoals = goals.filter(g => !g.archived);
  const archivedGoals = goals.filter(g => g.archived);
  const filtered = (filterPid
    ? (showArchived ? archivedGoals : activeGoals).filter(g => g.participant_id === filterPid)
    : (showArchived ? archivedGoals : activeGoals));

  return (
    <div>
      <PageHeader
        title="Support Plan Goals"
        subtitle="Track goals from your participant's current support plan"
        action={
          <div className="flex items-center gap-2">
            <HelpButton pageName="PlanGoals" />
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Goal</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        }
      />

      {/* New Plan Period — sits below header as a clear action row */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button onClick={openNewPeriod} className="flex items-center gap-2 px-4 py-2 bg-stone-600 text-white text-sm rounded-xl hover:bg-stone-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> New Plan Period
        </button>
        {archivedGoals.length > 0 && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${
              showArchived ? "bg-stone-700 text-white border-stone-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"
            }`}
          >
            <Archive className="w-3.5 h-3.5" /> {showArchived ? "Viewing archived" : `Archived (${archivedGoals.length})`}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {participants.length > 1 && (
          <MobileSelect
            value={filterPid}
            onChange={setFilterPid}
            placeholder="All participants"
            options={[{ value: "", label: "All participants" }, ...participants.map((p) => ({ value: p.id, label: p.name }))]}
            className="w-auto min-w-[160px]"
          />
        )}
      </div>

      {/* New Plan Period Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">Start New Plan Period</h2>
              <button onClick={() => setShowPeriodModal(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                All current active goals for the selected person will be archived. You can view them anytime using the "Archived" filter.
              </div>
              {participants.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Person *</label>
                  <MobileSelect
                    value={periodForm.participant_id}
                    onChange={(v) => {
                      const p = participants.find(x => x.id === v);
                      setPeriodForm(f => ({
                        ...f,
                        participant_id: v,
                        archive_label: p?.plan_start_date && p?.plan_end_date ? `Plan ${p.plan_start_date} → ${p.plan_end_date}` : "Previous Plan",
                      }));
                    }}
                    placeholder="Select person…"
                    options={participants.map(p => ({ value: p.id, label: p.name }))}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Archive label for current goals</label>
                <input type="text" value={periodForm.archive_label} onChange={(e) => setPeriodForm(f => ({ ...f, archive_label: e.target.value }))} placeholder="e.g. Plan 2023–2024" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              <div className="border-t border-stone-100 pt-3">
                <p className="text-xs font-medium text-stone-600 mb-3">New Plan Dates (optional — updates the person profile)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">New Plan Start</label>
                    <input type="date" value={periodForm.new_start} onChange={(e) => setPeriodForm(f => ({ ...f, new_start: e.target.value }))} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">New Plan End</label>
                    <input type="date" value={periodForm.new_end} onChange={(e) => setPeriodForm(f => ({ ...f, new_end: e.target.value }))} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-100">
              <button onClick={() => setShowPeriodModal(false)} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              <button onClick={saveNewPeriod} disabled={periodSaving || !periodForm.participant_id} className="flex-1 py-2.5 bg-stone-700 text-white rounded-xl text-sm hover:bg-stone-800 disabled:opacity-60">
                {periodSaving ? "Archiving…" : "Archive Goals & Start New Period"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">{editing ? "Edit Goal" : "New Plan Goal"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Participant *</label>
                <MobileSelect
                  value={form.participant_id}
                  onChange={(v) => setForm({ ...form, participant_id: v })}
                  placeholder="Select participant…"
                  options={participants.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
              <Field label="Goal Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Textarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={3} />
              <Textarea label="Supports & strategies to work towards this goal" value={form.supports_strategies} onChange={(v) => setForm({ ...form, supports_strategies: v })} rows={3} />
              <Textarea label="Progress Notes" value={form.progress_notes} onChange={(v) => setForm({ ...form, progress_notes: v })} />

            </div>
            <div className="flex gap-3 p-5 border-t border-stone-100">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-amber-700 text-white rounded-xl text-sm hover:bg-amber-800 disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" subtitle="Add support plan goals to start tracking progress" action={<button onClick={openNew} className="px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800">Add Goal</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const p = participants.find((x) => x.id === g.participant_id);
            const open = expanded[g.id];
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-stone-200">
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded({ ...expanded, [g.id]: !open })}>
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800">{g.title}</p>
                    {p && <p className="text-xs text-stone-400">{p.name}</p>}
                    {g.archived && g.archive_label && <p className="text-xs text-stone-300 italic">{g.archive_label}</p>}
                  </div>

                  {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                </div>
                {open && (
                  <div className="px-4 pb-4 border-t border-stone-100 pt-3 space-y-3">
                    {g.description && <InfoRow label="Description" value={g.description} />}
                    {g.supports_strategies && <InfoRow label="Supports & Strategies" value={g.supports_strategies} />}
                    {g.progress_notes && <InfoRow label="Progress Notes" value={g.progress_notes} />}
                    <div className="flex gap-2 pt-1">
                      {!g.archived && (
                        <button onClick={() => openEdit(g)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      )}
                      {g.archived && (
                        <button onClick={async () => { await base44.entities.PlanGoal.update(g.id, { archived: false, archive_label: "" }); load(); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50">
                          <RefreshCw className="w-3 h-3" /> Restore
                        </button>
                      )}
                      <button onClick={() => remove(g.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-stone-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
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