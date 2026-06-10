import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { getLoginUrl } from '@base44/sdk/dist/utils/auth-utils';
import { store, ProductType, Platform, ErrorCode, LogLevel } from 'capacitor-plugin-cdv-purchase';
import { appParams } from '@/lib/app-params';

const DEFAULT_NATIVE_AUTH_SCHEME = 'com.impactvault.app';
const DEFAULT_NATIVE_AUTH_HOST = 'auth';

const getAuthScheme = () => import.meta.env.VITE_NATIVE_AUTH_SCHEME || DEFAULT_NATIVE_AUTH_SCHEME;
const getAuthHost = () => import.meta.env.VITE_NATIVE_AUTH_HOST || DEFAULT_NATIVE_AUTH_HOST;

const toStorageKey = (paramName) => `base44_${paramName}`;
const isAuthCallbackUrl = (url) => url?.startsWith(`${getAuthScheme()}://`);

export const isNativeRuntime = () => Capacitor.isNativePlatform();

export const getNativeAuthRedirectUrl = () => `${getAuthScheme()}://${getAuthHost()}`;

const IAP_TIMEOUT_MS = 120000;
const pendingTransactions = new Map();
const waitersByProduct = new Map();

let iapInitPromise = null;

const mask = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const toObject = (value) => (value && typeof value === 'object' ? value : {});

const findStringValue = (sources, keys) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }
  return '';
};

const getKnownIapProducts = () => {
  const values = [
    import.meta.env.VITE_IAP_PRODUCT_CORE_INDIVIDUAL || 'com.impactvault.core.individual.yearly',
    import.meta.env.VITE_IAP_PRODUCT_CORE_FAMILY || 'com.impactvault.core.family.yearly',
    import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_MONTHLY,
    import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_INDIVIDUAL_YEARLY,
    import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_MONTHLY,
    import.meta.env.VITE_IAP_PRODUCT_INSIGHTS_FAMILY_YEARLY,
  ].filter((value) => typeof value === 'string' && value.trim());

  return Array.from(new Set(values));
};

const resolveProductPlatform = () => {
  const platform = getPlatform();
  return platform === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
};

const resolveWaiters = (productId, transaction) => {
  const waiters = waitersByProduct.get(productId) || [];
  if (waiters.length === 0) return;
  console.log('[IAP] Resolving waiting purchase listeners', {
    productId,
    listeners: waiters.length,
    transactionId: transaction?.transactionId,
  });
  waitersByProduct.delete(productId);
  waiters.forEach((resolve) => resolve(transaction));
};

const extractPurchaseToken = (transaction) => {
  const tx = toObject(transaction);
  const receipt = toObject(transaction?.parentReceipt);
  const firstTxFromReceipt = Array.isArray(receipt.transactions) ? toObject(receipt.transactions[0]) : {};
  const sources = [tx, receipt, firstTxFromReceipt];

  const token = findStringValue(sources, [
    'purchaseToken',
    'purchase_token',
    'token',
    'purchaseId',
    'receiptData',
    'nativePurchaseToken',
    'googlePurchaseToken',
  ]);

  return token || null;
};

const normalizeTransaction = (transaction, fallbackProductId) => {
  const tx = toObject(transaction);
  const productId = tx?.products?.[0]?.id || fallbackProductId || null;

  return {
    productId,
    transactionId: tx.transactionId || tx.purchaseId || null,
    purchaseToken: extractPurchaseToken(transaction),
    raw: tx,
  };
};

const waitForApprovedTransaction = (productId) =>
  new Promise((resolve, reject) => {
    console.log('[IAP] Waiting for approved transaction', { productId, timeoutMs: IAP_TIMEOUT_MS });
    const timeout = setTimeout(() => {
      const entries = waitersByProduct.get(productId) || [];
      waitersByProduct.set(
        productId,
        entries.filter((fn) => fn !== onResolve)
      );
      console.error('[IAP] Timeout while waiting for approved transaction', { productId });
      reject(new Error('Timed out waiting for native purchase approval'));
    }, IAP_TIMEOUT_MS);

    const onResolve = (transaction) => {
      clearTimeout(timeout);
      resolve(transaction);
    };

    const entries = waitersByProduct.get(productId) || [];
    waitersByProduct.set(productId, [...entries, onResolve]);
  });

