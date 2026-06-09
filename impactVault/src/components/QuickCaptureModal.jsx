import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const categoryConfig = {
  behaviour: { emoji: "⚡", label: "Regulation", desc: "Capture dysregulation, overwhelm, or recovery", impactType: "Behaviour Escalation" },
  sleep: { emoji: "🌙", label: "Sleep", desc: "Track sleep, fatigue, and recovery", impactType: "Fatigue / Shutdown" },
  school: { emoji: "🏫", label: "School", desc: "Participation, attendance, or recovery", impactType: "School Attendance Impact" },
  therapy: { emoji: "💬", label: "Therapy", desc: "Therapy participation or support needs", impactType: "Therapy Disruption" },
  mood: { emoji: "❤️", label: "Emotional Impact", desc: "Capture regulation, stress, or emotional impact", impactType: "Emotional Regulation Difficulty" },
  health: { emoji: "🏥", label: "Health", desc: "Medical episodes or health-related impact", impactType: "Medical Episode" },
  other: { emoji: "➕", label: "Other", desc: "Daily functioning or support need", impactType: "Other" },
};

const TIME_OPTIONS = [
  { value: "morning", label: "Morning (6am–12pm)" },
  { value: "afternoon", label: "Afternoon (12pm–5pm)" },
  { value: "evening", label: "Evening (5pm–9pm)" },
  { value: "night", label: "Night (9pm–6am)" },
];

const SEVERITY_COLORS = {
  1: "bg-stone-100 text-stone-800 border-stone-300",
  2: "bg-blue-100 text-blue-800 border-blue-300",
  3: "bg-amber-100 text-amber-800 border-amber-300",
  4: "bg-orange-100 text-orange-800 border-orange-300",
  5: "bg-red-100 text-red-800 border-red-300",
};

export default function QuickCaptureModal({ isOpen, onClose, participants, onSuccess, initialCategory = "" }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState([]);
  const [availableGoals, setAvailableGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Seed category whenever the modal opens with a preselected card.
  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory || "");
      setStep(1);
      setSelectedPersonId("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTimeOfDay("");
      setSeverity(3);
      setDescription("");
      setGoals([]);
      setAvailableGoals([]);
    }
  }, [isOpen, initialCategory]);

  const handleOpenChange = (open) => {
    if (!open) {
      setStep(1);
      setSelectedPersonId("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setCategory("");
      setTimeOfDay("");
      setSeverity(3);
      setDescription("");
      setGoals([]);
      onClose();
    }
  };

  const loadGoals = async (personId) => {
    try {
      const allGoals = await base44.entities.PlanGoal.filter({ participant_id: personId });
      setAvailableGoals(allGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const handlePersonSelect = (personId) => {
    setSelectedPersonId(personId);
    loadGoals(personId);
    // If a card was preselected, skip the category-pick step entirely.
    setStep(category ? 3 : 2);
  };

  const handleCategorySelect = (cat) => {
    setCategory(cat);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedPersonId || !category || !timeOfDay || !description.trim()) {
      alert('Please fill in all required fields (person, category, time of day, and description)');
      return;
    }

    setIsLoading(true);
    try {
      await base44.entities.DailyImpactLog.create({
        participant_id: selectedPersonId,
        date,
        severity: Number(severity),
        environment: timeOfDay,
        impact_types: [categoryConfig[category].impactType],
        functional_impact: description.trim(),
        support_required: "no_additional",
        plan_goal_ids: goals,
      });

      onSuccess?.();
      handleOpenChange(false);
      // Take the user to the Impact Log so they can see the entry was saved.
      navigate(createPageUrl("ImpactLog"));
    } catch (error) {
      console.error('Error creating impact log entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white text-stone-800 border-stone-200">
        <DialogHeader>
          <DialogTitle>Quick Capture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 1 && (
            <>
              <label className="text-sm font-medium text-stone-700 block">Select Person Profile *</label>
              <div className="space-y-2">
                {participants.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handlePersonSelect(person.id)}
                    className="w-full text-left px-4 py-2.5 rounded-lg border border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-amber-50 transition-colors text-sm"
                  >
                    {person.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <label className="text-sm font-medium text-stone-700 block">What impacted daily life? *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleCategorySelect(key)}
                    className="p-3 rounded-lg text-center transition-colors bg-stone-100 text-stone-700 hover:bg-[#B6ADA5] hover:text-white"
                  >
                    <div className="text-2xl mb-1">{config.emoji}</div>
                    <div className="text-xs font-medium">{config.label}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="text-xs text-amber-700 hover:underline">
                ← Change profile
              </button>
            </>
          )}

          {step === 3 && (
            <>
              {category && categoryConfig[category] && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="w-11 h-11 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-2xl shrink-0">
                    {categoryConfig[category].emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900 leading-tight">
                      {categoryConfig[category].label}
                    </p>
                    <p className="text-xs text-amber-800/80 mt-0.5 leading-snug">
                      {categoryConfig[category].desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[11px] font-medium text-amber-700 hover:text-amber-900 hover:underline shrink-0 mt-0.5"
                  >
                    Change
                  </button>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">Time of Day *</label>
                <div className="space-y-2">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTimeOfDay(opt.value)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors text-sm ${
                        timeOfDay === opt.value
                          ? "bg-amber-700 text-white border-amber-700"
                          : "border-stone-200 text-stone-700 hover:border-amber-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">Severity *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSeverity(n)}
                      className={`flex-1 py-2 rounded-lg border font-medium transition-colors ${
                        severity === n
                          ? `${SEVERITY_COLORS[n]} ring-2 ring-offset-1 ring-amber-400`
                          : "border-stone-200 text-stone-700 hover:border-amber-300 bg-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-1">1 = mild · 5 = severe</p>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 mb-2 block">What happened? *</label>
                <textarea
                  placeholder="Describe what happened, the support needed, and how daily life was impacted..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-24 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                />
              </div>

              {availableGoals.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-2 block">Linked Goals & Supports</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {availableGoals.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => setGoals(goals.includes(goal.id) ? goals.filter(g => g !== goal.id) : [...goals, goal.id])}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                          goals.includes(goal.id)
                            ? "bg-amber-700 text-white border-amber-700"
                            : "border-stone-200 text-stone-700 hover:border-amber-300"
                        }`}
                      >
                        {goals.includes(goal.id) ? "✓ " : ""}{goal.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(initialCategory ? 1 : 2)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!description.trim() || isLoading}
                  className="flex-1 bg-[#B6ADA5] hover:bg-[#9A9089] disabled:opacity-50"
                >
                  {isLoading ? "Capturing..." : "Capture Impact"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}