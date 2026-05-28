import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Upload, Zap } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = [
  { key: "behaviour", label: "Behaviour", emoji: "⚡" },
  { key: "sleep", label: "Sleep", emoji: "🌙" },
  { key: "school", label: "School", emoji: "📚" },
  { key: "therapy", label: "Therapy", emoji: "💬" },
  { key: "mood", label: "Mood", emoji: "💛" },
  { key: "other", label: "Other", emoji: "📝" },
];

const TRIGGERS = [
  { value: "transition", label: "Transition" },
  { value: "fatigue", label: "Fatigue" },
  { value: "noise", label: "Noise" },
  { value: "hunger", label: "Hunger" },
  { value: "change_of_routine", label: "Routine change" },
  { value: "social_interaction", label: "Social interaction" },
];

export default function QuickCapture({ participants, onSaved }) {
  const [modal, setModal] = useState(null); // { category }
  const [note, setNote] = useState("");
  const [trigger, setTrigger] = useState("");
  const [participantId, setParticipantId] = useState(participants[0]?.id || "");
  const [uploading, setUploading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [saving, setSaving] = useState(false);

  const open = (category) => {
    setModal({ category });
    setNote("");
    setTrigger("");
    setEvidenceUrl("");
    setEvidenceName("");
    // Always reset to first participant on open (handles late-loading participants)
    setParticipantId(participants[0]?.id || "");
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEvidenceUrl(file_url);
    setEvidenceName(file.name);
    setUploading(false);
  };

  const save = async () => {
    const pid = participantId || participants[0]?.id;
    if (!pid) {
      alert('Please select a participant');
      return;
    }
    if (!note.trim()) {
      alert('Please add a note describing what happened');
      return;
    }
    setSaving(true);
    try {
      const now = new Date();
      await base44.entities.QuickEntry.create({
        participant_id: pid,
        date: format(now, "yyyy-MM-dd"),
        time: format(now, "HH:mm"),
        category: modal.category,
        note: note.trim(),
        trigger: trigger || "",
        evidence_url: evidenceUrl || undefined,
        evidence_name: evidenceName || undefined,
      });
      setModal(null);
      onSaved?.();
    } catch (error) {
      console.error('Error saving quick entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-stone-700">Quick Capture</h2>
          <span className="text-xs text-stone-400 ml-auto">Tap to log in seconds</span>
        </div>
        {participants.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-sm text-stone-400">Add a person profile first to use Quick Capture.</p>
            <a href="/Participants" className="text-xs text-amber-700 font-medium hover:underline mt-1 inline-block">Add a profile →</a>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => open(cat.key)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-amber-300 hover:bg-amber-50 transition-colors active:scale-95"
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-xs font-medium text-stone-700">{cat.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">{CATEGORIES.find(c => c.key === modal.category)?.emoji}</span>
                <h3 className="font-semibold text-stone-800 capitalize">{modal.category}</h3>
              </div>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              {participants.length > 1 && (
                <select
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <textarea
                rows={3}
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened? (speak or type…)"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              />
              <div>
                <p className="text-xs font-medium text-stone-600 mb-2">Trigger (optional)</p>
                <div className="flex flex-wrap gap-1.5">
                  {TRIGGERS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTrigger(trigger === t.value ? "" : t.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        trigger === t.value
                          ? "bg-amber-700 text-white border-amber-700"
                          : "border-stone-200 text-stone-600 hover:border-amber-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-500 cursor-pointer hover:border-amber-300 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-xs truncate flex-1">
                  {uploading ? "Uploading…" : evidenceName || "Add photo, video or file (optional)"}
                </span>
                <input type="file" className="hidden" onChange={handleFile} accept="image/*,video/*,.pdf" />
              </label>
            </div>
            <div className="flex gap-3 p-4 border-t border-stone-100">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !participantId}
                className="flex-1 py-2.5 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}