const initializeNativeIap = async () => {
  if (!isNativeRuntime()) {
    throw new Error('IAP initialization is only available on native platforms');
  }

  if (!iapInitPromise) {
    console.log('[IAP] Initializing native purchase store');
    iapInitPromise = (async () => {
      const allProducts = getKnownIapProducts();
      console.log('[IAP] Known product IDs', { count: allProducts.length, products: allProducts });
      if (allProducts.length === 0) {
        throw new Error('No IAP product IDs configured. Set VITE_IAP_PRODUCT_* environment variables.');
      }

      // Only register/initialize the platform running on this device
      const rawPlatform = Capacitor.getPlatform();
      const nativePlatform = rawPlatform === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
      console.log('[IAP] Detected native platform', { rawPlatform, nativePlatform });

      const registrations = allProducts.map((id) => ({
        id,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: nativePlatform,
      }));

      store.verbosity = LogLevel.WARNING;
      store.register(registrations);
      console.log('[IAP] Registered products with store', { count: registrations.length, platform: nativePlatform });

      store.when().approved((transaction) => {
        console.log('[IAP] Transaction approved', {
          transactionId: transaction?.transactionId,
          productId: transaction?.products?.[0]?.id,
          state: transaction?.state,
        });
        pendingTransactions.set(transaction.transactionId, transaction);
        const productId = transaction?.products?.[0]?.id;
        if (productId) {
          resolveWaiters(productId, transaction);
        }
      });

      store.error((error) => {
        console.error('[IAP] Store error:', error?.code, error?.message || error);
      });

      const initConfig = rawPlatform === 'ios'
        ? [{ platform: Platform.APPLE_APPSTORE, options: { needAppReceipt: true } }]
        : [Platform.GOOGLE_PLAY];

      const initErrors = await store.initialize(initConfig);

      console.log('[IAP] Store initialize finished', {
        errorsCount: Array.isArray(initErrors) ? initErrors.length : 0,
        errors: initErrors,
      });

      // Only treat it as a fatal error if there are unexpected errors
      // (PRODUCT_NOT_AVAILABLE just means the product isn't approved in the store yet — non-fatal for sandbox)
      if (Array.isArray(initErrors) && initErrors.length > 0) {
        const invalidProductErrors = initErrors.filter((e) => e?.code === ErrorCode.INVALID_PRODUCT_ID);
        if (invalidProductErrors.length > 0) {
          const invalidProductIds = Array.from(
            new Set(invalidProductErrors.map((e) => e?.productId).filter(Boolean))
          );
          console.error('[IAP] Invalid product IDs reported by store', {
            invalidProductIds,
            rawPlatform,
            nativePlatform,
            appIdHint: 'com.impactvault.app',
          });
          throw new Error(
            `StoreKit cannot find configured product IDs (${invalidProductIds.join(', ') || 'unknown'}). ` +
            'Confirm these IDs exist in App Store Connect under the same app bundle ID (com.impactvault.app), ' +
            'and test with a Sandbox/TestFlight account.'
          );
        }

        const fatalErrors = initErrors.filter(
          (e) => e?.code !== ErrorCode.PRODUCT_NOT_AVAILABLE && e?.code !== ErrorCode.INVALID_PRODUCT_ID
        );
        if (fatalErrors.length > 0) {
          console.error('[IAP] Fatal init errors', fatalErrors);
          throw new Error(fatalErrors[0]?.message || 'Failed to initialize native IAP store');
        }
        console.warn('[IAP] Non-fatal init warnings (products may not be approved yet)', initErrors);
      }

      console.log('[IAP] Native purchase store is ready');
    })();
  }

  return iapInitPromise;
};

/**
 * Get the platform type for in-app purchases
 * @returns {string|null} 'ios', 'android', or null if not native
 */
export const getPlatform = () => {
  if (!isNativeRuntime()) return null;
  const platform = Capacitor.getPlatform?.();
  if (platform === 'android' || platform === 'ios') return platform;

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
  return null;
};

/**
 * Execute native in-app purchase for a given store product ID.
 * @returns {Promise<{productId: string|null, purchaseToken: string|null, transactionId: string|null, raw: object}>}
 */
