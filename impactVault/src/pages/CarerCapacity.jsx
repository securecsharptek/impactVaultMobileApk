import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import HelpButton from "../components/shared/HelpButton";
import CarerCapacityForm from "../components/shared/CarerCapacityForm";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import { parseISO, format, subDays } from "date-fns";
import { todayLocal } from "@/utils";

const EMPTY = { carer_name: "", participant_id: "", plan_goal_id: "", date: todayLocal(), fatigue_level: 3, emotional_load: 3, sleep_impact: 3, administrative_load: 3, carer_plans_impacted: [], additional_support_needed: "No", notes: "" };

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

  const save = async (formData) => {
    setSaving(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry = { 
      ...formData, 
      fatigue_level: Number(formData.fatigue_level), 
      emotional_load: Number(formData.emotional_load), 
      sleep_impact: Number(formData.sleep_impact), 
      administrative_load: Number(formData.administrative_load), 
      id: tempId 
    };
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

      {/* Form Modal */}
      {showForm && (
        <CarerCapacityForm
          initialForm={form}
          participants={participants}
          goals={goals}
          onClose={() => setShowForm(false)}
          onSave={save}
          saving={saving}
          isModal={true}
        />
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