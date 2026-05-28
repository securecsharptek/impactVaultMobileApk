import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@16.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userEmail = session.metadata?.user_email;
      const planName = session.metadata?.plan_name || '';
      const isInsights = planName.toLowerCase().includes('insights');

      if (!userEmail) {
        console.warn('No user_email in session metadata');
        return Response.json({ received: true });
      }

      if (isInsights) {
        // Find user and grant insights access
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            insights_plan: true,
            insights_activated_at: new Date().toISOString(),
          });
          console.log(`Insights activated for ${userEmail}`);
        }
      } else {
        // Core plan - set profileLimit
        const profileLimit = planName.toLowerCase().includes('family') ? 5 : 1;
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            plan: planName,
            profileLimit,
            activatedAt: new Date().toISOString(),
          });
          console.log(`Core plan activated for ${userEmail}: ${planName}`);
        }
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      // Only notify for recurring renewals, not the initial payment (handled by checkout.session.completed)
      if (invoice.billing_reason === 'subscription_cycle') {
        const customerEmail = invoice.customer_email;
        const amountPaid = (invoice.amount_paid / 100).toFixed(2);
        const currency = (invoice.currency || 'aud').toUpperCase();
        const planDescription = invoice.lines?.data?.[0]?.description || 'Impact Vault subscription';
        const nextDate = invoice.lines?.data?.[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
          : null;

        if (customerEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: customerEmail,
            subject: `Your Impact Vault renewal — $${amountPaid} ${currency}`,
            body: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#3f3f3f;max-width:520px;margin:0 auto;padding:32px 16px;">
  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/a6b63ebfa_Impactvault-whitebackground.jpg" alt="Impact Vault" style="height:48px;border-radius:8px;margin-bottom:24px;" />
  <h2 style="font-size:20px;font-weight:700;color:#292524;margin:0 0 8px;">Your subscription has renewed</h2>
  <p style="color:#78716c;margin:0 0 20px;">Thanks for continuing with Impact Vault. Here's your renewal summary:</p>
  <div style="background:#F9F8F7;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="margin:0 0 8px;"><strong>Plan:</strong> ${planDescription}</p>
    <p style="margin:0 0 8px;"><strong>Amount charged:</strong> $${amountPaid} ${currency}</p>
    ${nextDate ? `<p style="margin:0;"><strong>Next renewal:</strong> ${nextDate}</p>` : ''}
  </div>
  <p style="color:#78716c;font-size:14px;">If you have any questions about your billing, reply to this email or contact us at <a href="mailto:support@impactvault.com.au" style="color:#B6ADA5;">support@impactvault.com.au</a>.</p>
  <div style="margin-top:24px;">
    <a href="https://app.impactvault.com.au" style="background:#B6ADA5;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Open Impact Vault →</a>
  </div>
</div>`,
          });
          console.log(`Renewal email sent to ${customerEmail} for $${amountPaid}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      // Subscription cancelled — revoke insights access
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Look up customer email
      const customer = await stripe.customers.retrieve(customerId);
      const userEmail = customer.email;

      if (userEmail) {
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            insights_plan: false,
          });
          console.log(`Insights revoked for ${userEmail} (subscription cancelled)`);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});