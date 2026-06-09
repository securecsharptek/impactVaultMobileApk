import { Link } from "react-router-dom";
import { createPageUrl, todayLocal } from "@/utils";

export default function TodayTimeline({ impacts }) {
  const today = todayLocal();
  const todayImpacts = impacts.filter(i => i.date === today);

  if (todayImpacts.length === 0) return null;

  // Sort by creation date, newest first, and limit to 2
  const sorted = [...todayImpacts].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const displayed = sorted.slice(0, 2);
  const hasMore = sorted.length > 2;

  const severityColors = {
    1: { dot: 'bg-green-500' },
    2: { dot: 'bg-green-400' },
    3: { dot: 'bg-yellow-500' },
    4: { dot: 'bg-orange-500' },
    5: { dot: 'bg-red-500' },
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-700 mb-4">Today's Activity</h3>
      <div className="space-y-3">
        {displayed.map((imp, idx) => (
          <div key={imp.id} className="flex items-start gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${severityColors[imp.severity]?.dot || 'bg-stone-300'} border-2 border-white shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-700">
                {imp.functional_impact || imp.description || imp.impact_types?.[0] || 'Impact logged'}
              </p>
              <span className="text-xs text-stone-400 mt-1 inline-block">Severity {imp.severity}/5</span>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <Link
          to={createPageUrl("ImpactLog")}
          className="text-xs text-[#B6ADA5] hover:text-[#9A9089] font-medium mt-3 inline-block"
        >
          View all entries →
        </Link>
      )}
    </div>
  );
}