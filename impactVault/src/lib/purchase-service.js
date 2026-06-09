// Android (Google Play) subscription flow using cordova-plugin-purchase v13,
// which bridges through Capacitor's Cordova compatibility layer.
//
// Web/Stripe checkout is handled elsewhere and is intentionally NOT touched here.

import 'cordova-plugin-purchase/www/store.js';
import { base44 } from '@/api/base44Client';
import { isNativeRuntime, getPlatform } from './native-auth';
import { ANDROID_PRODUCTS, ANDROID_PRODUCT_IDS, getAndroidProduct } from './iap-products';

const PACKAGE_NAME = 'com.vault.impactVault';

let initialized = false;
let initPromise = null;

function getStore() {
  const CdvPurchase = window.CdvPurchase;
  if (!CdvPurchase) {
    throw new Error('cordova-plugin-purchase not available (are you running on a device?)');
  }
  return { CdvPurchase, store: CdvPurchase.store };
}

/**
 * Initialize the Play Billing store and register all known subscription products.
 * Safe to call multiple times — only runs once.
 */
export async function initPurchases() {
  if (!isNativeRuntime() || getPlatform() !== 'android') return;
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { CdvPurchase, store } = getStore();

    // Register every product we sell on Android.
    const products = ANDROID_PRODUCT_IDS.map((productId) => ({
      id: productId,
      type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      platform: CdvPurchase.Platform.GOOGLE_PLAY,
    }));
    store.register(products);

    // Global handlers: verify on the server, then finish the transaction.
    store
      .when()
      .approved((transaction) => verifyAndFinish(transaction).catch((err) => {
        console.error('[IAP] verify/finish failed', err);
      }))
      .verified((receipt) => receipt.finish())
      .productUpdated(() => {
        // Could expose updated localized prices to UI here.
      });

    store.error((err) => {
      console.error('[IAP] store error', err);
    });

    await store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
    initialized = true;
  })();

  return initPromise;
}

async function verifyAndFinish(transaction) {
  const purchaseToken = transaction.purchaseId || transaction.transactionId;
  const productId = transaction.products?.[0]?.id;
  if (!purchaseToken || !productId) {
    console.warn('[IAP] transaction missing token or productId', transaction);
    return;
  }

  const res = await base44.functions.invoke('verifyInAppPurchase', {
    platform: 'android',
    productId,
    purchaseToken,
    packageName: PACKAGE_NAME,
  });

  if (res?.data?.success) {
    transaction.finish();
  } else {
    throw new Error(res?.data?.error || 'Server verification failed');
  }
}

/**
 * Fetch the registered products (with localized prices) once initialized.
 */
export async function getProducts() {
  await initPurchases();
  const { store } = getStore();
  return ANDROID_PRODUCT_IDS.map((id) => store.get(id)).filter(Boolean);
}

/**
 * Start the Google Play purchase flow for the given Stripe price ID.
 * Returns a Promise that resolves once the purchase is approved and server-verified.
 */
export async function purchaseSubscription(stripePriceId) {
  await initPurchases();
  const { CdvPurchase, store } = getStore();

  const mapping = getAndroidProduct(stripePriceId);
  if (!mapping) {
    throw new Error(`No Android product mapped for price ${stripePriceId}`);
  }

  const product = store.get(mapping.productId, CdvPurchase.Platform.GOOGLE_PLAY);
  if (!product) {
    throw new Error(`Product not loaded from Play: ${mapping.productId}`);
  }

  // Pick the matching base-plan offer, or fall back to the first available offer.
  const offer =
    product.getOffer?.(mapping.basePlanId) ||
    product.offers?.find((o) => o.id?.includes(mapping.basePlanId)) ||
    product.offers?.[0];

  if (!offer) {
    throw new Error(`No offer available for ${mapping.productId}`);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      store.off(onApproved);
      store.off(onVerified);
      store.off(onError);
    };
    const onApproved = store.when().approved(async (tx) => {
      try {
        await verifyAndFinish(tx);
        if (!settled) { settled = true; cleanup(); resolve(tx); }
      } catch (e) {
        if (!settled) { settled = true; cleanup(); reject(e); }
      }
    });
    const onVerified = () => {};
    const onError = store.error((err) => {
      if (!settled) { settled = true; cleanup(); reject(new Error(err.message || 'Purchase failed')); }
    });

    offer.order().catch((err) => {
      if (!settled) { settled = true; cleanup(); reject(err); }
    });
  });
}

/**
 * Restore previously purchased subscriptions (required by Google/Apple policies).
 */
export async function restorePurchases() {
  await initPurchases();
  const { store } = getStore();
  await store.restorePurchases();
}
