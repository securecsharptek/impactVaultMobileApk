import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Sparkles, Check, ChevronLeft, Star, Zap, Clock,
  BarChart2, Brain, Target, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  isNativeRuntime,
  getPlatform,
  getNativeReceipt,
  finishNativeTransaction,
} from "../lib/native-auth";
import { IAP_PRODUCTS } from "../lib/iap-products";
import { store, Platform } from "capacitor-plugin-cdv-purchase";

// ─── Plan definitions ─────────────────────────────────────────────────────────
// Product IDs mirror what's configured in App Store Connect / Google Play.
// Prices shown here are the fallback UI prices — on native devices,
// the store's localised price is fetched and shown instead.

const INSIGHTS_PLANS = [
  {
    id: "core_monthly",
    name: "Core Insights",
    tagline: "Monthly",
    badge: null,
    iapProductId: IAP_PRODUCTS.insightsCoreMonthly,
    stripePriceId: "price_1TLEdPDZJD79Rb2439Vv2XLE",
    fallbackPrice: "$11.99",
    fallbackBillingLabel: "/ month",
    billingNote: "Billed monthly · Cancel anytime",
    isYearly: false,
    featured: false,
    profileCount: 1,
    features: [
      "Weekly summaries of what changed",
      "Identify patterns over time — not isolated moments",
      "Track regulation, fatigue, participation & routines",
      "Monitor progress toward therapy and support goals",
      "Compare week-to-week changes more clearly",
      "Spot early signs before things escalate",
    ],
  },
  {
    id: "core_yearly",
    name: "Core Insights",
    tagline: "Annual",
    badge: "Save ~17%",
    iapProductId: IAP_PRODUCTS.insightsCoreYearly,
    stripePriceId: "price_1TLEgSDZJD79Rb24JX6rF9sP",
    fallbackPrice: "$119.99",
    fallbackBillingLabel: "/ year",
    billingNote: "Billed annually · Renews each year",
    isYearly: true,
    featured: false,
    profileCount: 1,
    features: [
      "Everything in Core Insights Monthly",
      "Best value for ongoing support documentation",
      "Priority access to new insight features",
    ],
  },
  {
    id: "family_monthly",
    name: "Family Insights",
    tagline: "Monthly",
    badge: "Most popular",
    iapProductId: IAP_PRODUCTS.insightsFamilyMonthly,
    stripePriceId: "price_1TLEiZDZJD79Rb24xqNkjp8I",
    fallbackPrice: "$19.99",
    fallbackBillingLabel: "/ month",
    billingNote: "Billed monthly · Cancel anytime",
    isYearly: false,
    featured: true,
    profileCount: 3,
    features: [
      "Weekly insights across all family profiles",
      "Identify shared patterns & environmental triggers",
      "Understand what's helping — and what isn't",
      "Track support needs across therapy goals",
      "Compare trends between family members",
      "See early shifts in routines, regulation & daily functioning",
    ],
  },
  {
    id: "family_yearly",
    name: "Family Insights",
    tagline: "Annual",
    badge: "Best value",
    iapProductId: IAP_PRODUCTS.insightsFamilyYearly,
    stripePriceId: "price_1TLEmQDZJD79Rb24AvripyHx",
    fallbackPrice: "$199.99",
    fallbackBillingLabel: "/ year",
    billingNote: "Billed annually · Renews each year",
    isYearly: true,
    featured: true,
    profileCount: 3,
    features: [
      "Everything in Family Insights Monthly",
      "Biggest saving for family accounts",
      "Priority access to new insight features",
    ],
  },
];

const FEATURE_HIGHLIGHTS = [
  { icon: BarChart2, label: "Category breakdown", desc: "See which areas generate the most incidents" },
  { icon: Clock, label: "Time-of-day patterns", desc: "Discover when support needs are highest" },
  { icon: AlertTriangle, label: "Trigger analysis", desc: "Identify recurring triggers behind incidents" },
  { icon: Brain, label: "Behaviour trends", desc: "Track improvements or escalations over time" },
  { icon: Target, label: "Advanced AI summaries", desc: "AI-written summaries for NDIS reviews" },
  { icon: Zap, label: "Weekly snapshots", desc: "Receive a digest every week automatically" },
];

// ─── Store price reader (reads from the already-initialized CDV-Purchase store) ──
// native-auth.js initializes the store and registers products via initializeNativeIap().
// This function runs after a short delay to allow store products to load, then
// reads the localised price directly from the store singleton.
function readStorePrices(productIds) {
  try {
    const rawPlatform = getPlatform();
    const nativePlatform = rawPlatform === "ios" ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
    const prices = {};
    productIds.forEach((id) => {
      const product = store.get(id, nativePlatform) || store.get(id);
      if (product) {
        const offer = product.offers?.[0];
        const phase = offer?.pricingPhases?.[0];
        if (phase?.price) prices[id] = phase.price;
      }
    });
    return prices;
  } catch {
    return {};
  }
}

