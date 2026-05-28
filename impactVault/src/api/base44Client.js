import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Use the absolute backend URL as serverUrl when available.
// This is required for Capacitor/Android where relative paths resolve to
// the local WebView origin (https://localhost) instead of the real backend.
// In web dev/production the Vite proxy handles /api/* when appBaseUrl is absent.
const serverUrl = appBaseUrl || '';

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl
});
