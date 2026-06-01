import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function isActive(status: string) {
  return status === 'active' || status === 'in_grace_period' || status === 'on_hold';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const txs = await base44.asServiceRole.entities.IapTransaction.filter({
      user_email: user.email,
    });

    const now = Date.now();
    const activeTxs = (txs || []).filter((tx: any) => {
      if (!isActive(tx.status || '')) return false;
      if (!tx.expires_at) return true;
      const expiry = new Date(tx.expires_at).getTime();
      return !Number.isNaN(expiry) && expiry > now;
    });

    activeTxs.sort((a: any, b: any) => {
      const aTime = a.expires_at ? new Date(a.expires_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.expires_at ? new Date(b.expires_at).getTime() : Number.MAX_SAFE_INTEGER;
      return bTime - aTime;
    });

    const latest = activeTxs[0] || null;

    return Response.json({
      success: true,
      user: {
        email: user.email,
        plan: user.plan || null,
        insights_plan: !!user.insights_plan,
        profileLimit: user.profileLimit ?? null,
        billingPlatform: user.billingPlatform || null,
      },
      entitlement: latest
        ? {
            active: true,
            platform: latest.platform,
            product_id: latest.product_id,
            status: latest.status,
            plan: latest.plan || user.plan || null,
            insights_plan: typeof latest.insights_plan === 'boolean' ? latest.insights_plan : !!user.insights_plan,
            profile_limit: latest.profile_limit ?? user.profileLimit ?? null,
            transaction_id: latest.transaction_id,
            original_transaction_id: latest.original_transaction_id,
            purchased_at: latest.purchased_at || null,
            expires_at: latest.expires_at || null,
            last_verified_at: latest.last_verified_at || null,
          }
        : {
            active: false,
            platform: null,
            product_id: null,
            status: null,
            plan: user.plan || null,
            insights_plan: !!user.insights_plan,
            profile_limit: user.profileLimit ?? null,
            transaction_id: null,
            original_transaction_id: null,
            purchased_at: null,
            expires_at: null,
            last_verified_at: null,
          },
      transaction_count: txs.length,
    });
  } catch (error) {
    console.error('getEntitlementStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