export const getNativeReceipt = async (productId) => {
  console.log('[IAP] ── PURCHASE FLOW START ──────────────────────────────');
  console.log('[IAP] Step 1: getNativeReceipt called', { productId });

  if (!isNativeRuntime()) {
    throw new Error('getNativeReceipt is only available on native platforms');
  }
  if (!productId || typeof productId !== 'string') {
    throw new Error('Missing store product ID for native purchase');
  }

  console.log('[IAP] Step 2: Initializing / reusing store...');
  await initializeNativeIap();
  console.log('[IAP] Step 2: Store ready ✅');

  const rawPlatform = Capacitor.getPlatform();
  const nativePlatform = rawPlatform === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;

  console.log('[IAP] Step 3: Looking up product in store', { productId, platform: nativePlatform });
  const product = store.get(productId, nativePlatform) || store.get(productId);

  console.log('[IAP] Step 3: store.get() result', {
    found: !!product,
    state: product?.state,
    type: product?.type,
    title: product?.title || '(empty)',
    description: product?.description ? product.description.slice(0, 80) : '(none)',
    offersCount: Array.isArray(product?.offers) ? product.offers.length : 0,
    offers: product?.offers?.map((o) => ({
      id: o?.id,
      phases: o?.pricingPhases?.length,
      price: o?.pricingPhases?.[0]?.price,
    })),
  });

  if (!product) {
    console.error(
      '[IAP] ❌ Product not found in App Store. ' +
      'To fix: open App Store Connect → My Apps → Impact Vault → Subscriptions, ' +
      'fill in Display Name, Description, and Review Screenshot for "' + productId + '", ' +
      'then set status to "Ready to Submit".',
      { productId }
    );
    throw new Error(
      `"${productId}" not found in App Store. ` +
      'Complete the product metadata in App Store Connect and set it to Ready to Submit.'
    );
  }

  console.log('[IAP] Step 4: Getting purchasable offer...');
  const offer = product.getOffer();
  console.log('[IAP] Step 4: getOffer() result', {
    offerFound: !!offer,
    offerId: offer?.id,
    pricingPhases: offer?.pricingPhases,
  });

  if (!offer) {
    console.error('[IAP] ❌ No offer available', { productId, productState: product?.state });
    throw new Error(`No purchasable offer found for product: ${productId}`);
  }

  console.log('[IAP] Step 5: Setting up approval listener for product', { productId });
  const waitForApproval = waitForApprovedTransaction(productId);

  console.log('[IAP] Step 6: Calling offer.order() — StoreKit purchase sheet will appear', { productId, offerId: offer.id });
  const orderError = await offer.order();
  console.log('[IAP] Step 6: offer.order() returned', {
    hasError: !!orderError,
    errorCode: orderError?.code,
    errorMessage: orderError?.message,
  });

  if (orderError) {
    console.error('[IAP] ❌ offer.order() error', { code: orderError.code, message: orderError.message });
    if (orderError.code === ErrorCode.PAYMENT_CANCELLED) {
      throw new Error('Purchase cancelled by user');
    }
    throw new Error(orderError.message || 'Native purchase failed');
  }

  console.log('[IAP] Step 7: Order submitted, waiting for StoreKit approved event...', { productId, timeoutMs: IAP_TIMEOUT_MS });
  const approvedTransaction = await waitForApproval;

  console.log('[IAP] Step 7: Approved transaction received ✅', {
    transactionId: approvedTransaction?.transactionId,
    state: approvedTransaction?.state,
    products: approvedTransaction?.products?.map((p) => p?.id),
  });

  const normalized = normalizeTransaction(approvedTransaction, productId);
  console.log('[IAP] Step 8: Transaction normalized', {
    productId: normalized.productId,
    transactionId: normalized.transactionId,
    purchaseToken: mask(normalized.purchaseToken),
  });
  console.log('[IAP] ── PURCHASE FLOW END (receipt captured, verifying...) ──');
  return normalized;
};

/**
 * Finalize/acknowledge a native transaction after backend verification succeeds.
 */
export const finishNativeTransaction = async (transactionId) => {
  console.log('[IAP] finishNativeTransaction called', { transactionId });
  if (!isNativeRuntime() || !transactionId) return;
  await initializeNativeIap();

  const transaction = pendingTransactions.get(transactionId);
  if (!transaction || typeof transaction.finish !== 'function') {
    console.warn('[IAP] No pending transaction found to finish', { transactionId });
    return;
  }

  await transaction.finish();
  pendingTransactions.delete(transactionId);
  console.log('[IAP] Transaction finished and removed from pending map', { transactionId });
};

const parseAuthParams = (incomingUrl) => {
  const parsedUrl = new URL(incomingUrl);
  const params = new URLSearchParams(parsedUrl.search);

  if (parsedUrl.hash && parsedUrl.hash.includes('=')) {
    const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
  }

  return params;
};

