import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Sparkles } from "lucide-react";
import {
  isNativeRuntime,
  getPlatform,
  getNativeReceipt,
  finishNativeTransaction,
} from "../lib/native-auth";

const IAP_PRODUCTS = {
  coreIndividual: import.meta.env.VITE_IAP_PRODUCT_CORE_INDIVIDUAL || "com.impactvault.core.individual.yearly",
  coreFamily: import.meta.env.VITE_IAP_PRODUCT_CORE_FAMILY || "com.impactvault.core.family.yearly",
  insightsIndividualMonthly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_MONTHLY || "",
  insightsIndividualYearly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_YEARLY || "",
  insightsFamilyMonthly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_MONTHLY || "",
  insightsFamilyYearly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_YEARLY || "",
};

const CORE_PLANS = [
  {
    name: "Impact Vault Core",
    description: "Capture functional impact and support needs over time for one person.",
    price: "$79",
    priceId: "price_1TLETKDZJD79Rb243HE1dH06",
    iapProductId: IAP_PRODUCTS.coreIndividual,
    billing: "AUD / year",
    features: [
      "Capture real-life moments in under 60 seconds",
      "Build a clearer picture of support needs over time",
      "Track functional impact, routines, and daily functioning",
      "Upload photos, documents, and supporting evidence",
      "Generate structured evidence for conversations and reviews",
      "Export your records anytime",
      "Keep everything organised in one place",
    ],
  },
  {
    name: "Impact Vault Family",
    description: "Capture and organise support needs across your family in one place.",
    price: "$129",
    priceId: "price_1TLEVjDZJD79Rb24ntzxhpCi",
    iapProductId: IAP_PRODUCTS.coreFamily,
    billing: "AUD / year",
    features: [
      "Support up to 3 family members in one place",
      "Capture daily life across your family in under 60 seconds",
      "Track patterns and support needs across profiles",
      "Upload evidence and observations securely",
      "Generate structured evidence across all profiles",
      "Export records anytime",
      "Keep everything connected and organised",
    ],
  },
];

