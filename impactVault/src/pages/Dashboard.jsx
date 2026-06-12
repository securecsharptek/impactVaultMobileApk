import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { BookOpen, Heart, FolderOpen, Sunrise, AlertCircle, RefreshCw } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import SeverityBadge from "../components/shared/SeverityBadge";
import QuickCapture from "../components/dashboard/QuickCapture";
import InsightsPreviewCard from "../components/dashboard/InsightsPreviewCard";
import QuickCaptureModal from "../components/QuickCaptureModal";
import CheckoutUpsellModal from "../components/CheckoutUpsellModal";
import RealWorldImpactCard from "../components/dashboard/RealWorldImpactCard";
import DailyInsightCard from "../components/dashboard/DailyInsightCard";
import SeverityProfile from "../components/dashboard/SeverityProfile";
import TodayTimeline from "../components/dashboard/TodayTimeline";
import EvidenceStrengthCard from "../components/dashboard/EvidenceStrengthCard";
import ImprovedQuickCapture from "../components/dashboard/ImprovedQuickCapture";
import usePullToRefresh from "../hooks/usePullToRefresh";
import { isNativeRuntime, getPlatform } from "../lib/native-auth";
import { initPurchases, purchaseSubscription } from "../lib/purchase-service";
import { IAP_PRODUCTS } from "../lib/iap-products";
import { appParams } from "../lib/app-params";

const CORE_PLANS = [
  {
    type: 'individual',
    name: 'Impact Vault Core',
    founding: {
      priceId: 'price_1TLETKDZJD79Rb243HE1dH06',
      iapProductId: IAP_PRODUCTS.coreIndividual,
      name: 'Impact Vault Core Founding',
    },
    standard: {
      priceId: 'price_1TLETKDZJD79Rb243HE1dH06',
      iapProductId: IAP_PRODUCTS.coreIndividual,
      name: 'Impact Vault Core',
    },
  },
  {
    type: 'family',
    name: 'Impact Vault Family',
    founding: {
      priceId: 'price_1TLEVjDZJD79Rb24ntzxhpCi',
      iapProductId: IAP_PRODUCTS.coreFamily,
      name: 'Impact Vault Family Founding',
    },
    standard: {
      priceId: 'price_1TLEVjDZJD79Rb24ntzxhpCi',
      iapProductId: IAP_PRODUCTS.coreFamily,
      name: 'Impact Vault Family',
    },
  },
];