export const persistAuthParamsFromUrl = (incomingUrl) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  const params = parseAuthParams(incomingUrl);
  const token = params.get('access_token');
  const tokenCleared = params.get('clear_access_token') === 'true';

  if (tokenCleared) {
    console.log('[OAuth] Clearing access token from logout');
    window.localStorage.removeItem('base44_access_token');
    window.localStorage.removeItem('token');
    return true;
  }

  if (token) {
    console.log('[OAuth] Auth token received, storing in localStorage');
    window.localStorage.setItem('base44_access_token', token);
    window.localStorage.setItem('token', token);
  }

  const knownParams = ['app_id', 'app_base_url', 'functions_version', 'from_url'];
  knownParams.forEach((key) => {
    const value = params.get(key);
    if (value) {
      console.log(`[OAuth] Storing param: ${key}`);
      window.localStorage.setItem(toStorageKey(key), value);
    }
  });

  return Boolean(token) || tokenCleared;
};

const handleNativeAuthCallback = async (incomingUrl, onAuthCallback) => {
  if (!isAuthCallbackUrl(incomingUrl)) {
    console.log('[OAuth] Received URL is not an auth callback:', incomingUrl);
    return false;
  }

  console.log('[OAuth] Processing auth callback URL');

  const changed = persistAuthParamsFromUrl(incomingUrl);

  try {
    await Browser.close();
    console.log('[OAuth] Browser closed successfully');
  } catch (error) {
    console.log('[OAuth] Browser was already closed or error occurred:', error.message);
    // Browser.close throws when no browser is open - this is expected
  }

  if (changed) {
    console.log('[OAuth] Auth params changed, calling callback');
    onAuthCallback?.(incomingUrl);
  }

  return changed;
};

export const addNativeAuthListener = async (onAuthCallback) => {
  console.log('[OAuth] Setting up native auth listener');

  // Check for URL when app is launched with deep link
  const launchUrl = await CapacitorApp.getLaunchUrl();
  if (launchUrl?.url) {
    console.log('[OAuth] App launched with URL:', launchUrl.url);
    await handleNativeAuthCallback(launchUrl.url, onAuthCallback);
  }

  // Listen for deep links when app is already running
  const listener = await CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url) {
      return;
    }

    console.log('[OAuth] App URL open event received:', url);
    await handleNativeAuthCallback(url, onAuthCallback);
  });

  console.log('[OAuth] Native auth listener registered');

  return () => {
    console.log('[OAuth] Removing native auth listener');
    listener.remove();
  };
};

export const openNativeLogin = async (nextUrl, onAuthCallback) => {
  const { appBaseUrl, appId } = appParams;

  console.log('[OAuth] Opening native login with appBaseUrl:', appBaseUrl, 'appId:', appId);

  if (!appBaseUrl || !appId) {
    const errorMsg = 'Missing appBaseUrl or appId for native login flow.';
    console.error('[OAuth]', errorMsg);
    throw new Error(errorMsg);
  }

  const targetUrl = nextUrl || window.location.href;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(toStorageKey('from_url'), targetUrl);
  }

  // Use native deep link as callback so browser redirects back to app
  const callbackUrl = getNativeAuthRedirectUrl();
  console.log('[OAuth] Using callback URL:', callbackUrl);

  const loginUrl = getLoginUrl(callbackUrl, {
    serverUrl: appBaseUrl,
    appId
  });

  console.log('[OAuth] Opening browser with login URL:', loginUrl);

  try {
    await Browser.open({
      url: loginUrl,
      presentationStyle: 'fullscreen',
      windowName: '_blank',
      toolbarColor: '#2563eb'
    });
    console.log('[OAuth] Browser opened successfully');
  } catch (error) {
    console.error('[OAuth] Failed to open browser:', error);
    throw error;
  }
};

export const handleAuthCallbackPage = async (onAuthCallback) => {
  console.log('[OAuth] Handling auth callback page');
  // Close the browser when the callback page loads
  try {
    await Browser.close();
    console.log('[OAuth] Browser closed from callback page');
  } catch (error) {
    // Browser may already be closed
    console.log('[OAuth] Browser close error (expected):', error.message);
  }

  // Refresh auth state (token should now be in localStorage)
  onAuthCallback?.();
};

/**
 * Open native Google OAuth login flow
 * @param {string} googleOAuthUrl - The Google OAuth URL from the API
 * @param {function} onAuthCallback - Callback function when auth completes
 */
export const openNativeGoogleLogin = async (googleOAuthUrl, onAuthCallback) => {
  console.log('[OAuth] Opening native Google login');

  if (!googleOAuthUrl) {
    const errorMsg = 'Missing Google OAuth URL for native login flow.';
    console.error('[OAuth]', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    await Browser.open({
      url: googleOAuthUrl,
      presentationStyle: 'fullscreen',
      windowName: '_blank',
      toolbarColor: '#C4975A'
    });
    console.log('[OAuth] Google login browser opened successfully');
  } catch (error) {
    console.error('[OAuth] Failed to open Google login browser:', error);
    throw error;
  }
};
