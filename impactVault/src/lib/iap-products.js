// Maps Stripe price IDs (used by the web checkout) to platform product IDs.
// Android uses Google Play product IDs, iOS uses App Store Connect product IDs.

export const ANDROID_PRODUCTS = {
  'price_1TLETKDZJD79Rb243HE1dH06': {
    productId: 'core_individual_yearly',
    basePlanId: 'impact-vault-core-individual-yearly',
  },
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

// iOS App Store Connect product IDs (configured in App Store Connect)
export const IOS_PRODUCTS = {
  coreIndividual: 'core_individual_yearly',
  coreFamily: 'core_family_yearly',
  insightsIndividualMonthly: 'insights_individual_monthly',
  insightsIndividualYearly: 'insights_individual_yearly',
  insightsFamilyMonthly: 'insights_family_monthly',
  insightsFamilyYearly: 'insights_family_yearly',
};

// Unified IAP_PRODUCTS for cross-platform use (iOS product IDs as defaults)
// Android-specific logic uses ANDROID_PRODUCTS mapping above
export const IAP_PRODUCTS = {
  coreIndividual: IOS_PRODUCTS.coreIndividual,
  coreFamily: IOS_PRODUCTS.coreFamily,
  insightsIndividualMonthly: IOS_PRODUCTS.insightsIndividualMonthly,
  insightsIndividualYearly: IOS_PRODUCTS.insightsIndividualYearly,
  insightsFamilyMonthly: IOS_PRODUCTS.insightsFamilyMonthly,
  insightsFamilyYearly: IOS_PRODUCTS.insightsFamilyYearly,
};