export default function Dashboard() {
  const [participants, setParticipants] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [quickEntries, setQuickEntries] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [carerLogs, setCarerLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [quickCaptureCategory, setQuickCaptureCategory] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const load = async () => {
    try {
      const u = await base44.auth.me();
      if (!u) return;
      setUser(u);
      const [p, i, e, c, q] = await Promise.all([
        base44.entities.ParticipantProfile.filter({ created_by: u.email }),
        base44.entities.DailyImpactLog.filter({ created_by: u.email }, "-date"),
        base44.entities.EvidenceItem.filter({ created_by: u.email }, "-upload_date"),
        base44.entities.CarerCapacityLog.filter({ created_by: u.email }, "-date"),
        base44.entities.QuickEntry.filter({ created_by: u.email }, "-date"),
      ]);
      setParticipants(p);
      setImpacts(i);
      setEvidence(e);
      setCarerLogs(c);
      setQuickEntries(q);
    } catch (err) {
      console.error("Dashboard load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const { containerRef, pulling, pullDistance, refreshing } = usePullToRefresh(load);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkout === "success" && sessionId) {
      setLoading(true);
      base44.functions.invoke('handlePaymentSuccess', { sessionId })
        .then(() => {
          window.history.replaceState({}, "", window.location.pathname);
          window.location.reload();
        })
        .catch((err) => {
          console.error("Payment activation error:", err.message);
          // Clean URL and load dashboard anyway — plan may have been set
          window.history.replaceState({}, "", window.location.pathname);
          load();
        });
    } else {
      load();
    }
  }, []);

  // Show checkout modal for users without a plan on mobile
  useEffect(() => {
    if (!appParams.bypassPaywall && user && !user.plan && isNativeRuntime()) {
      setShowCheckout(true);
      initPurchases().catch((err) => console.warn('[IAP] init failed', err));
    }
  }, [user]);

  const handleCheckout = async (checkoutData) => {
    setCheckoutLoading(true);
    try {
      if (!isNativeRuntime()) {
        // Web: redirect to Stripe
        const response = await base44.functions.invoke('createCheckoutSession', {
          priceId: checkoutData.priceId,
          planName: checkoutData.planName,
        });
        if (response.data?.url) {
          window.location.href = response.data.url;
        }
        return;
      }

      // Mobile: Verify IAP purchase
      const platform = getPlatform();
      if (!platform) {
        throw new Error('Could not detect platform');
      }

      if (platform !== 'android') {
        alert('In-app purchases on iOS are not enabled yet.');
        return;
      }

      await initPurchases();
      await purchaseSubscription(checkoutData.priceId);

      // Backend verification happens inside purchaseSubscription; refresh user state.
      await load();
      setShowCheckout(false);
    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Checkout failed: ${error.message}`);
    } finally {
      setCheckoutLoading(false);
    }
  };



  const recentImpacts = impacts.slice(0, 5);
  const recentEvidence = evidence.slice(0, 4);

  // Today's data
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayImpacts = impacts.filter(i => i.date === todayStr);
  const todayEvidence = evidence.filter(e => e.upload_date === todayStr);
  const todayCarerLogs = carerLogs.filter(c => c.date === todayStr);
  const todayAvgSeverity = todayImpacts.length
    ? (todayImpacts.reduce((s, i) => s + i.severity, 0) / todayImpacts.length).toFixed(1)
    : null;
  const hasToday = todayImpacts.length > 0 || todayEvidence.length > 0 || todayCarerLogs.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#B6ADA5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allEntries = [
    ...impacts.filter(i => !i.archived).map(e => ({ ...e, _source: "impact" })),
    ...quickEntries.map(e => ({ ...e, _source: "quick" })),
  ];
  const hasInsights = appParams.bypassPaywall || user?.insights_plan === true;

  // Check for upcoming plan end dates
  const today = new Date();
  const planEndNotifications = participants
    .filter(p => p.plan_end_date && !p.no_plan)
    .map(p => {
      const endDate = new Date(p.plan_end_date);
      const daysUntilEnd = differenceInDays(endDate, today);
      if (daysUntilEnd > 0 && daysUntilEnd <= 180) {
        let urgency = "info";
        if (daysUntilEnd <= 14) urgency = "critical";
        else if (daysUntilEnd <= 30) urgency = "warning";
        else if (daysUntilEnd <= 90) urgency = "caution";
        return { participant: p, daysUntilEnd, urgency };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);

  return (
    <div ref={containerRef} className="space-y-6 md:space-y-8">
      {/* Pull-to-refresh indicator */}
      {(pulling || refreshing) && (
        <div className="flex justify-center items-center py-2" style={{ transform: `translateY(${Math.min(pullDistance * 0.5, 32)}px)`, transition: pulling ? 'none' : 'transform 0.3s' }}>
          <RefreshCw className={`w-5 h-5 text-stone-400 ${refreshing ? 'animate-spin' : ''}`} style={{ transform: !refreshing ? `rotate(${pullDistance * 2}deg)` : '' }} />
        </div>
      )}
      {/* Hero banner */}
      <div className="rounded-2xl px-5 py-6 md:px-8 md:py-8 flex items-center justify-between gap-4" style={{ background: 'linear-gradient(135deg, #B6ADA5 0%, #9A9089 100%)' }}>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/70 mb-2">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight text-white">Impact Vault</h1>
          <p className="text-white/80 text-sm mt-2 leading-relaxed">
            Capture functional impact.<br />Understand support needs over time.<br />Be ready when it matters.
          </p>
        </div>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/d2e03010a_Impactvault-whitebackgroundwhitetext.png"
          alt="Impact Vault logo"
          className="h-28 w-28 md:h-40 md:w-40 object-contain shrink-0 opacity-90"
        />
      </div>
      <div className="h-px bg-stone-200 mb-2" />

      {/* Plan End Notifications */}
      {planEndNotifications.length > 0 && (
        <div className="space-y-2">
          {planEndNotifications.slice(0, 3).map(({ participant, daysUntilEnd, urgency }) => {
            const bgColor = urgency === "critical" ? "bg-red-50 border-red-200" : urgency === "warning" ? "bg-orange-50 border-orange-200" : urgency === "caution" ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200";
            const textColor = urgency === "critical" ? "text-red-800" : urgency === "warning" ? "text-orange-800" : urgency === "caution" ? "text-yellow-800" : "text-blue-800";
            const iconColor = urgency === "critical" ? "text-red-600" : urgency === "warning" ? "text-orange-600" : urgency === "caution" ? "text-yellow-600" : "text-blue-600";

            let timeText = "";
            if (daysUntilEnd === 0) timeText = "ending today";
            else if (daysUntilEnd === 1) timeText = "ending tomorrow";
            else if (daysUntilEnd <= 14) timeText = `ending in ${daysUntilEnd} days`;
            else if (daysUntilEnd <= 30) timeText = `ending in ~${Math.ceil(daysUntilEnd / 7)} weeks`;
            else timeText = `ending in ~${Math.ceil(daysUntilEnd / 30)} months`;

            return (
              <div key={participant.id} className={`rounded-xl border ${bgColor} p-4 flex items-start gap-3`}>
                <AlertCircle className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${textColor}`}>
                    {participant.name}'s plan is {timeText}
                  </p>
                  <p className={`text-xs ${textColor} opacity-80 mt-0.5`}>
                    End date: {format(new Date(participant.plan_end_date), "d MMMM yyyy")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Today Summary */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sunrise className="w-4 h-4 text-stone-400" />
            <h2 className="text-base font-bold text-stone-900 tracking-tight">Today's Summary</h2>
          </div>
          <span className="text-xs text-stone-400">{format(new Date(), "d MMMM yyyy")}</span>
        </div>
        {!hasToday ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
            <p className="text-sm text-stone-400">No functional impacts captured today yet.</p>
            <Link
              to={createPageUrl("ImpactLog")}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-700 transition-colors shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" /> Capture Impact
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {todayImpacts.length > 0 && (
              <div className="flex-1 min-w-[120px] bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-4xl font-bold text-stone-900">{todayImpacts.length}</p>
                  <span className="text-lg">📊</span>
                </div>
                <p className="text-xs text-stone-500 font-medium">Impact Entries</p>
                {todayAvgSeverity && (
                  <p className="text-xs text-stone-400 mt-2 font-medium">Avg Severity: {todayAvgSeverity}</p>
                )}
              </div>
            )}
            {todayEvidence.length > 0 && (
              <div className="flex-1 min-w-[120px] bg-stone-100 rounded-xl p-4 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-4xl font-bold text-stone-600">{todayEvidence.length}</p>
                  <span className="text-lg">📎</span>
                </div>
                <p className="text-xs text-stone-500 font-medium">Evidence Files</p>
              </div>
            )}
            {todayCarerLogs.length > 0 && (
              <div className="flex-1 min-w-[120px] bg-stone-100 rounded-xl p-4 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-4xl font-bold text-stone-600">{todayCarerLogs.length}</p>
                  <span className="text-lg">❤️</span>
                </div>
                <p className="text-xs text-stone-500 font-medium">Capacity Entries</p>
              </div>
            )}
            <div className="flex items-end">
              <Link
                to={createPageUrl("ImpactLog")}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-700 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" /> Capture Impact
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Daily Insight */}
      <DailyInsightCard impacts={impacts} quickEntries={quickEntries} />

      {/* Severity Profile */}
      {hasToday && <SeverityProfile impacts={impacts} avgSeverity={todayAvgSeverity} />}

      {/* Today Timeline */}
      {hasToday && <TodayTimeline impacts={impacts} />}

      {/* Improved Quick Capture */}
      <ImprovedQuickCapture onCardClick={(category) => {
        setQuickCaptureCategory(category || "");
        setShowQuickCapture(true);
      }} />

      {/* Real-World Impact Card */}
      <RealWorldImpactCard impacts={impacts} />

      {/* Evidence Strength Card */}
      <EvidenceStrengthCard impacts={impacts} evidence={evidence} />

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-stone-900 tracking-tight">Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent impact logs */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-700">Functional Impacts</h3>
              <Link to={createPageUrl("ImpactLog")} className="text-xs text-[#9A9089] hover:underline">View all</Link>
            </div>
            {recentImpacts.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No functional impacts captured yet</p>
            ) : (
              <div className="space-y-2">
                {recentImpacts.map((imp) => {
                  const p = participants.find((x) => x.id === imp.participant_id);
                  const severityColor = imp.severity <= 2 ? "text-green-600" : imp.severity === 3 ? "text-yellow-600" : imp.severity === 4 ? "text-orange-600" : "text-red-600";
                  const severityLabel = imp.severity <= 2 ? "mild" : imp.severity === 3 ? "moderate" : imp.severity === 4 ? "high" : "severe";
                  return (
                    <div key={imp.id} className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
                      <div className="flex-col flex items-start shrink-0">
                        <span className={`font-bold text-lg ${severityColor}`}>{imp.severity}</span>
                        <span className="text-xs text-stone-400">{severityLabel}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700 truncate">{imp.description || imp.functional_impact}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {p?.name} · {imp.date}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent evidence */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-700">Evidence</h3>
              <Link to={createPageUrl("Evidence")} className="text-xs text-[#9A9089] hover:underline">View all</Link>
            </div>
            {recentEvidence.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No supporting evidence added yet</p>
            ) : (
              <div className="space-y-2">
                {recentEvidence.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 py-2 border-b border-stone-100 last:border-0">
                    <span className="inline-block text-xs bg-[#EDE9E6] text-[#7A726C] px-2 py-1 rounded-full capitalize shrink-0">{ev.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-700 truncate">{ev.description}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{ev.upload_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights Preview */}
      <InsightsPreviewCard entries={allEntries} hasInsights={hasInsights} />

      {/* Floating Action Button */}
      <Link
        to={createPageUrl("ImpactLog")}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-stone-700 transition-all duration-200 hover:scale-110"
        title="Log impact"
      >
        <span className="text-2xl">+</span>
      </Link>

      {/* Quick Capture Modal */}
      <QuickCaptureModal
        isOpen={showQuickCapture}
        onClose={() => { setShowQuickCapture(false); setQuickCaptureCategory(""); }}
        participants={participants}
        onSuccess={() => load()}
        initialCategory={quickCaptureCategory}
      />

      {/* Checkout Upsell Modal */}
      {user && !user.plan && !appParams.bypassPaywall && (
        <CheckoutUpsellModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          corePlan={CORE_PLANS[0]}
          foundingActive={false}
          onCheckout={handleCheckout}
          loading={checkoutLoading}
        />
      )}
    </div>
  );
}