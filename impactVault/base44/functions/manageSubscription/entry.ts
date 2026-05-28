import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json();
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const origin = req.headers.get('origin') || 'https://app.impactvault.com';

    // --- Helper: get or fetch Stripe customer ID from stored session ---
    let customerId = user.stripeCustomerId || null;
    let subscriptionId = user.stripeSubscriptionId || null;

    if ((!customerId || !subscriptionId) && user.stripeSessionId) {
      const sessionRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${user.stripeSessionId}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const session = await sessionRes.json();
      if (session.customer) {
        customerId = session.customer;
        await base44.auth.updateMe({ stripeCustomerId: customerId });
      }
      if (session.subscription) {
        subscriptionId = session.subscription;
        await base44.auth.updateMe({ stripeSubscriptionId: subscriptionId });
      }
    }

    // --- Action: Open Stripe Billing Portal ---
    if (action === 'portal') {
      if (!customerId) {
        return Response.json({ error: 'No billing account found. If you purchased recently, please try again in a moment.' }, { status: 400 });
      }
      const portalParams = new URLSearchParams({
        customer: customerId,
        return_url: `${origin}/?page=Help`,
      });
      const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: portalParams,
      });
      const portal = await portalRes.json();
      if (!portalRes.ok) {
        console.error('Portal error:', portal.error?.message);
        return Response.json({ error: portal.error?.message || 'Could not open billing portal' }, { status: 400 });
      }
      return Response.json({ url: portal.url });
    }

    // --- Action: Cancel Insights (cancel at period end + clear flag) ---
    if (action === 'cancel_insights') {
      if (subscriptionId) {
        const cancelRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ cancel_at_period_end: 'true' }),
        });
        const cancelled = await cancelRes.json();
        console.log('Insights subscription cancel_at_period_end set:', cancelled.id);
      }
      await base44.auth.updateMe({ insights_plan: false });
      console.log(`Insights cancelled for ${user.email}`);
      return Response.json({ success: true, message: 'Insights plan cancelled. Access removed immediately.' });
    }

    // --- Action: Cancel Entire Plan ---
    if (action === 'cancel_all') {
      if (subscriptionId) {
        // Cancel immediately at period end
        await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ cancel_at_period_end: 'true' }),
        });
        console.log(`Subscription ${subscriptionId} set to cancel at period end for ${user.email}`);
      }
      // Also check for any other active subscriptions linked to the customer
      if (customerId) {
        const subsRes = await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=10`,
          { headers: { Authorization: `Bearer ${stripeKey}` } }
        );
        const subs = await subsRes.json();
        for (const sub of subs.data || []) {
          await fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ cancel_at_period_end: 'true' }),
          });
        }
      }
      // Clear plan data immediately
      await base44.auth.updateMe({
        plan: null,
        insights_plan: false,
        profileLimit: null,
        founderMember: null,
        lifetimeAccess: null,
        stripeSubscriptionId: null,
      });
      console.log(`Plan fully cancelled for ${user.email}`);

      // Send cancellation email
      const cancelEmailBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #3f3f3f; line-height: 1.6; max-width: 600px;">
          <div style="background: #78716c; color: white; padding: 32px 24px; border-radius: 12px; margin-bottom: 32px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Your Impact Vault subscription has been cancelled</h1>
          </div>
          <p style="font-size: 15px;">Hi ${user.full_name || 'there'},</p>
          <p style="font-size: 15px;">We've processed your cancellation. Your billing has stopped and you will not be charged again.</p>
          <div style="background: #F9F8F7; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #78716c; text-transform: uppercase;">What happens next</p>
            <ul style="margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px; font-size: 14px;">Your account access has been removed.</li>
              <li style="margin-bottom: 8px; font-size: 14px;">Your data is retained for 30 days in case you change your mind.</li>
              <li style="margin-bottom: 0; font-size: 14px;">After 30 days, all data is permanently deleted.</li>
            </ul>
          </div>
          <p style="font-size: 15px;">We're sorry to see you go. If there was something we could have done better, we'd genuinely love to hear it — reply to this email or contact us at <a href="mailto:support@impactvault.com.au" style="color: #B6ADA5; font-weight: 600;">support@impactvault.com.au</a>.</p>
          <p style="font-size: 15px;">If you'd like to reactivate in the future, you're always welcome back.</p>
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e7e5e4;">
            <p style="margin: 0; font-size: 13px; color: #999;"><strong>Impact Vault</strong><br>Capture real life. Track what matters. Advocate with confidence.</p>
          </div>
        </div>
      `;
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Your Impact Vault subscription has been cancelled',
        body: cancelEmailBody,
        from_name: 'Impact Vault',
      });
      console.log(`Cancellation email sent to ${user.email}`);

      return Response.json({ success: true, message: 'Your plan has been cancelled. Billing will stop at the end of your current period.' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('manageSubscription error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});