import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Lock } from "lucide-react";
import { format, subDays } from "date-fns";

function generateInsight(entries) {
  if (!entries || entries.length === 0) return null;

  // Most common category
  const categoryCounts = {};
  entries.forEach((e) => {
    const cat = e.category || (e.impact_types?.[0]) || "other";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  // Time of day pattern
  const timeBlocks = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  entries.forEach((e) => {
    const tod = e.environment || e.time_of_day;
    if (tod && timeBlocks[tod] !== undefined) timeBlocks[tod]++;
  });
  const topTime = Object.entries(timeBlocks).sort((a, b) => b[1] - a[1])[0];

  // After-school pattern for behaviour
  const behaviourEntries = entries.filter((e) => e.category === "behaviour" || (e.impact_types || []).includes("Behaviour Escalation"));
  const afternoonBehaviour = behaviourEntries.filter((e) => e.environment === "afternoon" || e.time_of_day === "afternoon").length;

  if (behaviourEntries.length >= 4 && afternoonBehaviour >= 2) {
    return `${afternoonBehaviour} of the last ${behaviourEntries.length} behaviour events occurred in the afternoon.`;
  }

  if (topTime && topTime[1] > 0) {
    return `Most events occur in the ${topTime[0]} — ${topTime[1]} entries recorded during this time.`;
  }

  if (topCategory) {
    const label = topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1);
    return `${label} events recorded ${topCategory[1]} time${topCategory[1] > 1 ? "s" : ""} recently — a pattern may be forming.`;
  }

  return null;
}

export default function InsightsPreviewCard({ entries, hasInsights }) {
  const totalEntries = entries?.length || 0;
  if (totalEntries < 10) return null;

  const insight = generateInsight(entries);
  if (!insight) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-amber-800">Pattern Detected</h2>
        <span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Insights Preview</span>
      </div>
      <p className="text-sm text-amber-900 leading-relaxed mb-4">"{insight}"</p>
      {!hasInsights && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-amber-700">
            <Lock className="w-3.5 h-3.5" />
            <span>Full patterns, triggers & trends locked</span>
          </div>
          <Link
            to={createPageUrl("Insights")}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 transition-colors"
          >
            <Sparkles className="w-3 h-3" /> Unlock Insights
          </Link>
        </div>
      )}
      {hasInsights && (
        <Link
          to={createPageUrl("Insights")}
          className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium hover:underline"
        >
          View full Insights dashboard →
        </Link>
      )}
    </div>
  );
}