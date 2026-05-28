import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Shared Email Helpers ─────────────────────────────────────────────────────

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/a6b63ebfa_Impactvault-whitebackground.jpg';

const wrap = (innerHtml) => `
<div style="background:#F4F2F0;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#3f3f3f;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#B6ADA5;padding:22px 24px;text-align:center;">
      <img src="${LOGO_URL}" alt="Impact Vault" style="height:52px;width:auto;border-radius:8px;display:inline-block;" />
    </div>
    <div style="padding:36px 32px;">
      ${innerHtml}
    </div>
    <div style="background:#F4F2F0;padding:20px 32px;text-align:center;border-top:1px solid #e7e5e4;">
      <p style="margin:0;font-size:13px;color:#999;font-weight:600;">Impact Vault</p>
      <p style="margin:4px 0 0 0;font-size:12px;color:#bbb;">Capture real life. Track what matters. Advocate with confidence.</p>
      <p style="margin:8px 0 0 0;font-size:12px;color:#bbb;">Questions? <a href="mailto:support@impactvault.com.au" style="color:#B6ADA5;text-decoration:none;">support@impactvault.com.au</a></p>
    </div>
  </div>
</div>`;

const cta = (label, url = 'https://app.impactvault.com.au') =>
  `<div style="margin:28px 0;text-align:center;">
    <a href="${url}" style="background:#B6ADA5;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:700;font-size:15px;">${label}</a>
  </div>`;

const infoBox = (content, color = '#F9F8F7', borderColor = '#B6ADA5') =>
  `<div style="background:${color};padding:18px 20px;border-radius:10px;margin:20px 0;border-left:4px solid ${borderColor};">${content}</div>`;

const tip = (emoji, text) =>
  `<li style="margin-bottom:10px;list-style:none;"><span style="font-size:16px;margin-right:8px;">${emoji}</span>${text}</li>`;

const listBlock = (label, items) => `
  <div style="background:#F9F8F7;padding:20px;border-radius:10px;margin:20px 0;">
    <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">${label}</p>
    <ul style="margin:0;padding:0;">${items}</ul>
  </div>`;

// ─── Email Templates ──────────────────────────────────────────────────────────

