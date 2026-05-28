import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Heart, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import HelpButton from "../components/shared/HelpButton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import { parseISO, format, subDays } from "date-fns";

const EMPTY = { carer_name: "", participant_id: "", plan_goal_id: "", date: new Date().toISOString().slice(0, 10), fatigue_level: 3, emotional_load: 3, sleep_impact: 3, administrative_load: 3, carer_plans_impacted: [], additional_support_needed: "No", notes: "" };

const PLANS_OPTIONS = ["Work", "Appointments or commitments", "Social plans", "Household responsibilities", "Sleep / rest", "Other"];
const SUPPORT_OPTIONS = ["No", "Informal support", "Formal support"];

const METRICS = [
  { key: "fatigue_level", label: "Fatigue", color: "#f59e0b" },
  { key: "emotional_load", label: "Emotional Load", color: "#ef4444" },
  { key: "sleep_impact", label: "Sleep Impact", color: "#8b5cf6" },
  { key: "administrative_load", label: "Admin Load", color: "#06b6d4" },
];

export default function CarerCapacity() {
  const [logs, setLogs] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterPid, setFilterPid] = useState("");

  const load = async () => {
    const user = await base44.auth.me();
    if (!user) return;
    const [l, p, g] = await Promise.all([
      base44.entities.CarerCapacityLog.filter({ created_by: user.email }, "-date"),
      base44.entities.ParticipantProfile.filter({ created_by: user.email }),
      base44.entities.PlanGoal.filter({ created_by: user.email }),
    ]);
    setLogs(l); setParticipants(p); setGoals(g); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.carer_name.trim()) {
      toast.error("Please enter a carer name.");
      return;
    }
    setSaving(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry = { ...form, fatigue_level: Number(form.fatigue_level), emotional_load: Number(form.emotional_load), sleep_impact: Number(form.sleep_impact), administrative_load: Number(form.administrative_load), id: tempId };
    setLogs((prev) => [optimisticEntry, ...prev]);
    setShowForm(false);
    setForm(EMPTY);

    try {
      const saved = await base44.entities.CarerCapacityLog.create(optimisticEntry);
      setLogs((prev) => prev.map((l) => l.id === tempId ? { ...l, id: saved.id } : l));
      toast.success("Capacity entry saved!");
    } catch (err) {
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
      toast.error("Failed to save entry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this entry?")) return;
    await base44.entities.CarerCapacityLog.delete(id);
    load();
  };

  const participantGoals = goals.filter((g) => g.participant_id === form.participant_id && g.status === "active");
  const filtered = filterPid ? logs.filter((l) => l.participant_id === filterPid) : logs;

  // Chart data - last 30 days
  const chartData = (() => {
    const days = [];
    const source = filtered.slice(0, 30).reverse();
    return source.map((l) => ({
      day: l.date,
      Fatigue: l.fatigue_level,
      "Emotional Load": l.emotional_load,
      "Sleep Impact": l.sleep_impact,
      "Admin Load": l.administrative_load,
    }));
  })();

  return (
    <div>
      <PageHeader
        title="Carer Capacity Log"
        subtitle="Capture changes in wellbeing, stress, and support capacity over time."
        action={
          <div className="flex items-center gap-2">
            <HelpButton pageName="CarerCapacity" />
            <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm rounded-xl hover:bg-rose-700 transition-colors">
              <Plus className="w-4 h-4" /> Capture Capacity
            </button>
          </div>
        }
      />

      {participants.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setFilterPid("")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!filterPid ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 bg-white"}`}>All</button>
          {participants.map((p) => (
            <button key={p.id} onClick={() => setFilterPid(filterPid === p.id ? "" : p.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterPid === p.id ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 bg-white"}`}>{p.name}</button>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Capacity Trends</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 5]} hide />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {METRICS.map((m) => (
                <Line key={m.key} type="monotone" dataKey={m.label} stroke={m.color} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">Capture Carer Capacity</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Carer Name *</label>
                <input type="text" value={form.carer_name} onChange={(e) => setForm({ ...form, carer_name: e.target.value })} placeholder="Enter carer name…" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              {METRICS.map((m) => (
               <ScaleField key={m.key} label={m.label} value={form[m.key]} onChange={(v) => setForm({ ...form, [m.key]: v })} color={m.color} />
              ))}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">Carer Plans Impacted</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.carer_plans_impacted?.length === 0} onChange={(e) => setForm({ ...form, carer_plans_impacted: e.target.checked ? [] : form.carer_plans_impacted })} className="rounded border-stone-300" />
                    <span className="text-sm text-stone-600">None</span>
                  </label>
                  {PLANS_OPTIONS.map((plan) => (
                    <label key={plan} className="flex items-center gap-2">
                      <input type="checkbox" checked={form.carer_plans_impacted?.includes(plan)} onChange={(e) => {
                        let updated = form.carer_plans_impacted || [];
                        if (e.target.checked) {
                          updated = [...updated.filter(p => p !== "None"), plan];
                        } else {
                          updated = updated.filter(p => p !== plan);
                        }
                        setForm({ ...form, carer_plans_impacted: updated });
                      }} className="rounded border-stone-300" />
                      <span className="text-sm text-stone-600">{plan}</span>
                    </label>
                  ))}
                </div>
                </div>
                <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">Was additional support needed?</label>
                <div className="space-y-2">
                  {SUPPORT_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input type="radio" name="support" value={option} checked={form.additional_support_needed === option} onChange={(e) => setForm({ ...form, additional_support_needed: e.target.value })} className="rounded-full border-stone-300" />
                      <span className="text-sm text-stone-600">{option}</span>
                    </label>
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
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-100">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm hover:bg-rose-700 disabled:opacity-60">
                {saving ? "Saving…" : "Save Capacity Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Heart} title="No carer capacity updates yet" subtitle="Understand how caring impacts your wellbeing and support capacity over time." action={<button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="px-4 py-2 bg-rose-600 text-white text-sm rounded-xl hover:bg-rose-700">Capture Capacity</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => {
            const p = participants.find((x) => x.id === log.participant_id);
            const avg = ((log.fatigue_level + log.emotional_load + log.sleep_impact + log.administrative_load) / 4).toFixed(1);
            return (
              <div key={log.id} className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-700">{log.date}</span>
                      {log.carer_name && <span className="text-xs text-stone-400">{log.carer_name}</span>}
                    </div>
                    <div className="flex gap-3 mt-2">
                      {METRICS.map((m) => (
                        <div key={m.key} className="text-center">
                          <div className="text-xs text-stone-400">{m.label.split(" ")[0]}</div>
                          <div className="text-sm font-semibold" style={{ color: m.color }}>{log[m.key]}</div>
                        </div>
                      ))}
                      <div className="text-center ml-2 border-l border-stone-100 pl-2">
                        <div className="text-xs text-stone-400">Avg</div>
                        <div className="text-sm font-semibold text-stone-600">{avg}</div>
                      </div>
                    </div>
                    {log.notes && <p className="text-xs text-stone-400 mt-2 italic">{log.notes}</p>}
                  </div>
                  <button onClick={() => remove(log.id)} className="p-1.5 rounded-lg hover:bg-red-50 shrink-0 ml-3"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScaleField({ label, value, onChange }) {
  const colors = {
    1: "bg-stone-300 text-white border-stone-300",
    2: "bg-green-500 text-white border-green-500",
    3: "bg-amber-400 text-white border-amber-400",
    4: "bg-orange-500 text-white border-orange-500",
    5: "bg-red-500 text-white border-red-500",
  };

  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${Number(value) === n ? colors[n] : "border-stone-200 text-stone-600 hover:border-stone-300"}`}>{n}</button>
        ))}
      </div>
      <p className="text-xs text-stone-400 mt-1">1 = minimal · 5 = severe</p>
    </div>
  );
}