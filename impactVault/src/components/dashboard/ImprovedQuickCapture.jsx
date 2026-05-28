const categories = [
  { key: 'behaviour', label: 'Regulation', icon: '⚡', desc: 'Capture dysregulation, overwhelm, or recovery' },
  { key: 'sleep', label: 'Sleep', icon: '🌙', desc: 'Track sleep, fatigue, and recovery' },
  { key: 'school', label: 'School', icon: '🏫', desc: 'Participation, attendance, or recovery' },
  { key: 'therapy', label: 'Therapy', icon: '💬', desc: 'Therapy participation or support needs' },
  { key: 'mood', label: 'Emotional Impact', icon: '❤️', desc: 'Capture regulation, stress, or emotional impact' },
  { key: 'other', label: 'Other', icon: '➕', desc: 'Daily functioning or support need' },
];

export default function ImprovedQuickCapture({ onCardClick }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-700 mb-5">Quick Capture</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onCardClick?.(cat.key)}
            className="flex flex-col items-start gap-2 p-4 bg-[#FAF8F6] rounded-xl border border-stone-200 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer group text-left w-full"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{cat.icon}</span>
            <div>
              <p className="text-sm font-semibold text-stone-700">{cat.label}</p>
              <p className="text-xs text-stone-500 mt-1">{cat.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}