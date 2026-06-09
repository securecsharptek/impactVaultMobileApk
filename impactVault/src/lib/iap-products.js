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
