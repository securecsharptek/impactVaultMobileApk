import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { X, ArrowRight, CheckCircle2, MapPin } from "lucide-react";

const STEPS = [
  {
    emoji: "👤",
    title: "Create a Person Profile",
    description: "Set up a profile for the person you're supporting — name, date of birth, diagnoses, and NDIS plan dates.",
    hint: "Click 'Add Profile', fill in the details, then hit Save.",
    targetPage: "Participants",
    ctaLabel: "Go to Person Profile",
  },
  {
    emoji: "🎯",
    title: "Add Goals & Supports",
    description: "Add the goals you're working towards. You can use goals from your current support plan or create your own.",
    hint: "Click 'Add Goal' to get started.",
    targetPage: "PlanGoals",
    ctaLabel: "Go to Goals & Supports",
  },
  {
    emoji: "📓",
    title: "Start your Daily Impact Log",
    description: "Record daily events, track severity, note support required, and build evidence for plan reviews and reports.",
    hint: "Try adding your first log entry to see how it works.",
    targetPage: "ImpactLog",
    ctaLabel: "Go to Daily Impact Log",
  },
  {
    emoji: "✨",
    title: "Discover Insights",
    description: "After 10 entries you'll unlock a free preview of Insights — showing behaviour patterns, triggers, and trends. Want to see it sooner? You can upgrade to full Insights at any time.",
    hint: "Your free Insights preview unlocks automatically at 10 entries. Tap 'Upgrade to Insights' to unlock everything now.",
    targetPage: "Insights",
    ctaLabel: "Go to Insights",
    isLast: true,
  },
];

export default function OnboardingTour({ currentPageName }) {
  const [stepIndex, setStepIndex] = useState(() => {
    const saved = localStorage.getItem("iv_onboarding_step");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;

  const step = STEPS[stepIndex];
  const isOnTargetPage = currentPageName === step.targetPage;

  const advance = async () => {
    if (step.isLast) {
      finish();
    } else {
      const next = stepIndex + 1;
      setStepIndex(next);
      localStorage.setItem("iv_onboarding_step", next.toString());
      navigate(createPageUrl(STEPS[next].targetPage));
    }
  };

  const handleCta = () => {
    if (isOnTargetPage) {
      advance();
    } else {
      navigate(createPageUrl(step.targetPage));
    }
  };

  const finish = () => {
    setDismissed(true);
    localStorage.setItem("iv_onboarding_done", "true");
    base44.auth.updateMe({ onboarding_complete: true });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Progress bar */}
      <div className="h-1 bg-stone-100">
        <div
          className="h-1 bg-[#B6ADA5] transition-all duration-500"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{step.emoji}</span>
            <span className="text-xs font-medium text-stone-400">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={finish}
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600"
            title="Skip tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <h3 className="font-semibold text-stone-800 text-sm mb-1">{step.title}</h3>
        <p className="text-xs text-stone-500 mb-3 leading-relaxed">{step.description}</p>

        {isOnTargetPage && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{step.hint}</p>
          </div>
        )}

        <button
          onClick={handleCta}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#B6ADA5] hover:bg-[#9A9089] text-white text-xs font-semibold rounded-xl transition-colors"
        >
          {isOnTargetPage ? (
            step.isLast ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Finish tour</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Done — next step</>
            )
          ) : (
            <>{step.ctaLabel} <ArrowRight className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>
    </div>
  );
}