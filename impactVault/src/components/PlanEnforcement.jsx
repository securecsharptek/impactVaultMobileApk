import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";

export function usePlanLimit() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const user = await base44.auth.me();
        setPlan(user?.plan || null);
      } catch (error) {
        console.error('Failed to load plan:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, []);

  const getProfileLimit = () => {
    if (!plan) return null;
    if (plan.toLowerCase().includes('family')) return 3;
    if (plan.toLowerCase().includes('core')) return 1;
    return 1;
  };

  return {
    plan,
    profileLimit: getProfileLimit(),
    loading,
  };
}

export function PlanLimitWarning({ currentCount, profileLimit }) {
  if (!profileLimit || currentCount < profileLimit) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4">
      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-amber-900">Profile limit reached</p>
        <p className="text-sm text-amber-800 mt-1">
          You've reached your limit of {profileLimit} profile{profileLimit > 1 ? 's' : ''}. 
          {profileLimit === 1 ? ' Upgrade to the Family plan for up to 3 profiles.' : ''}
        </p>
        {profileLimit === 1 && (
          <a
            href={createPageUrl('Pricing')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 mt-3"
          >
            Upgrade now <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}