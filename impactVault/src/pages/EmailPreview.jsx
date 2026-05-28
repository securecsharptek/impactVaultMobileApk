export default function EmailPreview() {
  const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "long" });

  const mockData = {
    name: "Sarah",
    pName: "Liam",
    totalThis: 8,
    totalPrev: 5,
    avgSev: "3.2",
    avgSevPrev: "2.8",
    highSev: 2,
    topTypes: [["Meltdown", 4], ["Sleep disruption", 2], ["Refusal", 2]],
    topTod: ["afternoon", 5],
    recentLogs: [
      { date: "2026-04-10", severity: 4, functional_impact: "Full meltdown at school pick-up, lasted 45 mins" },
      { date: "2026-04-09", severity: 3, functional_impact: "Refused to leave the house, morning routine disrupted" },
      { date: "2026-04-08", severity: 2, functional_impact: "Sleep disruption, woke 3 times overnight" },
      { date: "2026-04-07", severity: 4, functional_impact: "Physical aggression during transition at therapy" },
      { date: "2026-04-06", severity: 2, functional_impact: "Mood low, withdrew from social interaction at school" },
    ],
    linkedGoals: [
      { title: "Improve transition management", progress_notes: "Support strategies in place — gradual improvement noted", supports_strategies: "Visual schedule, 5-minute warnings before transitions", entries: 4 },
      { title: "Increase sleep duration", progress_notes: "Working with OT on bedtime routine", supports_strategies: "Sensory wind-down routine 30 mins before bed", entries: 2 },
    ],
  };

  const SEVERITY_COLOR = (s) => s >= 4 ? "#ef4444" : s >= 3 ? "#d97706" : "#10b981";
  const TIME_BLOCKS = {
    morning: "Morning (6am–12pm)",
    afternoon: "Afternoon (12pm–5pm)",
    evening: "Evening (5pm–9pm)",
    night: "Night (9pm–6am)",
  };

  const trendDiff = (parseFloat(mockData.avgSev) - parseFloat(mockData.avgSevPrev)).toFixed(1);
  const trendText = trendDiff > 0 ? `↑ ${Math.abs(trendDiff)} vs last week` : trendDiff < 0 ? `↓ ${Math.abs(trendDiff)} vs last week` : "→ Same as last week";
  const trendColor = trendDiff > 0 ? "#ef4444" : "#10b981";

  return (
    <div className="min-h-screen bg-[#F4F2F0] py-8 px-4">
      <div className="max-w-xl mx-auto">

        {/* App preview label */}
        <div className="text-center mb-4">
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full border border-amber-300">📧 Weekly Insights Email Preview</span>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-lg">

          {/* Header */}
          <div className="px-8 py-7 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/a6b63ebfa_Impactvault-whitebackground.jpg"
                alt="Impact Vault"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <p className="font-bold text-stone-800">Impact Vault</p>
                <p className="text-xs text-stone-400">Weekly Insights Report</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">✦ Insights</span>
          </div>

          {/* Greeting */}
          <div className="px-8 pt-7 pb-5">
            <p className="text-xl font-bold text-stone-800">Your weekly snapshot</p>
            <p className="text-sm text-stone-400 mt-1">{weekStart} – {today} · {mockData.pName}</p>
            <p className="text-sm text-stone-600 mt-3">Hi {mockData.name}, here's what Impact Vault detected this week based on your logged entries.</p>
          </div>

          {/* Stats Row */}
          <div className="px-8 pb-6 grid grid-cols-3 gap-3">
            <div className="bg-stone-100 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold text-stone-800">{mockData.totalThis}</p>
              <p className="text-xs text-stone-500 font-semibold uppercase mt-1">Entries logged</p>
              <p className="text-xs text-stone-400 mt-1">↑ 3 vs last week</p>
            </div>
            <div className="bg-stone-100 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold" style={{ color: SEVERITY_COLOR(parseFloat(mockData.avgSev)) }}>{mockData.avgSev}</p>
              <p className="text-xs text-stone-500 font-semibold uppercase mt-1">Avg severity</p>
              <p className="text-xs mt-1" style={{ color: trendColor }}>{trendText}</p>
            </div>
            <div className="bg-stone-100 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold text-red-500">{mockData.highSev}</p>
              <p className="text-xs text-stone-500 font-semibold uppercase mt-1">High severity</p>
              <p className="text-xs text-red-400 mt-1">Needs attention</p>
            </div>
          </div>

          {/* Top Impact Types */}
          <div className="px-8 pb-6">
            <p className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">Most common this week</p>
            <div className="flex flex-wrap gap-2">
              {mockData.topTypes.map(([name, count]) => (
                <span key={name} className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold px-3 py-1 rounded-full">{name} ({count})</span>
              ))}
            </div>
          </div>

          {/* Peak Time */}
          <div className="px-8 pb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-bold text-blue-800">📍 Peak time detected</p>
              <p className="text-base font-bold text-blue-700 mt-1">{TIME_BLOCKS[mockData.topTod[0]]}</p>
              <p className="text-sm text-blue-600 mt-1">{mockData.topTod[1]} of {mockData.totalThis} entries occurred during this time. Consider what supports could help during this period.</p>
            </div>
          </div>

          {/* Therapy Goal Trends */}
          <div className="px-8 pb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-bold text-green-800">🎯 Therapy Goal Trends This Week</p>
              <p className="text-xs text-green-700 mt-1 mb-3">These goals had the most activity this week — share this summary with your therapist or support coordinator to guide your next session.</p>
              {mockData.linkedGoals.map((g, i) => (
                <div key={i} className="bg-white border border-green-100 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-stone-800">{g.title}</p>
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{g.entries} entries</span>
                  </div>
                  <p className="text-xs text-stone-500">{g.progress_notes}</p>
                  {g.supports_strategies && <p className="text-xs text-stone-400 mt-1"><strong>Strategy:</strong> {g.supports_strategies}</p>}
                </div>
              ))}
              <p className="text-xs text-green-700 mt-2">💡 Tip: Print or screenshot this email to bring to your next therapy appointment as a conversation starter.</p>
            </div>
          </div>

          {/* Recent Entries */}
          <div className="px-8 pb-6">
            <p className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">Recent entries</p>
            {mockData.recentLogs.map((imp, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0 text-sm">
                <span className="text-stone-400 w-20 shrink-0">{imp.date}</span>
                <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLOR(imp.severity) }}>S{imp.severity}</span>
                <span className="text-stone-600 flex-1 text-xs">{imp.functional_impact}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-8 pb-8">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl p-5 text-center">
              <p className="font-bold text-amber-900">Ready to generate a full report?</p>
              <p className="text-sm text-amber-800 mt-1 mb-4">Your Insights dashboard has full pattern analysis, trigger detection, and trend charts.</p>
              <span className="inline-block bg-amber-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">View Full Report →</span>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-stone-50 px-8 py-5 text-center">
            <p className="text-xs text-stone-400">You're receiving this because you have an active Insights plan.</p>
            <p className="text-xs text-stone-400 mt-1">Impact Vault · Confidential · Manage account</p>
          </div>

        </div>
      </div>
    </div>
  );
}