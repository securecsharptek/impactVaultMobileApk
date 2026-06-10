import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { SignJWT, importPKCS8 } from 'npm:jose@5.9.3';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function mask(value?: string | null) {
  if (!value) return value;
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function parseJsonEnv(name: string, fallback: Record<string, unknown> = {}) {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function parsePem(pem?: string) {
  if (!pem) return '';
  return pem.replace(/\\n/g, '\n');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function decodeJwsPayload(jws: string) {
  const parts = jws.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid signed payload');
  }
  return JSON.parse(base64UrlDecode(parts[1]));
}

function toIsoDate(msOrIso?: string | number | null) {
  if (!msOrIso) return null;
  if (typeof msOrIso === 'number') {
    return new Date(msOrIso).toISOString();
  }
  if (/^\d+$/.test(msOrIso)) {
    const n = Number(msOrIso);
    return new Date(n).toISOString();
  }
  const date = new Date(msOrIso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function getGoogleAccessToken() {
  const serviceAccountEmail = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL');
  const privateKeyPem = parsePem(Deno.env.get('GOOGLE_PLAY_PRIVATE_KEY'));

  if (!serviceAccountEmail || !privateKeyPem) {
    throw new Error('Missing Google Play credentials: GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL / GOOGLE_PLAY_PRIVATE_KEY');
  }

  const privateKey = await importPKCS8(privateKeyPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/androidpublisher',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccountEmail)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Google auth failed: ${tokenJson.error_description || tokenJson.error || 'unknown error'}`);
  }

  return tokenJson.access_token as string;
}

async function verifyAndroidPurchase({ packageName, purchaseToken }: { packageName: string; purchaseToken: string }) {
  if (!packageName || !purchaseToken) {
    throw new Error('Android verification requires packageName and purchaseToken');
  }

  console.log('[IAP][Backend] Verifying Android purchase', {
    packageName,
    purchaseToken: mask(purchaseToken),
  });

  const accessToken = await getGoogleAccessToken();
  const endpoint = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google verification failed: ${data.error?.message || 'unknown error'}`);
  }

  console.log('[IAP][Backend] Android verification response received', {
    productId: data?.lineItems?.[0]?.productId,
    latestOrderId: data?.latestOrderId,
    subscriptionState: data?.subscriptionState,
  });

  const lineItem = data.lineItems?.[0] || {};
  const expiryTime = lineItem.expiryTime || null;
  const purchaseTime = lineItem.startTime || data.startTime || null;
  const productId = lineItem.productId || null;
  const transactionId = data.latestOrderId || purchaseToken;
  const originalTransactionId = data.externalAccountIdentifiers?.obfuscatedExternalAccountId || transactionId;

  const state = data.subscriptionState || 'UNKNOWN';
  let status = 'unknown';
  if (state === 'SUBSCRIPTION_STATE_ACTIVE') status = 'active';
  if (state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') status = 'in_grace_period';
  if (state === 'SUBSCRIPTION_STATE_ON_HOLD') status = 'on_hold';
  if (state === 'SUBSCRIPTION_STATE_CANCELED' || state === 'SUBSCRIPTION_STATE_EXPIRED') status = 'expired';

  return {
    platform: 'android',
    productId,
    transactionId,
    originalTransactionId,
    purchasedAt: toIsoDate(purchaseTime),
    expiresAt: toIsoDate(expiryTime),
    status,
    rawStoreState: state,
  };
}

async function getAppleToken() {
  const issuerId = Deno.env.get('APPLE_ISSUER_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID');
  const privateKeyPem = parsePem(Deno.env.get('APPLE_PRIVATE_KEY'));

  if (!issuerId || !keyId || !bundleId || !privateKeyPem) {
    throw new Error('Missing Apple credentials: APPLE_ISSUER_ID / APPLE_KEY_ID / APPLE_BUNDLE_ID / APPLE_PRIVATE_KEY');
  }

  const privateKey = await importPKCS8(privateKeyPem, 'ES256');
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({ bid: bundleId })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setAudience('appstoreconnect-v1')
    .setIssuedAt(now)
    .setExpirationTime(now + 1200)
    .sign(privateKey);
}

async function verifyApplePurchase({ transactionId, useSandbox }: { transactionId: string; useSandbox: boolean }) {
  if (!transactionId) {
    throw new Error('iOS verification requires transactionId');
  }

  console.log('[IAP][Backend] Verifying Apple purchase', {
    transactionId,
    useSandbox,
  });

  const token = await getAppleToken();
  const host = useSandbox ? 'https://api.storekit-sandbox.itunes.apple.com' : 'https://api.storekit.itunes.apple.com';
  const endpoint = `${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Apple verification failed: ${data.errorMessage || data.errorCode || 'unknown error'}`);
  }

  console.log('[IAP][Backend] Apple verification response received', {
    hasSignedTransactionInfo: !!data?.signedTransactionInfo,
    useSandbox,
  });

  const txInfo = decodeJwsPayload(data.signedTransactionInfo);
  const expiresAt = toIsoDate(txInfo.expiresDate || null);
  const purchasedAt = toIsoDate(txInfo.purchaseDate || null);

  let status = 'active';
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    status = 'expired';
  }

  return {
    platform: 'ios',
    productId: txInfo.productId,
    transactionId: txInfo.transactionId,
    originalTransactionId: txInfo.originalTransactionId || txInfo.transactionId,
    purchasedAt,
    expiresAt,
    status,
    rawStoreState: txInfo.type || 'AUTO_RENEWABLE_SUBSCRIPTION',
  };
}

function resolveEntitlement(productId: string, mapping: Record<string, any>) {
  const configured = mapping[productId];
  if (configured && typeof configured === 'object') {
    return {
      plan: configured.plan || null,
      insightsPlan: !!configured.insights_plan,
      profileLimit: configured.profile_limit ?? null,
    };
  }

  const normalized = (productId || '').toLowerCase();
  if (normalized.includes('insights')) {
    return { plan: null, insightsPlan: true, profileLimit: null };
  }
  if (normalized.includes('family')) {
    return { plan: 'Family', insightsPlan: false, profileLimit: 3 };
  }

  return { plan: 'Core', insightsPlan: false, profileLimit: 1 };
}

async function upsertTransaction(base44: any, tx: Record<string, any>) {
  const existing = await base44.asServiceRole.entities.IapTransaction.filter({
    platform: tx.platform,
    transaction_id: tx.transaction_id,
  });

  console.log('[IAP][Backend] Upserting IAP transaction', {
    platform: tx.platform,
    transactionId: tx.transaction_id,
    existingCount: existing.length,
    user: tx.user_email,
    productId: tx.product_id,
    status: tx.status,
  });

  if (existing.length > 0) {
    await base44.asServiceRole.entities.IapTransaction.update(existing[0].id, tx);
    console.log('[IAP][Backend] Updated existing IAP transaction', {
      id: existing[0].id,
      transactionId: tx.transaction_id,
    });
    return;
  }

  await base44.asServiceRole.entities.IapTransaction.create(tx);
  console.log('[IAP][Backend] Created new IAP transaction', {
    transactionId: tx.transaction_id,
    productId: tx.product_id,
  });
}

Deno.serve(async (req: Request) => {
  try {
    console.log('[IAP][Backend] verifyInAppPurchase request received');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const platform = (body.platform || '').toLowerCase();
    const packageName = body.packageName || Deno.env.get('ANDROID_PACKAGE_NAME') || '';
    const purchaseToken = body.purchaseToken || '';
    const appleTransactionId = body.transactionId || '';
    const useSandbox = !!body.useSandbox;
    const fallbackProductId = body.productId || '';

    console.log('[IAP][Backend] Parsed request payload', {
      user: user.email,
      platform,
      packageName,
      purchaseToken: mask(purchaseToken),
      transactionId: appleTransactionId,
      useSandbox,
      fallbackProductId,
    });

    if (platform !== 'ios' && platform !== 'android') {
      return Response.json({ error: 'platform must be ios or android' }, { status: 400 });
    }

    const verified = platform === 'ios'
      ? await verifyApplePurchase({ transactionId: appleTransactionId, useSandbox })
      : await verifyAndroidPurchase({ packageName, purchaseToken });

    console.log('[IAP][Backend] Store verification completed', {
      platform,
      verifiedProductId: verified.productId,
      transactionId: verified.transactionId,
      originalTransactionId: verified.originalTransactionId,
      status: verified.status,
      expiresAt: verified.expiresAt,
    });

    const productId = verified.productId || fallbackProductId;
    if (!productId) {
      return Response.json({ error: 'Could not resolve product ID from verification response' }, { status: 400 });
    }

    const productMap = parseJsonEnv('IAP_PRODUCT_MAP', {});
    const entitlement = resolveEntitlement(productId, productMap as Record<string, any>);

    console.log('[IAP][Backend] Entitlement resolved', {
      productId,
      entitlement,
    });

    const userUpdates: Record<string, unknown> = {
      activatedAt: new Date().toISOString(),
      billingPlatform: platform,
    };

    if (entitlement.plan) {
      userUpdates.plan = entitlement.plan;
    }
    if (typeof entitlement.insightsPlan === 'boolean') {
      userUpdates.insights_plan = entitlement.insightsPlan;
    }
    if (typeof entitlement.profileLimit === 'number') {
      userUpdates.profileLimit = entitlement.profileLimit;
    }

    if (verified.status === 'active' || verified.status === 'in_grace_period' || verified.status === 'on_hold') {
      console.log('[IAP][Backend] Updating user entitlement fields', {
        user: user.email,
        userUpdates,
      });
      await base44.auth.updateMe(userUpdates);
    }

    const tokenHash = platform === 'android' && purchaseToken
      ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(purchaseToken)).then((buffer) =>
          Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
        )
      : null;

    await upsertTransaction(base44, {
      user_email: user.email,
      platform,
      product_id: productId,
      transaction_id: verified.transactionId,
      original_transaction_id: verified.originalTransactionId,
      purchase_token_hash: tokenHash,
      status: verified.status,
      plan: entitlement.plan,
      insights_plan: entitlement.insightsPlan,
      profile_limit: entitlement.profileLimit,
      purchased_at: verified.purchasedAt,
      expires_at: verified.expiresAt,
      last_verified_at: new Date().toISOString(),
      raw_store_state: verified.rawStoreState,
    });

    console.log('[IAP][Backend] Verification flow completed successfully', {
      user: user.email,
      platform,
      productId,
      transactionId: verified.transactionId,
      status: verified.status,
    });

    return Response.json({
      success: true,
      platform,
      productId,
      entitlement: {
        plan: entitlement.plan,
        insights_plan: entitlement.insightsPlan,
        profile_limit: entitlement.profileLimit,
      },
      verification: {
        transaction_id: verified.transactionId,
        original_transaction_id: verified.originalTransactionId,
        status: verified.status,
        purchased_at: verified.purchasedAt,
        expires_at: verified.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('[IAP][Backend] verifyInAppPurchase error:', error?.message || error);
    return Response.json({ error: error?.message || 'Unknown verification error' }, { status: 500 });
  }
});
