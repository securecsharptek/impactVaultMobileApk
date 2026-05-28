import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Retrieve Stripe session via REST API (no heavy npm:stripe package)
    const sessionRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=customer_details`,
      { headers: { 'Authorization': `Bearer ${stripeKey}` } }
    );
    const session = await sessionRes.json();

    if (!sessionRes.ok) {
      console.error('Stripe API error:', session.error?.message);
      return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 400 });
    }

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Verify the session belongs to the authenticated user (prevent session hijacking)
    const sessionEmail = session.customer_details?.email?.toLowerCase();
    if (sessionEmail && sessionEmail !== user.email.toLowerCase()) {
      console.error(`Session email mismatch: ${sessionEmail} vs ${user.email}`);
      return Response.json({ error: 'Session does not belong to this user' }, { status: 403 });
    }

    const planName = session.metadata?.plan_name || 'Core';
    const contributionAmount = parseInt(session.metadata?.contribution_amount || '0');
    const isInsights = planName.toLowerCase().includes('insights');
    const hasInsightsAddon = !!session.metadata?.insights_plan_name;
    const isFounder = planName.toLowerCase().includes('founding');

    let profileLimit = 1;
    if (planName.toLowerCase().includes('family')) {
      profileLimit = 3;
    }

    // Update user plan
    const updates = {
      plan: planName,
      stripeSessionId: sessionId,
      activatedAt: new Date().toISOString(),
    };

    if (isInsights) {
      updates.insights_plan = true;
    } else {
      updates.profileLimit = profileLimit;
      if (isFounder) {
        updates.founderMember = true;
        updates.lifetimeAccess = true;
      }
      if (hasInsightsAddon) {
        updates.insights_plan = true;
      }
    }

    await base44.auth.updateMe(updates);
    console.log(`Plan activated for ${user.email}: ${planName}`);

    // Increment founding counter
    if (isFounder) {
      try {
        const counters = await base44.asServiceRole.entities.FoundingCounter.list();
        if (counters.length === 0) {
          await base44.asServiceRole.entities.FoundingCounter.create({
            purchase_count: 1,
            is_active: true,
            last_updated: new Date().toISOString()
          });
        } else {
          const counter = counters[0];
          const newCount = counter.purchase_count + 1;
          await base44.asServiceRole.entities.FoundingCounter.update(counter.id, {
            purchase_count: newCount,
            is_active: newCount < 100,
            last_updated: new Date().toISOString()
          });
          console.log(`Founding purchase recorded. Total: ${newCount}/100`);
        }
      } catch (err) {
        console.error('Error updating founding counter:', err.message);
      }
    }

    // Send confirmation email
    const isFounderPlan = planName.toLowerCase().includes('founding');
    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #3f3f3f; line-height: 1.6; max-width: 600px;">
        <div style="background: #B6ADA5; color: white; padding: 32px 24px; border-radius: 12px; margin-bottom: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 700;">Welcome to Impact Vault 🎉</h1>
          <p style="margin: 12px 0 0 0; font-size: 16px; opacity: 0.95;">Your <strong>${isFounderPlan ? 'Founding' : planName}</strong> plan is now active.</p>
        </div>
        <p style="font-size: 15px;">Hi ${user.full_name || 'there'},</p>
        <p style="font-size: 15px;">Thanks for ${isFounderPlan ? 'becoming an early supporter of Impact Vault.' : 'choosing Impact Vault.'} You're ready to start capturing real-life impact and building meaningful evidence.</p>
        <div style="background: #F9F8F7; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #78716c; text-transform: uppercase;">Your plan includes:</p>
          <ul style="margin: 0; padding-left: 20px; list-style: none;">
            ${isInsights ? `
              <li style="margin-bottom: 8px;">✓ Insights dashboard &amp; pattern detection</li>
              <li style="margin-bottom: 8px;">✓ Trigger analysis across all entries</li>
              <li style="margin-bottom: 8px;">✓ Time-of-day trends &amp; deep insights</li>
              <li style="margin-bottom: 0;">✓ Advanced report summaries</li>
            ` : `
              <li style="margin-bottom: 8px;">✓ ${profileLimit} person profile${profileLimit > 1 ? 's' : ''}</li>
              <li style="margin-bottom: 8px;">✓ Daily impact logging</li>
              <li style="margin-bottom: 8px;">✓ Evidence uploads &amp; organisation</li>
              <li style="margin-bottom: ${isFounderPlan ? '8px' : '0;'};">✓ Professional advocacy reports</li>
              ${isFounderPlan ? '<li style="margin-bottom: 0;"><strong>✓ Lifetime access — no renewal fees</strong></li>' : ''}
            `}
          </ul>
        </div>
        ${contributionAmount > 0 ? `<p style="font-size: 14px; color: #57534e; background: #FEF9F3; padding: 12px 16px; border-radius: 6px; border-left: 3px solid #D97706;">Thank you also for your optional support contribution of <strong>$${contributionAmount} AUD</strong>. An invoice will be sent to you shortly.</p>` : ''}
        <div style="margin: 32px 0;">
          <a href="https://app.impactvault.com" style="background: #B6ADA5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 15px;">Go to Your Dashboard</a>
        </div>
        <div style="background: #F4F2F0; padding: 16px; border-radius: 8px; margin: 32px 0; border-left: 4px solid #B6ADA5;">
          <p style="margin: 0; font-weight: 600; margin-bottom: 6px;">Need help getting started?</p>
          <p style="margin: 0; font-size: 14px;">Visit the Help section in your app or contact us at <a href="mailto:support@impactvault.com.au" style="color: #B6ADA5; text-decoration: none; font-weight: 600;">support@impactvault.com.au</a></p>
        </div>
        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e7e5e4;">
          <p style="margin: 0; font-size: 13px; color: #999;">
            <strong>Impact Vault</strong><br>
            Capture real life. Track what matters. Advocate with confidence.
          </p>
        </div>
        <p style="color: #ccc; font-size: 11px; margin-top: 24px; text-align: center;">
          Session ID: ${sessionId} · This is an automated confirmation. Please keep this email for your records.
        </p>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `Welcome to Impact Vault — ${planName} Activated`,
      body: emailBody,
      from_name: "Impact Vault"
    });

    console.log(`Confirmation email sent to ${user.email}`);

    // Queue drip email sequence
    try {
      const baseDate = new Date();
      const addDays = (d) => {
        const dt = new Date(baseDate);
        dt.setDate(dt.getDate() + d);
        return dt.toISOString().split('T')[0];
      };
      const drip = [
        { template_key: 'day_2_quickstart', days: 2 },
        { template_key: 'day_5_impact_tips', days: 5 },
        { template_key: 'day_10_evidence', days: 10 },
        { template_key: 'day_21_checkin', days: 21 },
        { template_key: 'day_30_milestone', days: 30 },
      ];
      for (const item of drip) {
        await base44.asServiceRole.entities.EmailLog.create({
          user_email: user.email,
          user_name: user.full_name || '',
          template_key: item.template_key,
          scheduled_date: addDays(item.days),
          plan_name: planName,
          sent: false,
        });
      }
      console.log(`Queued ${drip.length} drip emails for ${user.email}`);
    } catch (err) {
      console.error('Error queuing drip emails:', err.message);
    }

    // Sync to Xero (fire and forget — don't block response)
    base44.asServiceRole.functions.invoke('syncOrderToXero', {
      sessionId,
      planName,
      contributionAmount,
      userEmail: user.email,
      userName: user.full_name || user.email,
    }).catch(err => console.error('Xero sync failed:', err.message));

    return Response.json({ success: true, plan: planName, profileLimit });
  } catch (error) {
    console.error('Payment success handler error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});