export default function SeverityProfile({ impacts, avgSeverity }) {
  const today = new Date().toISOString().split('T')[0];
  const todayImpacts = impacts.filter(i => i.date === today);

  if (todayImpacts.length === 0 || !avgSeverity) return null;

  // Count severity distribution
  const severityCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  todayImpacts.forEach(i => {
    severityCount[i.severity] = (severityCount[i.severity] || 0) + 1;
  });

  const severityColors = {
    1: 'bg-green-500',
    2: 'bg-green-400',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-500',
  };

  const maxCount = Math.max(...Object.values(severityCount));

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-700 mb-4">Today's Severity Profile</h3>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(level => (
          <div key={level} className="flex items-center gap-3">
            <span className="text-xs font-medium text-stone-500 w-4">{level}</span>
            <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
              {severityCount[level] > 0 && (
                <div
                  className={`h-full ${severityColors[level]} transition-all`}
                  style={{ width: `${(severityCount[level] / maxCount) * 100}%` }}
                />
              )}
            </div>
            <span className="text-xs font-medium text-stone-600 w-6 text-right">{severityCount[level]}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-stone-200 text-center">
        <p className="text-sm text-stone-600">
          <span className="font-semibold text-stone-700">Avg Severity: {avgSeverity}</span>
        </p>
      </div>
    </div>
  );
}