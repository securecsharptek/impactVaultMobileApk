export default function DailyInsightCard({ impacts, quickEntries }) {
  const allEntries = [
    ...impacts.map(e => ({ ...e, time: null, _source: 'impact' })),
    ...quickEntries.map(e => ({ ...e, _source: 'quick' })),
  ];

  if (allEntries.length < 3) return null;

  // Detect time-of-day patterns
  const timePatterns = {};
  quickEntries.forEach(e => {
    if (e.time) {
      const hour = parseInt(e.time.split(':')[0]);
      const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      timePatterns[period] = (timePatterns[period] || 0) + 1;
    }
  });

  // Detect category patterns
  const categoryPatterns = {};
  allEntries.forEach(e => {
    if (e.category) {
      categoryPatterns[e.category] = (categoryPatterns[e.category] || 0) + 1;
    }
  });

  // Build insight message
  let insight = null;
  const timeSorted = Object.entries(timePatterns).sort((a, b) => b[1] - a[1]);
  const categorySorted = Object.entries(categoryPatterns).sort((a, b) => b[1] - a[1]);

  if (timeSorted.length > 0) {
    const [period, count] = timeSorted[0];
    const periodLabel = period === 'morning' ? '6am–12pm' : period === 'afternoon' ? '12pm–5pm' : '5pm–11pm';
    insight = {
      text: `Most events occur in the ${period}.`,
      detail: `${count} entries recorded during this period.`,
      suggestion: 'Consider additional support during this period.'
    };
  } else if (categorySorted.length > 0) {
    const [category, count] = categorySorted[0];
    insight = {
      text: `Most events are related to ${category}.`,
      detail: `${count} entries recorded.`,
      suggestion: 'Focus support strategies on this area.'
    };
  }

  if (!insight) return null;

  return (
    <div className="bg-[#FFFBEB] rounded-2xl border border-[#FCD34D] p-5 shadow-sm">
      <div className="flex gap-3">
        <span className="text-xl shrink-0">✨</span>
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Daily Insight</h3>
          <p className="text-sm text-stone-700 mt-2">{insight.text}</p>
          <p className="text-xs text-stone-600 mt-1">{insight.detail}</p>
          <p className="text-xs text-[#B45309] font-medium mt-2">💡 {insight.suggestion}</p>
        </div>
      </div>
    </div>
  );
}