const INSIGHTS_PLANS = [
  {
    name: "Insights",
    tagline: "Weekly pattern tracking and functional insight summaries",
    price3m: "$27",
    priceYearly: "$75",
    subLabel3m: "3-month recurring charge ($9/month)",
    subLabel3mDetail: "Minimum 3-month commitment · Billed every 3 months",
    priceId3m: "price_1TLEdPDZJD79Rb2439Vv2XLE",
    priceIdYearly: "price_1TLEgSDZJD79Rb24JX6rF9sP",
    iapProductId3m: IAP_PRODUCTS.insightsIndividualMonthly,
    iapProductIdYearly: IAP_PRODUCTS.insightsIndividualYearly,
    buttonLabel: "Get Weekly Insights",
    features: [
      "Weekly summaries of what changed",
      "Identify patterns over time - not isolated moments",
      "Track regulation, fatigue, participation, and routines",
      "Monitor progress toward therapy and support goals",
      "Compare week-to-week changes more clearly",
      "Spot early signs before things escalate",
    ],
  },
  {
    name: "Family Insights",
    tagline: "Understand patterns and support needs across your family over time",
    price3m: "$45",
    priceYearly: "$125",
    subLabel3m: "3-month recurring charge ($15/month)",
    subLabel3mDetail: "Minimum 3-month commitment · Billed every 3 months",
    priceId3m: "price_1TLEiZDZJD79Rb24xqNkjp8I",
    priceIdYearly: "price_1TLEmQDZJD79Rb24AvripyHx",
    iapProductId3m: IAP_PRODUCTS.insightsFamilyMonthly,
    iapProductIdYearly: IAP_PRODUCTS.insightsFamilyYearly,
    featured: true,
    buttonLabel: "Get Family Insights",
    features: [
      "Weekly insights across all family profiles",
      "Identify shared patterns and environmental triggers",
      "Understand what's helping — and what isn't",
      "Track support needs across therapy goals",
      "Compare trends between family members",
      "See early shifts in routines, regulation, and daily functioning",
    ],
  },
];

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [insightsBilling, setInsightsBilling] = useState("3monthly");
  const [user, setUser] = useState(null);
  const nativeRuntime = isNativeRuntime();

  const mask = (value) => {
    if (!value || typeof value !== "string") return value;
    if (value.length <= 8) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  };

  const handleNativePurchase = async ({ iapProductId, fallbackProductId, planName }) => {
    console.log("[IAP][Pricing] Native purchase started", {
      iapProductId,
      fallbackProductId,
      planName,
    });

    if (!iapProductId) {
      throw new Error("This in-app product is not configured. Set VITE_IAP_PRODUCT_* environment variables.");
    }

    const platform = getPlatform();
    console.log("[IAP][Pricing] Platform resolved", { platform });
    if (!platform) {
      throw new Error("Could not detect native platform.");
    }

    const receipt = await getNativeReceipt(iapProductId);
    console.log("[IAP][Pricing] Native receipt captured", {
      productId: receipt?.productId,
      transactionId: receipt?.transactionId,
      purchaseToken: mask(receipt?.purchaseToken),
    });

    const payload = {
      platform,
      productId: receipt.productId || iapProductId || fallbackProductId,
      useSandbox: import.meta.env.VITE_IAP_USE_SANDBOX === "true",
      planName,
    };

    if (platform === "ios") {
      payload.transactionId = receipt.transactionId;
    } else {
      payload.purchaseToken = receipt.purchaseToken;
      payload.packageName = import.meta.env.VITE_ANDROID_PACKAGE_NAME;
    }

    console.log("[IAP][Pricing] Verification payload prepared", {
      platform: payload.platform,
      productId: payload.productId,
      useSandbox: payload.useSandbox,
      transactionId: payload.transactionId,
      purchaseToken: mask(payload.purchaseToken),
      packageName: payload.packageName,
    });

    if (platform === "ios" && !payload.transactionId) {
      throw new Error("Native iOS purchase did not return transactionId");
    }
    if (platform === "android" && !payload.purchaseToken) {
      throw new Error("Native Android purchase did not return purchaseToken");
    }

    const verifyResult = await base44.functions.invoke("verifyInAppPurchase", payload);
    console.log("[IAP][Pricing] Verification response received", {
      success: verifyResult?.data?.success,
      status: verifyResult?.data?.verification?.status,
      transactionId: verifyResult?.data?.verification?.transaction_id,
      productId: verifyResult?.data?.productId,
      error: verifyResult?.data?.error,
    });
    if (verifyResult?.data?.success !== true) {
      throw new Error(verifyResult?.data?.error || "Purchase verification failed");
    }

    await finishNativeTransaction(receipt.transactionId);
    console.log("[IAP][Pricing] Native transaction finish completed", {
      transactionId: receipt.transactionId,
    });

    const refreshedUser = await base44.auth.me();
    setUser(refreshedUser);
    console.log("[IAP][Pricing] User reloaded after purchase", {
      email: refreshedUser?.email,
      plan: refreshedUser?.plan,
      insights_plan: refreshedUser?.insights_plan,
    });
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'insights') {
      setTimeout(() => {
        document.getElementById('insights-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, []);

  const handleCoreCheckout = async (priceId, planName) => {
    console.log("[IAP][Pricing] Core checkout clicked", { priceId, planName, nativeRuntime });
    if (!nativeRuntime && window.self !== window.top) {
      alert("Checkout is only available from the published app.");
      return;
    }
    setLoading(true);
    try {
      if (nativeRuntime) {
        const plan = CORE_PLANS.find((p) => p.priceId === priceId);
        console.log("[IAP][Pricing] Using native core plan", {
          matchedPlan: plan?.name,
          iapProductId: plan?.iapProductId,
        });
        await handleNativePurchase({
          iapProductId: plan?.iapProductId,
          fallbackProductId: plan?.iapProductId,
          planName,
        });
        alert("Purchase successful.");
        return;
      }

      const response = await base44.functions.invoke('createCheckoutSession', { priceId, planName });
      if (response.data?.url) window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      console.error("[IAP][Pricing] Core checkout failed", {
        message: error?.message,
        stack: error?.stack,
      });
      alert(`Payment failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInsightsCheckout = async (plan) => {
    console.log("[IAP][Pricing] Insights checkout clicked", {
      plan: plan?.name,
      insightsBilling,
      nativeRuntime,
    });
    if (!nativeRuntime && window.self !== window.top) {
      alert("Checkout is only available from the published app.");
      return;
    }
    const priceId = insightsBilling === "3monthly" ? plan.priceId3m : plan.priceIdYearly;
    const iapProductId = insightsBilling === "3monthly" ? plan.iapProductId3m : plan.iapProductIdYearly;
    setLoading(true);
    try {
      if (nativeRuntime) {
        console.log("[IAP][Pricing] Using native insights product", {
          plan: plan?.name,
          iapProductId,
        });
        await handleNativePurchase({
          iapProductId,
          fallbackProductId: iapProductId,
          planName: plan.name,
        });
        alert("Purchase successful.");
        return;
      }

      const response = await base44.functions.invoke('createCheckoutSession', { priceId, planName: plan.name });
      if (response.data?.url) window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      console.error("[IAP][Pricing] Insights checkout failed", {
        message: error?.message,
        stack: error?.stack,
      });
      alert(`Payment failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const visibleCorePlans = nativeRuntime
    ? CORE_PLANS.filter((plan) => !!plan.iapProductId)
    : CORE_PLANS;

  const visibleInsightsPlans = nativeRuntime
    ? INSIGHTS_PLANS.filter((plan) => !!plan.iapProductId3m || !!plan.iapProductIdYearly)
    : INSIGHTS_PLANS;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="text-center py-10 md:py-14 px-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">PRICING</p>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">Built for Individuals, Families,<br />and Ongoing Insight</h1>
        <p className="text-stone-500 text-sm md:text-base max-w-md mx-auto">Flexible options for capturing functional impact, tracking support needs, and building clearer evidence over time.</p>
        {nativeRuntime && (
          <p className="text-xs text-stone-400 mt-2">Native in-app purchase products only. Web subscriptions are hidden in the app.</p>
        )}
      </div>

      {/* Core Plans */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">CORE PLANS</p>
        {nativeRuntime && visibleCorePlans.length === 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No StoreKit/Play products configured yet. Add VITE_IAP_PRODUCT_CORE_* env vars and rebuild.
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {visibleCorePlans.map((plan) => (
            <div key={plan.name} className="rounded-2xl border border-stone-200 p-7 bg-white hover:shadow-md transition-all">
              <h2 className="text-xl font-bold text-stone-800 mb-1">{plan.name}</h2>
              <p className="text-sm text-stone-500 mb-5">{plan.description}</p>
              <div className="mb-3">
                <span className="text-4xl font-bold text-stone-900">{plan.price}</span>
                <span className="text-stone-500 ml-2 text-sm">AUD</span>
              </div>
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">🔁 Recurring yearly charge</span>
              </div>
              <button
                onClick={() => handleCoreCheckout(plan.priceId, plan.name)}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold transition-colors mb-6 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Processing..." : "Get Started"}
              </button>
              <div className="space-y-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-stone-700">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-4 mb-10">
        <div className="border-t border-stone-200" />
        <h2 className="text-center text-2xl md:text-3xl font-bold text-stone-900 mt-8 mb-1">See the Patterns Behind Daily Life</h2>
      </div>

      {/* Insights Add-on */}
      <div id="insights-section" className="max-w-4xl mx-auto px-4 pb-16">
        {user?.plan && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Already have a Core plan? You can add Insights below to unlock pattern detection and advanced reports.</span>
          </div>
        )}

        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              ✦ INSIGHTS ADD-ON — SUBSCRIPTION
            </p>
            <p className="text-sm text-stone-500 mt-0.5">Add to any Core plan</p>
            <p className="text-sm text-stone-400">Weekly insights help identify patterns in support needs, regulation, routines, fatigue, and daily functioning over time.</p>
          </div>
          <div className="flex items-center bg-stone-900 rounded-2xl p-1 shrink-0">
            <button
              onClick={() => setInsightsBilling("3monthly")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                insightsBilling === "3monthly" ? "bg-white text-stone-900" : "text-stone-400 hover:text-white"
              }`}
            >
              3 Monthly
            </button>
            <button
              onClick={() => setInsightsBilling("yearly")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                insightsBilling === "yearly" ? "bg-white text-stone-900" : "text-stone-400 hover:text-white"
              }`}
            >
              Yearly <span className="text-amber-400">Save ~30%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Phone mockup */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="w-[180px] bg-stone-900 rounded-[2.5rem] p-2.5 shadow-2xl" style={{aspectRatio: '9/19'}}>
              <div className="bg-white rounded-[2rem] h-full overflow-hidden">
                <div className="overflow-y-auto h-full">
                  <div className="px-3 py-3 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-stone-200" />
                      <div>
                        <p className="text-[8px] font-bold text-stone-800">Impact Vault</p>
                        <p className="text-[6px] text-stone-400">Functional Impact Insights</p>
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-[6px] font-bold px-1.5 py-0.5 rounded-full">+ Insights</span>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[9px] font-bold text-stone-800">Your weekly snapshot</p>
                    <p className="text-[7px] text-stone-400">4 Apr – 11 Apr 2026 · Liam</p>
                    <p className="text-[7px] text-stone-500 mt-1">Hi Sarah, here's a summary of functional impacts, support patterns, and daily life trends captured this week.</p>
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      {[["8","IMPACTS","#1c1917"],["3.2","AVG IMPACT","#d97706"],["2","HIGH NEED","#ef4444"]].map(([v,l,c]) => (
                        <div key={l} className="bg-stone-100 rounded-lg p-1 text-center">
                          <p className="text-[10px] font-bold" style={{color:c}}>{v}</p>
                          <p className="text-[5px] text-stone-500 uppercase font-semibold">{l}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[6px] font-bold text-stone-600 uppercase mt-2 mb-1">Most common impacts</p>
                    <div className="flex flex-wrap gap-1">
                      {["Regulation Difficulty (4)","Sleep Impact (2)","Participation Difficulty (2)"].map(t => (
                        <span key={t} className="bg-amber-100 text-amber-800 text-[5px] font-semibold px-1.5 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5 mt-2">
                      <p className="text-[6px] font-bold text-blue-800">✦ Peak time detected</p>
                      <p className="text-[8px] font-bold text-blue-700">Afternoon (12pm–5pm)</p>
                      <p className="text-[6px] text-blue-600">5 of 8 impacts occurred during this time. This period may benefit from additional support.</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-1.5 mt-2">
                      <p className="text-[6px] font-bold text-green-800">✦ Support Goals This Week</p>
                      {[["Improve transition management","4 entries"],["Increase sleep duration","Working with OT"]].map(([t,n]) => (
                        <div key={t} className="bg-white rounded p-1 mt-1">
                          <div className="flex justify-between items-center">
                            <p className="text-[6px] font-semibold text-stone-700">{t}</p>
                            <span className="bg-green-500 text-white text-[5px] px-1 rounded-full">{n}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[6px] font-bold text-stone-600 uppercase mt-2 mb-1">Recent Functional Impacts</p>
                    <div className="flex items-center gap-1 py-1 border-b border-stone-100">
                      <span className="text-[5px] text-stone-400">2026-04-10</span>
                      <span className="bg-red-500 text-white text-[5px] font-bold px-1 rounded-full">S4</span>
                      <span className="text-[5px] text-stone-600 flex-1">Significant regulation difficulty during school transition</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-400 mt-2 text-center">Scroll to see more of our app</p>
          </div>

          {/* Insights plan cards */}
          {visibleInsightsPlans.map((plan) => {
            const price = insightsBilling === "3monthly" ? plan.price3m : plan.priceYearly;
            const billingUnit = insightsBilling === "3monthly" ? "AUD" : "AUD / year";
            const hasSelectedNativeProduct = insightsBilling === "3monthly" ? !!plan.iapProductId3m : !!plan.iapProductIdYearly;
            return (
              <div
                key={plan.name}
                className={`rounded-2xl border p-7 bg-white transition-all ${
                  plan.featured ? "border-amber-400 shadow-lg" : "border-stone-200 hover:shadow-md"
                }`}
              >
                {plan.featured && (
                  <span className="inline-block bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">BEST VALUE</span>
                )}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-amber-500 text-sm">✦</span>
                  <h2 className="text-lg font-bold text-stone-800">{plan.name}</h2>
                </div>
                <p className="text-sm text-stone-500 mb-4">{plan.tagline}</p>
                <div className="mb-1">
                  <span className="text-4xl font-bold text-stone-800">{price}</span>
                  <span className="text-stone-500 ml-2 text-sm">{billingUnit}</span>
                </div>
                {insightsBilling === "3monthly" && (
                  <div className="mb-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-1 ${plan.featured ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-700"}`}>
                      🔁 {plan.subLabel3m}
                    </div>
                    <p className="text-xs text-stone-400">{plan.subLabel3mDetail}</p>
                  </div>
                )}
                {insightsBilling === "yearly" && (
                  <div className="mb-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-1 ${plan.featured ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-700"}`}>
                      🔁 Recurring yearly charge
                    </div>
                    <p className="text-xs text-stone-400">Billed annually · Renews each year</p>
                  </div>
                )}
                <button
                  onClick={() => handleInsightsCheckout(plan)}
                  disabled={loading || (nativeRuntime && !hasSelectedNativeProduct)}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors mb-6 ${
                    plan.featured
                      ? "bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                      : "border-2 border-stone-800 text-stone-800 hover:bg-stone-50 disabled:opacity-60"
                  }`}
                >
                  {loading ? "Processing..." : nativeRuntime && !hasSelectedNativeProduct ? "Unavailable in Store" : plan.buttonLabel}
                </button>
                <div className="space-y-3">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <span className="text-amber-500 shrink-0 mt-0.5">✦</span>
                      <span className="text-sm text-stone-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center py-8 px-4">
        <p className="text-sm text-stone-400">Core plans renew yearly. Insights plans are recurring subscriptions — 3-monthly or yearly<br />· Cancel anytime after minimum commitment</p>
      </div>
    </div>
  );
}