// ─── Plan Card Component ──────────────────────────────────────────────────────
function PlanCard({ plan, storePrice, onSelect, loading }) {
  const displayPrice = storePrice || plan.fallbackPrice;
  const isFeatured = plan.featured;

  return (
    <div
      className={`relative rounded-3xl overflow-hidden transition-all duration-200 ${
        isFeatured
          ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-xl shadow-amber-200/60 scale-[1.01]"
          : "bg-white border border-stone-200 hover:shadow-lg hover:border-stone-300"
      }`}
    >
      {/* Badge */}
      {plan.badge && (
        <div
          className={`absolute top-4 right-4 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
            isFeatured
              ? "bg-white/25 text-white"
              : "bg-amber-100 text-amber-700 border border-amber-200"
          }`}
        >
          <Star className="w-2.5 h-2.5 fill-current" />
          {plan.badge}
        </div>
      )}

      <div className="p-6">
        {/* Plan name & tagline */}
        <div className="mb-4">
          <div className={`flex items-center gap-1.5 mb-1 ${isFeatured ? "text-white" : "text-stone-800"}`}>
            <Sparkles className="w-4 h-4 opacity-80" />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
              {plan.profileCount === 1 ? "Individual" : `Family · up to ${plan.profileCount} profiles`}
            </span>
          </div>
          <h3 className={`text-xl font-bold ${isFeatured ? "text-white" : "text-stone-900"}`}>
            {plan.name}
          </h3>
          <p className={`text-sm mt-0.5 ${isFeatured ? "text-white/80" : "text-stone-500"}`}>
            {plan.tagline} subscription
          </p>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-end gap-1">
            <span className={`text-4xl font-extrabold tracking-tight ${isFeatured ? "text-white" : "text-stone-900"}`}>
              {displayPrice}
            </span>
            {!storePrice && (
              <span className={`text-sm pb-1.5 ${isFeatured ? "text-white/70" : "text-stone-400"}`}>
                {plan.fallbackBillingLabel}
              </span>
            )}
          </div>
          <div
            className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              isFeatured ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
            }`}
          >
            <RefreshCw className="w-2.5 h-2.5" />
            {plan.billingNote}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-150 mb-5 ${
            isFeatured
              ? "bg-white text-amber-600 hover:bg-amber-50 shadow-sm disabled:opacity-60"
              : "bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-60"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {plan.isYearly ? "Subscribe Annually" : "Subscribe Monthly"}
            </span>
          )}
        </button>

        {/* Feature list */}
        <ul className="space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Check
                className={`w-4 h-4 shrink-0 mt-0.5 ${isFeatured ? "text-white" : "text-amber-500"}`}
              />
              <span className={`text-sm leading-snug ${isFeatured ? "text-white/90" : "text-stone-600"}`}>
                {f}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InsightsPricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [storePrices, setStorePrices] = useState({});
  const [successPlanId, setSuccessPlanId] = useState(null);
  const [billingFilter, setBillingFilter] = useState("all"); // "all" | "monthly" | "yearly"
  const nativeRuntime = isNativeRuntime();

  // Load user + store prices
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});

    if (nativeRuntime) {
      // Wait 2s for native-auth's store initialization to complete,
      // then read the already-loaded product prices from the store singleton.
      const productIds = INSIGHTS_PLANS.map((p) => p.iapProductId).filter(Boolean);
      const timer = setTimeout(() => {
        setStorePrices(readStorePrices(productIds));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [nativeRuntime]);

  const mask = (value) => {
    if (!value || typeof value !== "string") return value;
    if (value.length <= 8) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  };

  const handleNativePurchase = async ({ iapProductId, planName }) => {
    console.log("[IAP][InsightsPricing] Native purchase started", { iapProductId, planName });

    if (!iapProductId) throw new Error("IAP product ID is not configured for this plan.");

    const platform = getPlatform();
    if (!platform) throw new Error("Could not detect native platform.");

    const receipt = await getNativeReceipt(iapProductId);
    console.log("[IAP][InsightsPricing] Receipt captured", {
      productId: receipt?.productId,
      transactionId: receipt?.transactionId,
      purchaseToken: mask(receipt?.purchaseToken),
    });

    const payload = {
      platform,
      productId: receipt.productId || iapProductId,
      useSandbox: import.meta.env.VITE_IAP_USE_SANDBOX === "true",
      planName,
    };

    if (platform === "ios") {
      payload.transactionId = receipt.transactionId;
    } else {
      payload.purchaseToken = receipt.purchaseToken;
      payload.packageName = import.meta.env.VITE_ANDROID_PACKAGE_NAME;
    }

    if (platform === "ios" && !payload.transactionId)
      throw new Error("iOS purchase did not return transactionId");
    if (platform === "android" && !payload.purchaseToken)
      throw new Error("Android purchase did not return purchaseToken");

    const verifyResult = await base44.functions.invoke("verifyInAppPurchase", payload);
    console.log("[IAP][InsightsPricing] Verification result", {
      success: verifyResult?.data?.success,
      error: verifyResult?.data?.error,
    });

    if (verifyResult?.data?.success !== true)
      throw new Error(verifyResult?.data?.error || "Purchase verification failed");

    await finishNativeTransaction(receipt.transactionId);

    const refreshedUser = await base44.auth.me();
    setUser(refreshedUser);
  };

  const handleSelectPlan = async (plan) => {
    console.log("[InsightsPricing] Plan selected", { plan: plan.name, id: plan.id, nativeRuntime });

    if (!nativeRuntime && window.self !== window.top) {
      alert("Checkout is only available from the published app.");
      return;
    }

    setLoading(true);
    setLoadingPlanId(plan.id);

    try {
      if (nativeRuntime) {
        await handleNativePurchase({ iapProductId: plan.iapProductId, planName: plan.name });
        setSuccessPlanId(plan.id);
        alert(`🎉 ${plan.name} activated! Your Insights are now unlocked.`);
      } else {
        // Web: create Stripe checkout session
        const response = await base44.functions.invoke("createCheckoutSession", {
          priceId: plan.stripePriceId,
          planName: plan.name,
        });
        if (response.data?.url) window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("[InsightsPricing] Purchase error", { message: error?.message });
      alert(`Purchase failed: ${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setLoadingPlanId(null);
    }
  };

  // Filter plans by billing cycle
  const visiblePlans = INSIGHTS_PLANS.filter((plan) => {
    if (billingFilter === "monthly") return !plan.isYearly;
    if (billingFilter === "yearly") return plan.isYearly;
    return true;
  }).filter((plan) => {
    // On native, only show plans with a configured product ID
    if (nativeRuntime) return !!plan.iapProductId;
    return true;
  });

  const alreadyHasInsights = user?.insights_plan === true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 to-white">
      {/* ── Back nav ── */}
      <div className="px-4 pt-5 pb-2">
        <Link
          to={createPageUrl("Insights")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Insights
        </Link>
      </div>

      {/* ── Hero header ── */}
      <div className="px-4 pt-6 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Insights Add-on
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 leading-tight mb-3">
          See the Patterns<br />Behind Daily Life
        </h1>
        <p className="text-stone-500 text-sm max-w-xs mx-auto leading-relaxed">
          Your data is already being tracked. Upgrade Insights to discover what it's telling you — weekly.
        </p>

        {/* Platform note */}
        {nativeRuntime && (
          <p className="text-xs text-stone-400 mt-3">
            Prices shown are from the{" "}
            {getPlatform() === "ios" ? "App Store" : "Google Play"}.
            Subscription managed by{" "}
            {getPlatform() === "ios" ? "Apple" : "Google"}.
          </p>
        )}

        {/* Already subscribed banner */}
        {alreadyHasInsights && (
          <div className="mt-4 mx-auto max-w-sm bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-green-800">
            <Check className="w-4 h-4 text-green-500 shrink-0" />
            <span>You already have an active Insights plan. Manage it in your subscription settings.</span>
          </div>
        )}
      </div>

      {/* ── Feature highlights ── */}
      <div className="px-4 mb-8">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-white border border-stone-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-800 leading-tight">{label}</p>
                <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Billing filter tabs ── */}
      <div className="px-4 mb-6">
        <div className="max-w-lg mx-auto flex justify-center">
          <div className="inline-flex bg-stone-900 rounded-2xl p-1 gap-0.5">
            {[
              { key: "all", label: "All Plans" },
              { key: "monthly", label: "Monthly" },
              { key: "yearly", label: "Annual · Save ~17%" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setBillingFilter(key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  billingFilter === key
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Plan cards ── */}
      <div className="px-4 pb-8">
        <div className="max-w-lg mx-auto grid gap-4">
          {visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              storePrice={storePrices[plan.iapProductId]}
              onSelect={handleSelectPlan}
              loading={loading && loadingPlanId === plan.id}
            />
          ))}

          {nativeRuntime && visiblePlans.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center">
              <p className="text-sm font-semibold text-amber-800 mb-1">Plans not available yet</p>
              <p className="text-xs text-amber-700">
                Insights products are not yet available in the{" "}
                {getPlatform() === "ios" ? "App Store" : "Play Store"}.
                Please check back soon.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Legal footnote ── */}
      <div className="px-6 pb-10 text-center">
        <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">
          Insights is an add-on subscription to any Core plan.
          {nativeRuntime
            ? ` Subscriptions are processed by ${getPlatform() === "ios" ? "Apple" : "Google"} and are subject to their terms. Cancel anytime in your device's subscription settings.`
            : " Cancel anytime. Renews automatically."}
        </p>
        {!nativeRuntime && (
          <Link
            to={createPageUrl("Pricing")}
            className="text-xs text-amber-600 hover:text-amber-700 underline mt-2 inline-block"
          >
            Looking for Core plans? View all pricing →
          </Link>
        )}
      </div>
    </div>
  );
}
