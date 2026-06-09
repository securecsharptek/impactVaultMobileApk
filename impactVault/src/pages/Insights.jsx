import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Lock, TrendingUp, TrendingDown, Minus, Zap, Clock, AlertTriangle, BarChart2, Brain, Target, ChevronRight } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PageHeader from "../components/shared/PageHeader";
import { appParams } from "@/lib/app-params";

const TIME_BLOCKS = [
  { key: "morning", label: "Morning", hours: "6am–12pm" },
  { key: "afternoon", label: "Afternoon", hours: "12pm–5pm" },
  { key: "evening", label: "Evening", hours: "5pm–9pm" },
  { key: "night", label: "Night", hours: "9pm–6am" },
];

const CATEGORY_LABELS = {
  behaviour: "Behaviour", sleep: "Sleep", school: "School",
  therapy: "Therapy", mood: "Mood", health: "Health", other: "Other",
};

// Map for display labels (including Fatigue / Recovery)
const DISPLAY_LABELS = {
  "Fatigue / Shutdown": "Fatigue / Recovery",
};

const TRIGGER_LABELS = {
  transition: "Transitions", fatigue: "Fatigue", noise: "Noise",
  hunger: "Hunger", change_of_routine: "Routine changes", social_interaction: "Social interaction",
};

function InsightCard({ icon: IconComp, title, value, sub, color = "amber" }) {
  const Icon = IconComp;
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    red: "bg-red-50 border-red-200 text-red-800",
    stone: "bg-stone-50 border-stone-200 text-stone-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs font-medium opacity-80">{title}</span>
      </div>
      <p className="text-lg font-bold leading-snug">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

function UpgradeTeaser() {
  const features = [
    { icon: BarChart2, label: "Category breakdown", desc: "See which areas generate the most incidents" },
    { icon: Clock, label: "Time-of-day patterns", desc: "Discover when support needs are highest" },
    { icon: AlertTriangle, label: "Trigger analysis", desc: "Identify recurring triggers behind incidents" },
    { icon: Brain, label: "Behaviour trends", desc: "Track improvements or escalations over time" },
    { icon: Target, label: "Advanced report summaries", desc: "AI-written summaries for NDIS reviews" },
  ];
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
      {/* Blurred chart preview */}
      <div className="relative p-4 border-b border-amber-200">
        <div className="blur-sm pointer-events-none select-none opacity-60 space-y-2">
          <div className="flex items-end gap-1 h-20">
            {[40, 65, 30, 85, 50, 90, 45, 70].map((h, i) => (
              <div key={i} className="flex-1 bg-amber-400 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="space-y-1.5">
            {["Behaviour", "Sleep", "School"].map((l, i) => (
              <div key={l} className="flex items-center gap-2">
                <span className="text-xs text-stone-500 w-16">{l}</span>
                <div className="flex-1 bg-amber-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${80 - i * 20}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white/90 border border-amber-300 rounded-xl px-4 py-2 shadow-sm">
            <Lock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Your patterns are waiting</span>
          </div>
        </div>
      </div>
      {/* Feature list */}
      <div className="p-5">
        <p className="text-sm font-semibold text-amber-900 mb-1">What you'll unlock with Insights</p>
        <p className="text-xs text-amber-700 mb-4">Your data is already being tracked — upgrade to see what it's telling you.</p>
        <div className="space-y-3 mb-5">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-800">{label}</p>
                <p className="text-xs text-stone-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          to={createPageUrl("Pricing") + "?section=insights"}
          className="flex items-center justify-center gap-2 w-full py-3 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" /> Unlock Insights — from $9/month
          <ChevronRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-center text-amber-700 mt-2">Cancel anytime · Add to any Core plan</p>
      </div>
    </div>
  );
}

function LockedOverlay() {
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="blur-sm pointer-events-none select-none opacity-40 space-y-3">
        <div className="h-32 bg-amber-100 rounded-xl" />
        <div className="h-24 bg-stone-100 rounded-xl" />
        <div className="h-20 bg-blue-100 rounded-xl" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center">
        <Lock className="w-8 h-8 text-amber-500 mb-3" />
        <h3 className="text-base font-semibold text-stone-800 mb-2">Your data is ready to reveal patterns.</h3>
        <p className="text-sm text-stone-500 mb-4 max-w-xs">Unlock Insights to see behaviour trends, triggers, and progress over time.</p>
        <Link
          to={createPageUrl("Pricing")}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" /> Unlock Full Insights
        </Link>
      </div>
    </div>
  );
}

export default function Insights() {
  const [entries, setEntries] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterPid, setFilterPid] = useState("");

  const hasInsights = appParams.bypassPaywall || user?.insights_plan === true;

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      if (!u) return;
      Promise.all([
        base44.entities.QuickEntry.filter({ created_by: u.email }, "-date"),
        base44.entities.DailyImpactLog.filter({ created_by: u.email }, "-date"),
        base44.entities.ParticipantProfile.filter({ created_by: u.email }),
      ]).then(([q, d, p]) => {
        // Merge quick entries + impact logs into a unified entries array
        const combined = [
          ...q.map((e) => ({ ...e, _source: "quick" })),
          ...d.filter((e) => !e.archived).map((e) => ({ ...e, _source: "impact" })),
        ];
        setEntries(combined);
        setParticipants(p);
        setLoading(false);
      });
    });
  }, []);

  const filtered = filterPid ? entries.filter((e) => e.participant_id === filterPid) : entries;

  // --- Analytics ---
  const now = new Date();
  const last30 = filtered.filter((e) => e.date >= format(subDays(now, 30), "yyyy-MM-dd"));
  const prev30 = filtered.filter((e) => {
    return e.date >= format(subDays(now, 60), "yyyy-MM-dd") && e.date < format(subDays(now, 30), "yyyy-MM-dd");
  });

  const trendPct = prev30.length > 0
    ? Math.round(((last30.length - prev30.length) / prev30.length) * 100)
    : null;

  // Most common category — only QuickEntry records have a category field
  const catCounts = {};
  last30.forEach((e) => {
    if (e._source === "quick" && e.category) {
      catCounts[e.category] = (catCounts[e.category] || 0) + 1;
    } else if (e._source === "impact" && e.impact_types?.length) {
      e.impact_types.forEach((t) => {
        catCounts[t] = (catCounts[t] || 0) + 1;
      });
    }
  });
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

  // Most common trigger
  const trigCounts = {};
  last30.forEach((e) => {
    if (e.trigger) trigCounts[e.trigger] = (trigCounts[e.trigger] || 0) + 1;
  });
  const topTrigger = Object.entries(trigCounts).sort((a, b) => b[1] - a[1])[0];

  // Time of day
  const todCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  last30.forEach((e) => {
    const tod = e.environment || e.time_of_day;
    if (tod && todCounts[tod] !== undefined) todCounts[tod]++;
  });
  const topTod = Object.entries(todCounts).sort((a, b) => b[1] - a[1])[0];

  // Weekly chart data (last 8 weeks)
  const weeklyData = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = format(subDays(now, i * 7), "yyyy-MM-dd");
    const weekEnd = format(subDays(now, i * 7 - 6), "yyyy-MM-dd");
    const count = filtered.filter((e) => e.date >= weekStart && e.date <= weekEnd).length;
    weeklyData.push({ week: format(subDays(now, i * 7), "MMM d"), entries: count });
  }

  // Category breakdown chart
  const catChartData = Object.entries(catCounts).map(([cat, count]) => {
    let label = CATEGORY_LABELS[cat] || cat;
    label = DISPLAY_LABELS[label] || label;
    return { name: label, count };
  }).sort((a, b) => b.count - a.count);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
         title="Insights"
         subtitle={hasInsights ? "Functional impact patterns, support needs & trends over time" : "Understand functional impact patterns over time"}
        action={
          participants.length > 1 && hasInsights ? (
            <select
              value={filterPid}
              onChange={(e) => setFilterPid(e.target.value)}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <option value="">All profiles</option>
              {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : null
        }
      />

      {/* Preview always visible */}
      {filtered.length >= 10 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Insights Preview</span>
          </div>
          {topCat && (
            <p className="text-sm text-amber-900">
              "Patterns linked to {CATEGORY_LABELS[topCat[0]] || topCat[0]} were captured over the last 30 days."
            </p>
          )}
          {!hasInsights && (
            <Link
              to={createPageUrl("Pricing")}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Unlock Full Insights
            </Link>
          )}
        </div>
      )}

      {filtered.length < 10 && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
          <div className="text-center mb-4">
            <p className="text-sm text-stone-600 mb-1">
              Capture 10 functional impacts to unlock your free Insights preview.
            </p>
            <div className="w-full bg-stone-200 rounded-full h-2 mt-3 max-w-xs mx-auto">
              <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${Math.min((filtered.length / 10) * 100, 100)}%` }} />
            </div>
          </div>
          {!hasInsights && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Don't want to wait?</p>
                <p className="text-xs text-amber-700 mt-0.5">Upgrade to Insights now and instantly uncover support patterns, emotional regulation trends, recovery insights, and changes over time.</p>
              </div>
              <Link
                to={createPageUrl("Pricing") + "?section=insights"}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Upgrade to Insights
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Full Insights — free for first 10, locked beyond that without upgrade */}
      {filtered.length >= 10 && (
        <div className="space-y-6">
          {/* Key insights grid — always shown at 10 entries */}
          <div className="grid grid-cols-2 gap-3">
            {topCat && (
              <InsightCard
                icon={Zap}
                title="Most common functional impact"
                value={`${CATEGORY_LABELS[topCat[0]] || topCat[0]}`}
                sub={`${topCat[1]} times this month`}
                color="amber"
              />
            )}
            {topTrigger && (
              <InsightCard
                icon={AlertTriangle}
                title="Most common trigger"
                value={TRIGGER_LABELS[topTrigger[0]] || topTrigger[0]}
                sub={`${topTrigger[1]} occurrences`}
                color="red"
              />
            )}
            {topTod && topTod[1] > 0 && (
              <InsightCard
                icon={Clock}
                title="Peak time of day"
                value={topTod[0].charAt(0).toUpperCase() + topTod[0].slice(1)}
                sub={TIME_BLOCKS.find(t => t.key === topTod[0])?.hours}
                color="blue"
              />
            )}
            {trendPct !== null && (
              <InsightCard
                icon={trendPct < 0 ? TrendingDown : trendPct > 0 ? TrendingUp : Minus}
                title="Monthly trend"
                value={trendPct === 0 ? "No change" : `${Math.abs(trendPct)}% ${trendPct < 0 ? "decrease" : "increase"}`}
                sub="vs. previous 30 days"
                color={trendPct < 0 ? "green" : trendPct > 0 ? "red" : "stone"}
              />
            )}
          </div>

          {/* Weekly volume chart — always shown */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-700 mb-4">Weekly Functional Impact Activity</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData} barSize={20}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12 }} />
                <Bar dataKey="entries" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Deeper insights — locked unless upgraded, shown as teaser if not */}
          {hasInsights ? (
            <>
              {catChartData.length > 0 && (
                <div className="bg-white rounded-2xl border border-stone-200 p-4">
                  <p className="text-sm font-semibold text-stone-700 mb-4">Functional Impact Breakdown (last 30 days)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={catChartData} layout="vertical" barSize={14}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12 }} />
                      <Bar dataKey="count" fill="#B6ADA5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <p className="text-sm font-semibold text-stone-700 mb-3">Time of Day Distribution</p>
                <div className="space-y-2">
                  {TIME_BLOCKS.map((block) => {
                    const count = todCounts[block.key] || 0;
                    const max = Math.max(...Object.values(todCounts), 1);
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={block.key} className="flex items-center gap-3">
                        <div className="w-24 shrink-0">
                          <p className="text-xs font-medium text-stone-700">{block.label}</p>
                          <p className="text-xs text-stone-400">{block.hours}</p>
                        </div>
                        <div className="flex-1 bg-stone-100 rounded-full h-2">
                          <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-stone-600 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <UpgradeTeaser />
          )}
        </div>
      )}
    </div>
  );
}