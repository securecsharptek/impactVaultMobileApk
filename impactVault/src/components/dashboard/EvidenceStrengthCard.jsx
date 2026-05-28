export default function EvidenceStrengthCard({ impacts, evidence }) {
  const impactCount = impacts.length;
  const evidenceCount = evidence.length;
  
  if (impactCount === 0 && evidenceCount === 0) return null;

  // Calculate tracking duration
  const sortedImpacts = [...impacts].sort((a, b) => new Date(a.date) - new Date(b.date));
  let duration = 0;
  if (sortedImpacts.length > 0) {
    const firstDate = new Date(sortedImpacts[0].date);
    const lastDate = new Date(sortedImpacts[sortedImpacts.length - 1].date);
    duration = Math.ceil((lastDate - firstDate) / (24 * 60 * 60 * 1000)) + 1;
  }

  const strengthPercent = Math.min(100, Math.round((evidenceCount / Math.max(impactCount, 1)) * 100));
  const strengthLabel = strengthPercent >= 80 ? 'Strong' : strengthPercent >= 50 ? 'Good' : strengthPercent >= 20 ? 'Building' : 'Starting';

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-700 mb-4">Evidence Strength</h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-stone-600">Impact Entries Logged</span>
            <span className="text-sm font-semibold text-stone-700">{impactCount}</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-stone-600">Evidence Files Attached</span>
            <span className="text-sm font-semibold text-stone-700">{evidenceCount}</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-stone-600">Tracking Duration</span>
            <span className="text-sm font-semibold text-stone-700">{duration} {duration === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
        <div className="pt-3 border-t border-stone-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-stone-600">Coverage</span>
            <span className="text-xs font-semibold text-[#7A726C]">{strengthPercent}%</span>
          </div>
          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#B6ADA5] transition-all"
              style={{ width: `${strengthPercent}%` }}
            />
          </div>
          <p className="text-xs text-stone-500 mt-2">Status: <span className="font-medium text-stone-700">{strengthLabel}</span></p>
        </div>
      </div>
    </div>
  );
}