import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SEVERITY_LABEL = (s) => s >= 4 ? "High" : s >= 3 ? "Moderate" : "Low";
const SEVERITY_COLOR = (s) => s >= 4 ? "#ef4444" : s >= 3 ? "#d97706" : "#10b981";

const TIME_BLOCKS = {
  morning: "Morning (6am–12pm)",
  afternoon: "Afternoon (12pm–5pm)",
  evening: "Evening (5pm–9pm)",
  night: "Night (9pm–6am)",
};

function buildEmailHTML(user, participant, weekLogs, prevWeekLogs, goals) {
  const name = user.full_name || user.email;
  const pName = participant?.name || "your participant";

  const totalThis = weekLogs.length;
  const totalPrev = prevWeekLogs.length;
  const avgSev = totalThis ? (weekLogs.reduce((s, i) => s + i.severity, 0) / totalThis).toFixed(1) : 0;
  const avgSevPrev = totalPrev ? (prevWeekLogs.reduce((s, i) => s + i.severity, 0) / totalPrev).toFixed(1) : 0;
  const highSev = weekLogs.filter(i => i.severity >= 4).length;

  // Top impact types
  const typeCounts = {};
  weekLogs.forEach(imp => (imp.impact_types || []).forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; }));
  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Time of day distribution
  const todCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  weekLogs.forEach(i => { if (i.environment && todCounts[i.environment] !== undefined) todCounts[i.environment]++; });
  const topTod = Object.entries(todCounts).sort((a, b) => b[1] - a[1])[0];

  // Severity trend arrow
  const trendDiff = totalPrev > 0 ? (parseFloat(avgSev) - parseFloat(avgSevPrev)).toFixed(1) : null;
  const trendText = trendDiff === null ? "" : trendDiff > 0 ? `↑ ${Math.abs(trendDiff)} vs last week` : trendDiff < 0 ? `↓ ${Math.abs(trendDiff)} vs last week` : "→ Same as last week";
  const trendColor = trendDiff > 0 ? "#ef4444" : trendDiff < 0 ? "#10b981" : "#78716c";

  // Linked goals summary
  const linkedGoalIds = new Set();
  weekLogs.forEach(i => (i.plan_goal_ids || (i.plan_goal_id ? [i.plan_goal_id] : [])).forEach(id => linkedGoalIds.add(id)));
  const linkedGoals = goals.filter(g => linkedGoalIds.has(g.id));

  // Recent log entries (last 5)
  const recentLogs = [...weekLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // Therapy goal trend: goals with most log activity
  const goalActivity = {};
  weekLogs.forEach(imp => {
    const ids = imp.plan_goal_ids || (imp.plan_goal_id ? [imp.plan_goal_id] : []);
    ids.forEach(id => { goalActivity[id] = (goalActivity[id] || 0) + 1; });
  });
  const therapyGoals = goals
    .filter(g => goalActivity[g.id])
    .sort((a, b) => (goalActivity[b.id] || 0) - (goalActivity[a.id] || 0))
    .slice(0, 3);

  const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "long" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Your Weekly Insights — Impact Vault</title>
</head>
<body style="margin:0;padding:0;background:#F4F2F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2F0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:white;border-radius:16px 16px 0 0;padding:28px 32px;border-bottom:1px solid #E7E5E4;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/a6b63ebfa_Impactvault-whitebackground.jpg" alt="Impact Vault" style="height:40px;width:40px;border-radius:8px;object-fit:cover;display:block;"/>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#1c1917;">Impact Vault</p>
                <p style="margin:2px 0 0;font-size:12px;color:#a8a29e;">Functional Impact Insights</p>
              </td>
              <td align="right">
                <span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid #fde68a;">✦ Insights</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="background:white;padding:28px 32px 20px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#1c1917;">Your weekly snapshot</p>
          <p style="margin:6px 0 0;font-size:14px;color:#78716c;">${weekStart} – ${today} · ${pName}</p>
          <p style="margin:14px 0 0;font-size:14px;color:#57534e;">Hi ${name}, here's a summary of functional impacts, support patterns, and daily life trends captured this week.</p>
        </td></tr>

        <!-- Stats Row -->
        <tr><td style="background:white;padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:33%;padding:12px;background:#f5f5f4;border-radius:12px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#1c1917;">${totalThis}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#78716c;font-weight:600;text-transform:uppercase;">Impacts Captured</p>
                ${totalPrev > 0 ? `<p style="margin:4px 0 0;font-size:11px;color:#a8a29e;">${totalThis > totalPrev ? "↑" : totalThis < totalPrev ? "↓" : "→"} ${Math.abs(totalThis - totalPrev)} vs last week</p>` : ""}
              </td>
              <td style="width:4%;"></td>
              <td style="width:33%;padding:12px;background:#f5f5f4;border-radius:12px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:700;color:${SEVERITY_COLOR(parseFloat(avgSev))};">${avgSev || "—"}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#78716c;font-weight:600;text-transform:uppercase;">Average Support Impact</p>
                ${trendText ? `<p style="margin:4px 0 0;font-size:11px;color:${trendColor};">${trendText}</p>` : ""}
              </td>
              <td style="width:4%;"></td>
              <td style="width:33%;padding:12px;background:#f5f5f4;border-radius:12px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:700;color:${highSev > 0 ? "#ef4444" : "#10b981"};">${highSev}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#78716c;font-weight:600;text-transform:uppercase;">High Support Need</p>
                <p style="margin:4px 0 0;font-size:11px;color:#a8a29e;">${highSev === 0 ? "None this week ✓" : "Needs attention"}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        ${totalThis === 0 ? `
        <!-- No entries nudge -->
        <tr><td style="background:white;padding:0 32px 28px;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#92400e;">No entries logged this week</p>
            <p style="margin:6px 0 0;font-size:13px;color:#b45309;">Consistent logging builds stronger evidence. Even a quick note helps capture patterns over time.</p>
            <a href="https://impactvault.base44.app/ImpactLog" style="display:inline-block;margin-top:12px;background:#d97706;color:white;font-size:13px;font-weight:600;padding:8px 16px;border-radius:8px;text-decoration:none;">Log an entry now →</a>
          </div>
        </td></tr>
        ` : `

        ${topTypes.length > 0 ? `
        <!-- Top Impact Types -->
        <tr><td style="background:white;padding:0 32px 24px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1c1917;text-transform:uppercase;letter-spacing:0.05em;">Most common this week</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${topTypes.map(([name, count]) => `<span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;">${name} (${count})</span>`).join(" ")}
          </div>
        </td></tr>
        ` : ""}

        ${topTod && topTod[1] > 0 ? `
        <!-- Peak Time -->
        <tr><td style="background:white;padding:0 32px 24px;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#1e40af;">📍 Peak time detected</p>
            <p style="margin:6px 0 0;font-size:14px;color:#1d4ed8;font-weight:600;">${TIME_BLOCKS[topTod[0]] || topTod[0]}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#3b82f6;">${topTod[1]} of ${totalThis} impacts occurred during this time. This period may benefit from additional support, recovery time, or environmental adjustments.</p>
          </div>
        </td></tr>
        ` : ""}

        ${therapyGoals.length > 0 ? `
        <!-- Therapy Goal Trends -->
        <tr><td style="background:white;padding:0 32px 24px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#166534;">🎯 Support Goals This Week</p>
            <p style="margin:0 0 12px;font-size:12px;color:#15803d;">These support goals were most connected to functional impacts this week — share this summary with your therapist or support coordinator to guide your next session.</p>
            ${therapyGoals.map(g => `
              <div style="border:1px solid #dcfce7;border-radius:10px;padding:12px;margin-bottom:8px;background:white;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                  <p style="margin:0;font-size:13px;font-weight:600;color:#1c1917;">${g.title}</p>
                  <span style="background:#22c55e;color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;">${goalActivity[g.id]} ${goalActivity[g.id] === 1 ? 'entry' : 'entries'}</span>
                </div>
                ${g.progress_notes ? `<p style="margin:0;font-size:12px;color:#78716c;">${g.progress_notes}</p>` : ''}
                ${g.supports_strategies ? `<p style="margin:6px 0 0;font-size:11px;color:#a8a29e;"><strong>Strategy:</strong> ${g.supports_strategies}</p>` : ''}
              </div>`).join('')}
            <p style="margin:10px 0 0;font-size:12px;color:#15803d;">💡 Tip: Print or screenshot this email to bring to your next therapy appointment as a conversation starter.</p>
          </div>
        </td></tr>
        ` : ""}

        <!-- Recent Entries -->
        <tr><td style="background:white;padding:0 32px 24px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1c1917;text-transform:uppercase;letter-spacing:0.05em;">Recent Functional Impacts</p>
          ${recentLogs.map(imp => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f5f5f4;font-size:13px;">
              <span style="color:#a8a29e;min-width:80px;">${imp.date}</span>
              <span style="background:${SEVERITY_COLOR(imp.severity)};color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;">S${imp.severity}</span>
              <span style="color:#57534e;flex:1;">${imp.functional_impact || (imp.impact_types || []).join(", ") || imp.notes || "Entry logged"}</span>
            </div>`).join("")}
        </td></tr>
        `}

        <!-- CTA -->
        <tr><td style="background:white;padding:0 32px 32px;">
          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:20px;text-align:center;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#92400e;">Ready to generate a full report?</p>
            <p style="margin:6px 0 16px;font-size:13px;color:#b45309;">Your Insights dashboard has full pattern analysis, pattern insights, and trend charts.</p>
            <a href="https://impactvault.base44.app/ReviewReport" style="display:inline-block;background:#d97706;color:white;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;">View Full Report →</a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f5f5f4;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a8a29e;">You're receiving this because you have an active Insights plan.</p>
          <p style="margin:6px 0 0;font-size:12px;color:#a8a29e;">Impact Vault · Confidential · <a href="https://impactvault.base44.app/Help" style="color:#b6ada5;text-decoration:underline;">Manage Insights</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  // Get all users with insights plan
  const allUsers = await base44.asServiceRole.entities.User.list();
  const insightsUsers = allUsers.filter(u => u.insights_plan);

  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  let sent = 0;
  let errors = [];

  for (const u of insightsUsers) {
    try {
      // Get their participants
      const participants = await base44.asServiceRole.entities.ParticipantProfile.filter({ created_by: u.email });
      if (participants.length === 0) continue;

      // Use first participant (or loop if family plan)
      const isFamily = u.plan === 'Impact Vault Family' || u.plan?.toLowerCase().includes('family');
      const targetParticipants = isFamily ? participants : [participants[0]];

      for (const participant of targetParticipants) {
        const allLogs = await base44.asServiceRole.entities.DailyImpactLog.filter({ participant_id: participant.id });
        const weekLogs = allLogs.filter(l => l.date >= weekAgo && l.date <= today);
        const prevWeekLogs = allLogs.filter(l => l.date >= twoWeeksAgo && l.date < weekAgo);
        const goals = await base44.asServiceRole.entities.PlanGoal.filter({ participant_id: participant.id });

        const html = buildEmailHTML(u, participant, weekLogs, prevWeekLogs, goals);
        const subject = weekLogs.length > 0
          ? `Your weekly insights: ${weekLogs.length} entries, avg severity ${weekLogs.length ? (weekLogs.reduce((s, i) => s + i.severity, 0) / weekLogs.length).toFixed(1) : 0} — ${participant.name}`
          : `Your weekly Impact Vault check-in — ${participant.name}`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          subject,
          body: html,
          from_name: "Impact Vault Insights"
        });

        sent++;
      }
    } catch (e) {
      errors.push({ user: u.email, error: e.message });
    }
  }

  return Response.json({ sent, errors, total_insights_users: insightsUsers.length });
});