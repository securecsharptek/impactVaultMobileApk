// Canonical app-wide product IDs used by pricing/dashboard and purchase flows.
export const IAP_PRODUCTS = {
  coreIndividual: import.meta.env.VITE_IAP_PRODUCT_CORE_INDIVIDUAL || 'com.impactvault.core.individual.yearly',
  coreFamily: import.meta.env.VITE_IAP_PRODUCT_CORE_FAMILY || 'com.impactvault.core.family.yearly',
  insightsIndividualMonthly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_MONTHLY || '',
  insightsIndividualYearly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_YEARLY || '',
  insightsFamilyMonthly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_MONTHLY || '',
  insightsFamilyYearly: import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_YEARLY || '',
};

// Maps Stripe price IDs (used by the web checkout) to Google Play product IDs.
// Only Android core subscriptions are wired up here. Insights add-ons must be
// created in Play Console before being added to this map.

export const ANDROID_PRODUCTS = {
  // Impact Vault Core (individual) — yearly
  'price_1TLETKDZJD79Rb243HE1dH06': {
    productId: 'core_individual_yearly',
    basePlanId: 'impact-vault-core-individual-yearly',
  },
  // Impact Vault Family — yearly
  'price_1TLEVjDZJD79Rb24ntzxhpCi': {
    productId: 'core_family_yearly',
    basePlanId: 'impact-vault-core-family-yearly',
  },
};

export const ANDROID_PRODUCT_IDS = [...new Set(
  Object.values(ANDROID_PRODUCTS).map(p => p.productId)
)];

export function getAndroidProduct(stripePriceId) {
  return ANDROID_PRODUCTS[stripePriceId] || null;
}
