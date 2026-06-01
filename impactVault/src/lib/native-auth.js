import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { getLoginUrl } from '@base44/sdk/dist/utils/auth-utils';
import { appParams } from '@/lib/app-params';

const DEFAULT_NATIVE_AUTH_SCHEME = 'com.vault.impactVault';
const DEFAULT_NATIVE_AUTH_HOST = 'auth';

const getAuthScheme = () => import.meta.env.VITE_NATIVE_AUTH_SCHEME || DEFAULT_NATIVE_AUTH_SCHEME;
const getAuthHost = () => import.meta.env.VITE_NATIVE_AUTH_HOST || DEFAULT_NATIVE_AUTH_HOST;

const toStorageKey = (paramName) => `base44_${paramName}`;
const isAuthCallbackUrl = (url) => url?.startsWith(`${getAuthScheme()}://`);

export const isNativeRuntime = () => Capacitor.isNativePlatform();

export const getNativeAuthRedirectUrl = () => `${getAuthScheme()}://${getAuthHost()}`;

/**
 * Get the platform type for in-app purchases
 * @returns {string|null} 'ios', 'android', or null if not native
 */
export const getPlatform = () => {
  if (!isNativeRuntime()) return null;
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
  return null;
};

/**
 * Get receipt/transaction data from native IAP plugin
 * This will be implemented when InAppPurchase plugin is integrated
 * @returns {Promise<{purchaseToken?: string, transactionId?: string}>}
 */
export const getNativeReceipt = async () => {
  if (!isNativeRuntime()) {
    throw new Error('getNativeReceipt is only available on native platforms');
  }
  
  // TODO: Implement when InAppPurchase Capacitor plugin is integrated
  // Example implementation:
  // const { InAppPurchase } = window;
  // if (!InAppPurchase) throw new Error('InAppPurchase plugin not available');
  // return await InAppPurchase.getReceipt();
  
  console.warn('[Purchase] getNativeReceipt stub - awaiting IAP plugin integration');
  return {};
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