const templates = {

  day_2_quickstart: (name) => ({
    subject: 'Your quick-start guide to Impact Vault',
    body: wrap(`
      <h2 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#292524;">Getting started in 3 easy steps</h2>
      <p style="margin:0 0 20px 0;font-size:14px;color:#78716c;">Here's how to hit the ground running</p>
      <p>Hi ${name || 'there'},</p>
      <p>Thanks for joining Impact Vault. Here's how to get set up quickly so you can start capturing meaningful evidence right away.</p>
      ${listBlock('Step-by-step setup', `
        ${tip('👤', '<strong>Create a Person Profile</strong> — add the person\'s name, DOB, diagnoses, and support plan dates. This is your foundation.')}
        ${tip('🎯', '<strong>Add Goals & Supports</strong> — create one goal per goal in the support plan. Link strategies and who is supporting.')}
        ${tip('📝', '<strong>Log your first Impact Entry</strong> — don\'t wait for a "big" event. Even minor daily incidents build powerful evidence over time.')}
      `)}
      ${infoBox('<p style="margin:0;font-size:14px;color:#57534e;">💡 <strong>Pro tip:</strong> Use your phone\'s microphone to dictate entries. Tap the microphone icon on your keyboard and speak — it types for you in every field.</p>')}
      ${cta('Open Impact Vault →')}
    `)
  }),

  day_5_impact_tips: (name) => ({
    subject: 'Getting the most from your Impact Log',
    body: wrap(`
      <h2 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#292524;">Your Impact Log — tips for stronger evidence</h2>
      <p style="margin:0 0 20px 0;font-size:14px;color:#78716c;">The heart of Impact Vault</p>
      <p>Hi ${name || 'there'},</p>
      <p>The Impact Log is the most powerful tool in your vault. Here's how to use it well so that when plan review time comes, your evidence is undeniable.</p>
      ${listBlock('Make your entries count', `
        ${tip('📊', '<strong>Use the severity scale honestly.</strong> 1 = minor disruption. 5 = severe event needing immediate intervention. Consistent scoring shows patterns clearly.')}
        ${tip('📝', '<strong>Fill in Functional Impact.</strong> Don\'t just say "meltdown" — describe what happened and how it affected the person\'s daily functioning and support needs.')}
        ${tip('⏰', '<strong>Record the time of day.</strong> Morning vs evening patterns help identify triggers and inform strategies — especially for therapists and schools.')}
        ${tip('🔗', '<strong>Link entries to goals.</strong> When an incident is related to a specific plan goal, linking it strengthens your case for continued or increased support.')}
        ${tip('📷', '<strong>Attach evidence.</strong> Photos, screenshots, school notes — attach them directly to a log entry for strong, connected documentation.')}
      `)}
      ${cta('Go to Impact Log →')}
    `)
  }),

  day_10_evidence: (name) => ({
    subject: 'Building your evidence library — ready for any review',
    body: wrap(`
      <h2 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#292524;">Evidence & Reports — your advocacy toolkit</h2>
      <p style="margin:0 0 20px 0;font-size:14px;color:#78716c;">Be prepared for every meeting</p>
      <p>Hi ${name || 'there'},</p>
      <p>By now you may have a few entries logged. Here's how to turn that data into a powerful evidence package — ready for therapists, support coordinators, or plan reviews.</p>
      ${listBlock('Evidence Library tips', `
        ${tip('📎', 'Upload school reports, therapy notes, and medical letters as you receive them — don\'t let them get lost.')}
        ${tip('📱', 'Screenshot emails, WhatsApp messages, or texts that document incidents or concerns — upload them directly.')}
        ${tip('🔗', 'Link each file to a person and a plan goal so they\'re easy to find at review time.')}
      `)}
      ${listBlock('Reports tips', `
        ${tip('📅', 'Set your date range to cover the period leading up to your next review — usually 3 to 6 months.')}
        ${tip('📄', 'Download the PDF and email it directly to your support coordinator or therapist before appointments.')}
        ${tip('📧', 'Use the "Email Report" option to send it straight from the app — no downloading needed.')}
      `)}
      ${cta('Open Evidence Library →')}
    `)
  }),

  day_21_checkin: (name) => ({
    subject: 'How are you going with Impact Vault?',
    body: wrap(`
      <h2 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#292524;">A quick check-in 👋</h2>
      <p style="margin:0 0 20px 0;font-size:14px;color:#78716c;">Three weeks in — you're doing great</p>
      <p>Hi ${name || 'there'},</p>
      <p>Three weeks ago you joined Impact Vault. Whether you've been logging consistently or just getting started, we want you to know — every entry counts.</p>
      <p>Families who log consistently for 4+ weeks have <strong>significantly stronger evidence</strong> at plan reviews. The data speaks for itself when you have a clear, dated record of real-life impact.</p>
      ${infoBox('<p style="margin:0;font-size:14px;color:#78350f;"><strong>Quick reminder:</strong> You can log quickly using the <strong>Quick Capture</strong> cards on your Dashboard — just tap a category and add a brief note. No need to fill in every field every time.</p>', '#FEF9F3', '#D97706')}
      <p>Have a question or want to share how it's going? Reply to this email or reach us at <a href="mailto:support@impactvault.com.au" style="color:#B6ADA5;font-weight:600;">support@impactvault.com.au</a> — we read every message.</p>
      ${cta('Go to Dashboard →')}
    `)
  }),

  day_30_milestone: (name, planName) => ({
    subject: "One month with Impact Vault — you're building something powerful",
    body: wrap(`
      <h2 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#292524;">🎉 One month in</h2>
      <p style="margin:0 0 20px 0;font-size:14px;color:#78716c;">You're building real evidence</p>
      <p>Hi ${name || 'there'},</p>
      <p>You've had Impact Vault for a full month. Even if life has been busy, any data you've logged is more than you had before — and it's all safely stored, ready to use.</p>
      ${infoBox(`
        <p style="margin:0 0 10px 0;font-size:14px;font-weight:600;color:#292524;">Here's what consistent logging helps you do:</p>
        <p style="margin:0;font-size:14px;color:#57534e;line-height:1.8;">
          ✓ Show functional impact patterns to therapists and specialists<br>
          ✓ Demonstrate support needs clearly at plan reviews<br>
          ✓ Justify continued or increased support with real evidence<br>
          ✓ Reduce the stress of "trying to remember" at appointments
        </p>
      `)}
      ${!planName?.toLowerCase().includes('insights') ? infoBox(`
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#92400e;">Unlock deeper pattern analysis with Insights ✨</p>
        <p style="margin:0 0 14px 0;font-size:14px;color:#78350f;">The Insights add-on identifies functional impact patterns, support need triggers, and time-of-day trends automatically from your logged data.</p>
        <a href="https://app.impactvault.com.au/pricing" style="background:#D97706;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;">Add Insights from $9/month →</a>
      `, '#FFFBEB', '#D97706') : ''}
      <p>Keep going — you're doing something important for the person you support.</p>
      ${cta('Open Impact Vault →')}
    `)
  }),

};

export { templates, wrap };

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    const pending = await base44.asServiceRole.entities.EmailLog.filter({
      sent: false,
      scheduled_date: { $lte: today }
    });

    console.log(`Found ${pending.length} pending drip emails to send`);

    let sent = 0;
    for (const log of pending) {
      const templateFn = templates[log.template_key];
      if (!templateFn) { console.warn(`Unknown template: ${log.template_key}`); continue; }

      const email = templateFn(log.user_name, log.plan_name);

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: log.user_email,
        subject: email.subject,
        body: email.body,
        from_name: 'Impact Vault',
      });

      await base44.asServiceRole.entities.EmailLog.update(log.id, {
        sent: true,
        sent_at: new Date().toISOString(),
      });

      console.log(`Sent "${log.template_key}" to ${log.user_email}`);
      sent++;
    }

    return Response.json({ success: true, sent, total: pending.length });
  } catch (error) {
    console.error('sendDripEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});