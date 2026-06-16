// Maps product IDs used across iOS (App Store Connect) and Android (Google Play).
// The product ID strings are identical on both stores (configured by the developer).

// ─── Core Plans ─────────────────────────────────────────────────────────────
export const CORE_PRODUCT_IDS = {
  coreIndividual: 'com.impactvault.core.individual.yearly',
  coreFamily: 'com.impactvault.core.family.yearly',
};

// ─── Insights Add-on Plans ───────────────────────────────────────────────────
export const INSIGHTS_PRODUCT_IDS = {
  insightsCoreMonthly: 'com.impactvault.insights.core.monthly',
  insightsCoreYearly: 'com.impactvault.insights.core.yearly',
  insightsFamilyMonthly: 'com.impactvault.insights.family.monthly',
  insightsFamilyYearly: 'com.impactvault.insights.family.yearly',
};

// ─── Android (Google Play) subscription mapping ──────────────────────────────
// Maps Stripe price IDs (web checkout) → Play product IDs + base-plan IDs.
export const ANDROID_PRODUCTS = {
  // Core plans
  'price_1TLETKDZJD79Rb243HE1dH06': {
    productId: CORE_PRODUCT_IDS.coreIndividual,
    basePlanId: 'impact-vault-core-individual-yearly',
  },
  'price_1TLEVjDZJD79Rb24ntzxhpCi': {
    productId: CORE_PRODUCT_IDS.coreFamily,
    basePlanId: 'impact-vault-core-family-yearly',
  },
  // Insights add-on plans
  'price_1TLEdPDZJD79Rb2439Vv2XLE': {
    productId: INSIGHTS_PRODUCT_IDS.insightsCoreMonthly,
    basePlanId: 'insights-core-monthly',
  },
  'price_1TLEgSDZJD79Rb24JX6rF9sP': {
    productId: INSIGHTS_PRODUCT_IDS.insightsCoreYearly,
    basePlanId: 'insights-core-yearly',
  },
  'price_1TLEiZDZJD79Rb24xqNkjp8I': {
    productId: INSIGHTS_PRODUCT_IDS.insightsFamilyMonthly,
    basePlanId: 'insights-family-monthly',
  },
  'price_1TLEmQDZJD79Rb24AvripyHx': {
    productId: INSIGHTS_PRODUCT_IDS.insightsFamilyYearly,
    basePlanId: 'insights-family-yearly',
  },
};

export const ANDROID_PRODUCT_IDS = [...new Set(
  Object.values(ANDROID_PRODUCTS).map((p) => p.productId)
)];

export function getAndroidProduct(stripePriceId) {
  return ANDROID_PRODUCTS[stripePriceId] || null;
}

// ─── Unified cross-platform IAP_PRODUCTS ────────────────────────────────────
// Used by native purchase flows on both iOS and Android.
// The env vars override these defaults, allowing per-build configuration.
export const IAP_PRODUCTS = {
  coreIndividual: import.meta.env.VITE_IAP_PRODUCT_CORE_INDIVIDUAL
    || CORE_PRODUCT_IDS.coreIndividual,
  coreFamily: import.meta.env.VITE_IAP_PRODUCT_CORE_FAMILY
    || CORE_PRODUCT_IDS.coreFamily,
  insightsCoreMonthly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_MONTHLY
    || INSIGHTS_PRODUCT_IDS.insightsCoreMonthly,
  insightsCoreYearly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_YEARLY
    || INSIGHTS_PRODUCT_IDS.insightsCoreYearly,
  insightsFamilyMonthly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_MONTHLY
    || INSIGHTS_PRODUCT_IDS.insightsFamilyMonthly,
  insightsFamilyYearly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_YEARLY
    || INSIGHTS_PRODUCT_IDS.insightsFamilyYearly,
};
