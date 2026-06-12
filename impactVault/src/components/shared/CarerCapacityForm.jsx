import { useState } from "react";
import { X } from "lucide-react";

const PLANS_OPTIONS = ["Work", "Appointments or commitments", "Social plans", "Household responsibilities", "Sleep / rest", "Other"];
const SUPPORT_OPTIONS = ["No", "Informal support", "Formal support"];

const METRICS = [
  { key: "fatigue_level", label: "Fatigue", color: "#f59e0b" },
  { key: "emotional_load", label: "Emotional Load", color: "#ef4444" },
  { key: "sleep_impact", label: "Sleep Impact", color: "#8b5cf6" },
  { key: "administrative_load", label: "Admin Load", color: "#06b6d4" },
];

/**
 * CarerCapacityForm — Reusable form for logging caregiver capacity
 * Used in both CarerCapacity page and QuickLogFAB
 */
export default function CarerCapacityForm({
  initialForm,
  participants = [],
  goals = [],
  onClose,
  onSave,
  saving = false,
  isModal = true, // true for full-screen modal, false for inline
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.carer_name.trim()) {
      setError("Please enter the caregiver's name.");
      return;
    }
    setError("");
    await onSave(form);
  };

  const participantGoals = goals.filter((g) => g.participant_id === form.participant_id && g.status === "active");

  const formContent = (
    <div className="p-5 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Carer Name *</label>
        <input
          type="text"
          value={form.carer_name}
          onChange={(e) => setForm({ ...form, carer_name: e.target.value })}
          placeholder="Enter carer name…"
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
      {participants.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Person Profile</label>
          <select
            value={form.participant_id}
            onChange={(e) => setForm({ ...form, participant_id: e.target.value, plan_goal_id: "" })}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <option value="">Select a person (optional)</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {METRICS.map((m) => (
        <ScaleField
          key={m.key}
          label={m.label}
          value={form[m.key]}
          onChange={(v) => setForm({ ...form, [m.key]: v })}
          color={m.color}
        />
      ))}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">Carer Plans Impacted</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.carer_plans_impacted?.length === 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  carer_plans_impacted: e.target.checked ? [] : form.carer_plans_impacted,
                })
              }
              className="rounded border-stone-300"
            />
            <span className="text-sm text-stone-600">None</span>
          </label>
          {PLANS_OPTIONS.map((plan) => (
            <label key={plan} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.carer_plans_impacted?.includes(plan)}
                onChange={(e) => {
                  let updated = form.carer_plans_impacted || [];
                  if (e.target.checked) {
                    updated = [...updated.filter((p) => p !== "None"), plan];
                  } else {
                    updated = updated.filter((p) => p !== plan);
                  }
                  setForm({ ...form, carer_plans_impacted: updated });
                }}
                className="rounded border-stone-300"
              />
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
              <input
                type="radio"
                name="support"
                value={option}
                checked={form.additional_support_needed === option}
                onChange={(e) => setForm({ ...form, additional_support_needed: e.target.value })}
                className="rounded-full border-stone-300"
              />
              <span className="text-sm text-stone-600">{option}</span>
            </label>
          ))}
        </div>
      </div>
      {participantGoals.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Linked Plan Goal</label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, plan_goal_id: "" })}
              className={`text-left px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                !form.plan_goal_id
                  ? "bg-amber-700 text-white border-amber-700"
                  : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"
              }`}
            >
              None
            </button>
            {participantGoals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setForm({ ...form, plan_goal_id: g.id })}
                className={`text-left px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  form.plan_goal_id === g.id
                    ? "bg-amber-700 text-white border-amber-700"
                    : "border-stone-200 text-stone-600 hover:border-amber-300 bg-white"
                }`}
              >
                {g.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
        />
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-0 md:p-4 bg-black/30 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", paddingTop: "max(env(safe-area-inset-top), 8px)", touchAction: "pan-y" }}
      >
        <div
            className="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-full md:max-w-lg shadow-xl md:my-auto max-h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden min-w-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
          >
          <div className="flex items-center justify-between p-5 border-b border-stone-100">
            <h2 className="font-semibold text-stone-800">Capture Carer Capacity</h2>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-stone-400" />
            </button>
          </div>
          {formContent}
          <div className="flex gap-3 p-5 border-t border-stone-100">
            <button onClick={onClose} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Capacity Update"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Inline version for non-modal use
  return (
    <div className="bg-white rounded-2xl border border-stone-200">
      <div className="flex items-center justify-between p-5 border-b border-stone-100">
        <h2 className="font-semibold text-stone-800">Capture Carer Capacity</h2>
        {onClose && (
          <button onClick={onClose}>
            <X className="w-5 h-5 text-stone-400" />
          </button>
        )}
      </div>
      {formContent}
      <div className="flex gap-3 p-5 border-t border-stone-100">
        {onClose && (
          <button onClick={onClose} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm hover:bg-rose-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Capacity Update"}
        </button>
      </div>
    </div>
  );
}

function ScaleField({ label, value, onChange, color }) {
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
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
              Number(value) === n
                ? colors[n]
                : "border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-xs text-stone-400 mt-1">1 = minimal · 5 = severe</p>
    </div>
  );
}
