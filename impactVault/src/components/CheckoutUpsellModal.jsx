import { useState } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";

const INSIGHTS_OPTIONS = {
  individual: {
    name: "Insights",
    monthly: { price: "$9", priceId: "price_1T8sZyDjNTbBbtgB6QP2aUe0", label: "/month" },
    yearly: { price: "$79", priceId: "price_1T8sazDjNTbBbtgBFrN8GqXg", label: "/year" },
  },
  family: {
    name: "Family Insights",
    monthly: { price: "$15", priceId: "price_1T8sXiDjNTbBbtgBWgocuVzi", label: "/month" },
    yearly: { price: "$129", priceId: "price_insights_family_yearly", label: "/year" },
  },
};

const INSIGHT_FEATURES = [
  "Behaviour pattern detection",
  "Trigger analysis",
  "Time-of-day trends",
  "Advanced report summaries",
];



export default function CheckoutUpsellModal({ isOpen, onClose, corePlan, foundingActive, onCheckout, loading }) {
  const [insightsBilling, setInsightsBilling] = useState("monthly");
  const [selectedInsights, setSelectedInsights] = useState(null); // null=undecided, true=add, false=skip

  if (!isOpen || !corePlan) return null;

  const isFoundingPlan = foundingActive;
  const insightsKey = corePlan.type === "family" ? "family" : "individual";
  const insightsOption = INSIGHTS_OPTIONS[insightsKey];
  const insightsPricing = insightsBilling === "monthly" ? insightsOption.monthly : insightsOption.yearly;
  const activePlan = foundingActive ? corePlan.founding : corePlan.standard;

  const handleProceed = () => {
    onCheckout({
      priceId: activePlan.priceId,
      planName: `${corePlan.name} ${foundingActive ? "Founding" : "Standard"}`,
      insightsPriceId: selectedInsights && !isFoundingPlan ? insightsPricing.priceId : null,
      insightsPlanName: selectedInsights && !isFoundingPlan ? insightsOption.name : null,
    });
  };

  const handleClose = () => {
    setSelectedInsights(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-stone-100">
          <div>
            <h2 className="font-bold text-stone-800 text-lg">
              Enhance Your Plan
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-stone-100 text-stone-400">
            <X className="w-5 h-5" />
          </button>
        </div>



        {(
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="font-semibold text-stone-800">Add Insights to your plan?</p>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Unlock pattern detection, trigger analysis, and advanced reports.
            </p>

            {isFoundingPlan && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mb-4">
                💡 Insights is a separate subscription — you can add it from the pricing page after completing your founding member purchase.
              </div>
            )}

            {!isFoundingPlan && (
              <>
                {/* Billing toggle */}
                <div className="flex items-center bg-stone-100 rounded-xl p-1 mb-4 w-fit">
                  <button
                    onClick={() => setInsightsBilling("monthly")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${insightsBilling === "monthly" ? "bg-white shadow text-stone-800" : "text-stone-500"}`}
                  >Monthly</button>
                  <button
                    onClick={() => setInsightsBilling("yearly")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${insightsBilling === "yearly" ? "bg-white shadow text-stone-800" : "text-stone-500"}`}
                  >Yearly <span className="text-amber-600">Save ~30%</span></button>
                </div>

                {/* Add or Skip cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setSelectedInsights(true)}
                    className={`rounded-xl border p-4 text-left transition-all ${selectedInsights === true ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300" : "border-stone-200 hover:border-stone-300"}`}
                  >
                    <p className="text-xs text-amber-600 font-medium mb-1">Yes, add Insights</p>
                    <p className="text-2xl font-bold text-stone-800">{insightsPricing.price}</p>
                    <p className="text-xs text-stone-500">AUD{insightsPricing.label}</p>
                  </button>
                  <button
                    onClick={() => setSelectedInsights(false)}
                    className={`rounded-xl border p-4 text-left transition-all ${selectedInsights === false ? "border-stone-400 bg-stone-50 ring-2 ring-stone-300" : "border-stone-200 hover:border-stone-300"}`}
                  >
                    <p className="text-xs text-stone-500 font-medium mb-1">Skip for now</p>
                    <p className="text-sm font-semibold text-stone-700 mt-3">Core only</p>
                    <p className="text-xs text-stone-400">Can add later</p>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {INSIGHT_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-xs text-stone-600">{f}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              disabled={!isFoundingPlan && selectedInsights === null}
              onClick={() => {
                if (isFoundingPlan) setSelectedInsights(false);
                handleProceed();
              }}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold bg-[#B6ADA5] text-white hover:bg-[#9A9089] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : "Proceed to Payment →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}