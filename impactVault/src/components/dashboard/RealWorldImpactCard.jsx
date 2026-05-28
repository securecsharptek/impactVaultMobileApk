export default function RealWorldImpactCard({ impacts }) {
  const last30Days = (() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return impacts.filter(i => new Date(i.date) >= thirtyDaysAgo);
  })();

  // Count impact types
  const impactTypeCounts = {};
  last30Days.forEach(i => {
    if (i.impact_types && Array.isArray(i.impact_types)) {
      i.impact_types.forEach(type => {
        impactTypeCounts[type] = (impactTypeCounts[type] || 0) + 1;
      });
    }
  });

  const iconMap = {
    'school': '🏫',
    'therapy': '💬',
    'community': '🌍',
    'fatigue': '😴',
    'social': '👥',
    'medical': '⚕️',
    'emotional': '💭',
    'physical': '💪',
    'behaviour': '⚡',
    'sleep': '🌙',
  };

  const sorted = Object.entries(impactTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="text-sm font-semibold text-stone-700">Real-World Impact (Last 30 Days)</h3>
      </div>
      <div className="space-y-3">
        {sorted.map(([type, count]) => (
          <div key={type} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{iconMap[type.toLowerCase()] || '•'}</span>
              <span className="text-sm text-stone-700 capitalize">{type.replace(/_/g, ' ')}</span>
            </div>
            <span className="text-sm font-semibold text-[#7A726C]">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}