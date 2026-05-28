import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, planName, insightsPriceId, insightsPlanName } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'Price ID required' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const origin = req.headers.get('origin') || 'https://app.impactvault.com';

    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('mode', 'subscription');
    params.append('success_url', `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${origin}/?checkout=cancel`);
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[plan_name]', planName || '');
    params.append('metadata[base44_app_id]', Deno.env.get('BASE44_APP_ID') || '');

    if (insightsPriceId) {
      params.append('line_items[1][price]', insightsPriceId);
      params.append('line_items[1][quantity]', '1');
      params.append('metadata[insights_plan_name]', insightsPlanName || '');
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe error:', session.error?.message);
      return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 400 });
    }

    console.log(`Checkout session created: ${session.id} for plan: ${planName}`);
    return Response.json({ url: session.url });

  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});