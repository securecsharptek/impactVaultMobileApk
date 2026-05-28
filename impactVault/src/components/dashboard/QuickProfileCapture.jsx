import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, X } from "lucide-react";
import { format } from "date-fns";

export default function QuickProfileCapture({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [diagnoses, setDiagnoses] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(""); setDob(""); setDiagnoses(""); };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await base44.entities.ParticipantProfile.create({
      name: name.trim(),
      dob: dob || undefined,
      diagnoses: diagnoses.trim() || undefined,
    });
    setSaving(false);
    setOpen(false);
    reset();
    onSaved?.();
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-[#B6ADA5]" />
          <h2 className="text-sm font-semibold text-stone-700">Quick Person Profile Capture</h2>
          <span className="text-xs text-stone-400 ml-auto">Add a profile in seconds</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-[#B6ADA5] hover:bg-[#F7F5F3] transition-colors text-sm text-stone-500 text-left"
        >
          <UserPlus className="w-4 h-4 text-stone-400" />
          + New person profile…
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#B6ADA5]" />
                <h3 className="font-semibold text-stone-800">New Person Profile</h3>
              </div>
              <button onClick={() => { setOpen(false); reset(); }}>
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Full Name *</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Smith"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#B6ADA5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Date of Birth (optional)</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#B6ADA5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Diagnoses / Conditions (optional)</label>
                <input
                  value={diagnoses}
                  onChange={(e) => setDiagnoses(e.target.value)}
                  placeholder="e.g. ADHD, Autism Spectrum"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#B6ADA5]"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-stone-100">
              <button onClick={() => { setOpen(false); reset(); }} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !name.trim()}
                className="flex-1 py-2.5 bg-[#B6ADA5] text-white rounded-xl text-sm font-medium hover:bg-[#9A9089] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Create Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}