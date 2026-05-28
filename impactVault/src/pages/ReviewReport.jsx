import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Paperclip, Mail, X } from "lucide-react";
import MobileSelect from "../components/shared/MobileSelect";
import HelpButton from "../components/shared/HelpButton";
import { format, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PageHeader from "../components/shared/PageHeader";
import { jsPDF } from "jspdf";

const ENV_LABELS = { home: "Home", school: "School", community: "Community", other: "Other" };
const SUPPORT_LABELS = {
  no_additional: "No additional support required",
  parent_carer: "Parent/carer support required",
  therapy_worker: "Therapy/support worker",
  school_intervention: "School support required",
  medical_support: "Medical support",
};
const CATEGORY_LABELS = {
  behaviour: "Behaviour",
  sleep: "Sleep",
  school: "School",
  therapy: "Therapy",
  mood: "Mood",
  health: "Health",
  other: "Other",
};
const TRIGGER_LABELS = {
  transition: "Transitions",
  fatigue: "Fatigue",
  noise: "Noise",
  hunger: "Hunger",
  change_of_routine: "Routine changes",
  social_interaction: "Social interaction",
};
const TIME_BLOCKS = [
  { key: "morning", label: "Morning", hours: "6am–12pm" },
  { key: "afternoon", label: "Afternoon", hours: "12pm–5pm" },
  { key: "evening", label: "Evening", hours: "5pm–9pm" },
  { key: "night", label: "Night", hours: "9pm–6am" },
];

export default function ReviewReport() {
  const [participants, setParticipants] = useState([]);
  const [selectedPid, setSelectedPid] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (!user) return;
      setCurrentUser(user);
      base44.entities.ParticipantProfile.filter({ created_by: user.email }).then(setParticipants);
    });
  }, []);

  const generate = async () => {
    if (!selectedPid) return;
    setLoading(true);
    const fetchAll = async (entity, query, sort) => {
      let all = [];
      let page = 0;
      const pageSize = 500;
      while (true) {
        const batch = await entity.filter(query, sort, pageSize, page * pageSize);
        all = all.concat(batch);
        if (batch.length < pageSize) break;
        page++;
      }
      return all;
    };

    const user = currentUser;
    const [impacts, carerLogs, goals, evidence] = await Promise.all([
      fetchAll(base44.entities.DailyImpactLog, { participant_id: selectedPid }, "-date"),
      fetchAll(base44.entities.CarerCapacityLog, { created_by: user.email }, "-date"),
      base44.entities.PlanGoal.filter({ participant_id: selectedPid }),
      fetchAll(base44.entities.EvidenceItem, { participant_id: selectedPid }, "-upload_date"),
    ]);

    const inRange = (date) => {
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    };

    const filteredImpacts = impacts.filter((i) => inRange(i.date)).sort((a, b) => a.date.localeCompare(b.date));
    const filteredCarer = carerLogs.filter((l) => inRange(l.date)).sort((a, b) => a.date.localeCompare(b.date));
    const filteredEvidence = evidence.filter((e) => inRange(e.upload_date));

    const participant = participants.find((p) => p.id === selectedPid);
    setData({
      participant,
      impacts: filteredImpacts,
      carerLogs: filteredCarer,
      goals,
      evidence: filteredEvidence,
      user: currentUser,
    });
    setLoading(false);
    setGenerated(true);
    setEmailSent(false);
    setEmailTo(participant?.carer_email || "");
  };

  const buildPrintHTML = () => {
    const p = data.participant || {};
    const impacts = data.impacts || [];
    const carerLogs = data.carerLogs || [];
    const goals = data.goals || [];

    const localEvidenceByLogId = {};
    (data.evidence || []).forEach((ev) => {
      if (ev.daily_log_id) {
        if (!localEvidenceByLogId[ev.daily_log_id]) localEvidenceByLogId[ev.daily_log_id] = [];
        localEvidenceByLogId[ev.daily_log_id].push(ev);
      }
    });
    const allEvidence = data.evidence || [];
    const unlinkedEvidence = allEvidence.filter((ev) => !ev.daily_log_id);

    const avgSev = impacts.length
      ? (impacts.reduce((s, i) => s + i.severity, 0) / impacts.length).toFixed(1)
      : "—";

    const carerAvgVal = (key) => carerLogs.length
      ? (carerLogs.reduce((s, l) => s + (l[key] || 0), 0) / carerLogs.length).toFixed(1)
      : "—";

    const severityCounts = [1,2,3,4,5].map(n => ({ level: n, count: impacts.filter(i => i.severity === n).length }));

    const typeCounts = {};
    impacts.forEach(imp => (imp.impact_types || []).forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; }));
    const typeData = Object.entries(typeCounts).map(([name, count]) => [
      name === "Behaviour Escalation" ? "Regulation Difficulty" :
      name === "Fatigue / Shutdown" ? "Fatigue / Recovery" :
      name === "Therapy Disruption" ? "Therapy Participation Impact" :
      name, count
    ]).sort((a,b) => b[1]-a[1]);

    const periodText = (dateFrom || dateTo)
      ? `Reporting period: <strong>${dateFrom ? format(parseISO(dateFrom), "d MMM yyyy") : "All dates"}</strong> to <strong>${dateTo ? format(parseISO(dateTo), "d MMM yyyy") : "present"}</strong>`
      : "";

    const severityBarHTML = severityCounts.map(({ level, count }) => {
      const maxCount = Math.max(...severityCounts.map(s => s.count), 1);
      const pct = Math.round((count / maxCount) * 100);
      const color = level >= 4 ? "#ef4444" : level === 3 ? "#d97706" : "#10b981";
      return `<div style="display:grid;grid-template-columns:50px 1fr 30px;align-items:center;gap:12px;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;color:#1c1917;">Level ${level}</span>
        <div style="width:100%;height:24px;background:${color};border-radius:4px;display:block;"></div>
        <span style="font-size:12px;color:#78716c;text-align:right;">${count}</span>
      </div>`;
    }).join("");

    const goalsHTML = goals.length === 0
      ? `<p style="color:#a8a29e;font-size:13px;">No goals recorded.</p>`
      : goals.map(g => `
        <div style="border:1px solid #e7e5e4;border-radius:8px;padding:12px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <strong style="font-size:13px;color:#1c1917;">${g.title || ""}</strong>
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${g.status === "achieved" ? "#dbeafe" : g.status === "paused" ? "#f5f5f4" : "#d1fae5"};color:${g.status === "achieved" ? "#1d4ed8" : g.status === "paused" ? "#78716c" : "#065f46"};">${g.status || "active"}</span>
          </div>
          ${g.description ? `<p style="font-size:12px;color:#57534e;margin:4px 0;">${g.description}</p>` : ""}
          ${g.barriers ? `<p style="font-size:12px;color:#78716c;margin:4px 0;"><strong>Barriers:</strong> ${g.barriers}</p>` : ""}
          ${g.progress_notes ? `<p style="font-size:12px;color:#78716c;margin:4px 0;"><strong>Progress:</strong> ${g.progress_notes}</p>` : ""}
        </div>`).join("");

    const impactLogHTML = impacts.length === 0
      ? `<p style="color:#a8a29e;font-size:13px;">No impact entries in this period.</p>`
      : impacts.map((imp, idx) => {
          const logEv = localEvidenceByLogId[imp.id] || [];
          const sevColor = imp.severity >= 4 ? "#fef2f2" : imp.severity === 3 ? "#fffbeb" : "#f0fdf4";
          const sevText = imp.severity >= 4 ? "#b91c1c" : imp.severity === 3 ? "#b45309" : "#065f46";
          const impLevelStyle = imp.impact_level === "minor"
            ? "background:#fefce8;color:#854d0e;border:1px solid #fde047;"
            : imp.impact_level === "moderate"
            ? "background:#fff7ed;color:#9a3412;border:1px solid #fdba74;"
            : imp.impact_level === "major"
            ? "background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;"
            : "";

          const evidenceHTML = logEv.length > 0 ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e7e5e4;">
              <p style="font-size:11px;font-weight:600;color:#78716c;margin-bottom:6px;">EVIDENCE</p>
              ${logEv.map(ev => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12px;">
                  <span style="background:#ccfbf1;color:#0f766e;padding:1px 6px;border-radius:4px;text-transform:capitalize;">${ev.type}</span>
                  ${ev.file_url
                    ? `<a href="${ev.file_url}" style="color:#1d4ed8;text-decoration:underline;">${ev.file_name || ev.description || "View file"}</a>${ev.description && ev.file_name ? ` <span style="color:#a8a29e;">— ${ev.description}</span>` : ""}`
                    : `<span style="color:#57534e;">${ev.file_name || ev.description || ""}</span>`}
                </div>`).join("")}
            </div>` : "";

          const impTypesHTML = (imp.impact_types || []).length > 0
            ? `<div style="margin-bottom:10px;">
                <p style="font-size:11px;font-weight:600;color:#78716c;text-transform:uppercase;margin-bottom:4px;">Impact Type</p>
                ${imp.impact_types.map(t => `<span style="display:inline-block;background:#fffbeb;color:#92400e;border:1px solid #fde68a;font-size:11px;padding:2px 8px;border-radius:20px;margin:2px;">${t}</span>`).join("")}
              </div>` : "";

          return `
          <div style="border:1px solid #e7e5e4;border-radius:8px;padding:14px;margin-bottom:12px;page-break-inside:avoid;">
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
              <span style="font-size:11px;color:#a8a29e;font-weight:700;">#${idx + 1}</span>
              <strong style="font-size:13px;color:#1c1917;">${imp.date}</strong>
              <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${sevColor};color:${sevText};">Severity ${imp.severity}/5</span>
              ${imp.impact_level ? `<span style="font-size:11px;padding:2px 8px;border-radius:20px;${impLevelStyle}">${imp.impact_level.charAt(0).toUpperCase() + imp.impact_level.slice(1)}</span>` : ""}
              ${imp.environment ? `<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:#eff6ff;color:#1d4ed8;">${ENV_LABELS[imp.environment] || imp.environment}</span>` : ""}
            </div>
            ${impTypesHTML}
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              ${imp.functional_impact ? `<tr><td style="width:50%;vertical-align:top;padding:4px 8px 4px 0;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin:0 0 2px;">Functional Impact</p><p style="color:#1c1917;margin:0;">${imp.functional_impact}</p></td>` : "<td></td>"}
              ${imp.support_required ? `<td style="width:50%;vertical-align:top;padding:4px 0 4px 8px;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin:0 0 2px;">Support Required</p><p style="color:#1c1917;margin:0;">${SUPPORT_LABELS[imp.support_required] || imp.support_required}</p></td></tr>` : "<td></td></tr>"}
              ${imp.duration ? `<tr><td style="vertical-align:top;padding:4px 8px 4px 0;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin:0 0 2px;">Duration</p><p style="color:#1c1917;margin:0;">${imp.duration}</p></td>` : "<td></td>"}
              ${imp.notes ? `<td style="vertical-align:top;padding:4px 0 4px 8px;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin:0 0 2px;">Notes</p><p style="color:#57534e;font-style:italic;margin:0;">${imp.notes}</p></td></tr>` : "<td></td></tr>"}
            </table>
            ${evidenceHTML}
          </div>`;
        }).join("");

    const carerHTML = carerLogs.length === 0 ? "" : `
      <div style="margin-bottom:32px;">
        <h2 style="font-size:15px;font-weight:600;color:#1c1917;border-bottom:1px solid #e7e5e4;padding-bottom:8px;margin-bottom:14px;">Carer Capacity Summary (${carerLogs.length} entries)</h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
          ${[["Avg Fatigue", carerAvgVal("fatigue_level")], ["Avg Emotional Load", carerAvgVal("emotional_load")], ["Avg Sleep Impact", carerAvgVal("sleep_impact")], ["Avg Admin Load", carerAvgVal("administrative_load")]].map(([label, val]) => `
            <div style="background:#f5f5f4;border:1px solid #e7e5e4;border-radius:8px;padding:10px;text-align:center;">
              <p style="font-size:20px;font-weight:700;color:#1c1917;margin:0;">${val}</p>
              <p style="font-size:11px;color:#78716c;margin:4px 0 0;">${label}</p>
            </div>`).join("")}
        </div>
        ${carerLogs.map(log => `
          <div style="display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid #f5f5f4;font-size:12px;">
            <span style="color:#78716c;min-width:80px;">${log.date}</span>
            ${log.carer_name ? `<span style="color:#57534e;font-weight:600;min-width:100px;">${log.carer_name}</span>` : ""}
            <span style="color:#57534e;">Fatigue: <strong>${log.fatigue_level || "—"}</strong></span>
            <span style="color:#57534e;">Emotional: <strong>${log.emotional_load || "—"}</strong></span>
            <span style="color:#57534e;">Sleep: <strong>${log.sleep_impact || "—"}</strong></span>
            <span style="color:#57534e;">Admin: <strong>${log.administrative_load || "—"}</strong></span>
            ${log.notes ? `<span style="color:#a8a29e;font-style:italic;flex:1;">${log.notes}</span>` : ""}
          </div>`).join("")}
      </div>`;

    const unlinkedEvidenceHTML = unlinkedEvidence.length === 0 ? "" : `
      <div style="margin-bottom:32px;">
        <h2 style="font-size:15px;font-weight:600;color:#1c1917;border-bottom:1px solid #e7e5e4;padding-bottom:8px;margin-bottom:14px;">Additional Evidence (${unlinkedEvidence.length} items)</h2>
        ${unlinkedEvidence.map(ev => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:12px;">
            <span style="background:#ccfbf1;color:#0f766e;padding:2px 8px;border-radius:20px;text-transform:capitalize;white-space:nowrap;">${ev.type}</span>
            <div style="flex:1;">
              <p style="margin:0;color:#1c1917;">${ev.description}</p>
              ${ev.file_url ? `<a href="${ev.file_url}" style="color:#1d4ed8;text-decoration:underline;font-size:11px;">${ev.file_name || "View file"}</a>` : ev.file_name ? `<p style="margin:2px 0 0;color:#a8a29e;font-size:11px;">${ev.file_name}</p>` : ""}
            </div>
            <span style="color:#a8a29e;white-space:nowrap;">${ev.upload_date}</span>
          </div>`).join("")}
      </div>`;

    const typeTagsHTML = typeData.length > 0 ? `
      <div style="margin-top:16px;">
        <p style="font-size:11px;font-weight:600;color:#78716c;text-transform:uppercase;margin-bottom:8px;">Most Common Impact Types</p>
        ${typeData.map(([name, count]) => `<span style="display:inline-block;background:#fffbeb;color:#92400e;border:1px solid #fde68a;font-size:11px;padding:3px 10px;border-radius:20px;margin:2px;">${name} (${count})</span>`).join("")}
      </div>` : "";

    // --- INSIGHTS ANALYTICS (only if user has insights plan) ---
    const insightsHTML = (() => {
      if (!data?.user?.insights_plan) return "";

      // Filter entries from last 30 days and previous 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const dateStr = (d) => d.toISOString().split('T')[0];

      const last30 = impacts.filter((i) => i.date >= dateStr(thirtyDaysAgo));
      const prev30 = impacts.filter((i) => i.date >= dateStr(sixtyDaysAgo) && i.date < dateStr(thirtyDaysAgo));

      if (last30.length === 0) return "";

      // Severity trend
      const lastAvgSev = last30.length ? (last30.reduce((s, i) => s + i.severity, 0) / last30.length).toFixed(1) : 0;
      const prevAvgSev = prev30.length ? (prev30.reduce((s, i) => s + i.severity, 0) / prev30.length).toFixed(1) : 0;
      const sevTrend = prev30.length > 0 ? ((lastAvgSev - prevAvgSev) * 10).toFixed(0) : 0;
      const sevTrendDir = sevTrend > 0 ? "↑" : sevTrend < 0 ? "↓" : "→";
      const sevTrendColor = sevTrend > 0 ? "#ef4444" : sevTrend < 0 ? "#10b981" : "#78716c";

      // Time of day distribution
      const todCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      last30.forEach((i) => {
        if (i.environment && todCounts[i.environment] !== undefined) todCounts[i.environment]++;
      });
      const topTod = Object.entries(todCounts).sort((a, b) => b[1] - a[1])[0];
      const todLabel = topTod ? TIME_BLOCKS.find(t => t.key === topTod[0])?.label || "" : "";
      const todHours = topTod ? TIME_BLOCKS.find(t => t.key === topTod[0])?.hours || "" : "";

      const insightsCards = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px;text-align:center;">
            <p style="font-size:11px;font-weight:600;color:#78716c;margin-bottom:4px;">Severity Trend (30d)</p>
            <p style="font-size:18px;font-weight:700;color:${sevTrendColor};">${lastAvgSev} ${sevTrendDir}</p>
            <p style="font-size:10px;color:#78716c;margin-top:2px;">vs. ${prevAvgSev} previous month</p>
          </div>
          <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:10px;text-align:center;">
            <p style="font-size:11px;font-weight:600;color:#78716c;margin-bottom:4px;">Peak Time</p>
            <p style="font-size:16px;font-weight:700;color:#1d4ed8;">${todLabel}</p>
            <p style="font-size:10px;color:#78716c;margin-top:2px;">${todHours} (${topTod?.[1] || 0} entries)</p>
          </div>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;text-align:center;">
            <p style="font-size:11px;font-weight:600;color:#78716c;margin-bottom:4px;">Last 30 Days</p>
            <p style="font-size:18px;font-weight:700;color:#10b981;">${last30.length}</p>
            <p style="font-size:10px;color:#78716c;margin-top:2px;">total entries</p>
          </div>
        </div>`;

      return `
      <div style="margin-bottom:32px;">
        <h2 style="font-size:15px;font-weight:600;color:#1c1917;border-bottom:1px solid #e7e5e4;padding-bottom:8px;margin-bottom:14px;">Patterns & Insights (Last 30 Days)</h2>
        ${insightsCards}
      </div>`;
    })();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Impact Vault — Functional Impact Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; background: white; padding: 32px; font-size: 13px; }
    h1 { font-size: 20px; font-weight: 700; color: #1c1917; }
    h2 { font-size: 15px; font-weight: 600; color: #1c1917; border-bottom: 1px solid #e7e5e4; padding-bottom: 8px; margin-bottom: 14px; }
    p { line-height: 1.5; }
    a { color: #1d4ed8; text-decoration: underline; }
    @media print {
      body { padding: 16px; }
      @page { margin: 16mm; size: A4; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="border-bottom:2px solid #e7e5e4;padding-bottom:16px;margin-bottom:24px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
    <div>
      <h1>Impact Vault — Functional Impact Report</h1>
      <p style="font-size:12px;color:#78716c;margin-top:4px;">Generated ${format(new Date(), "d MMMM yyyy")}</p>
      ${periodText ? `<p style="font-size:13px;color:#57534e;margin-top:6px;">${periodText}</p>` : ""}
    </div>
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/db6fa2801_Impactvault-whitebackground.jpg" alt="Impact Vault" style="height:60px;width:60px;object-fit:contain;" />
  </div>

  <!-- Participant Overview -->
  <div style="margin-bottom:32px;">
    <h2>Participant Overview</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${p.name ? `<tr><td style="width:50%;padding:5px 0;vertical-align:top;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin-bottom:2px;">Name</p><p style="color:#1c1917;">${p.name}</p></td>` : ""}
      ${p.dob ? `<td style="width:50%;padding:5px 0;vertical-align:top;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin-bottom:2px;">Date of Birth</p><p style="color:#1c1917;">${p.dob}</p></td></tr>` : "<td></td></tr>"}
      ${p.diagnoses ? `<tr><td colspan="2" style="padding:5px 0;vertical-align:top;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin-bottom:2px;">Diagnoses / Conditions</p><p style="color:#1c1917;white-space:pre-wrap;">${p.diagnoses}</p></td></tr>` : ""}
      ${p.functional_impacts ? `<tr><td colspan="2" style="padding:5px 0;vertical-align:top;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin-bottom:2px;">Functional Impacts</p><p style="color:#1c1917;white-space:pre-wrap;">${p.functional_impacts}</p></td></tr>` : ""}
      ${p.supports_in_place ? `<tr><td colspan="2" style="padding:5px 0;vertical-align:top;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin-bottom:2px;">Supports in Place</p><p style="color:#1c1917;white-space:pre-wrap;">${p.supports_in_place}</p></td></tr>` : ""}
      ${p.plan_start_date ? `<tr><td colspan="2" style="padding:5px 0;vertical-align:top;"><p style="font-size:10px;font-weight:600;color:#a8a29e;text-transform:uppercase;margin-bottom:2px;">Plan Period</p><p style="color:#1c1917;">${p.plan_start_date}${p.plan_end_date ? ` → ${p.plan_end_date}` : ""}</p></td></tr>` : ""}
    </table>
  </div>

  <!-- Goals -->
  <div style="margin-bottom:32px;">
    <h2>Support Plan Goals</h2>
    ${goalsHTML}
  </div>

  <!-- Analytics -->
  <div style="margin-bottom:32px;">
    <h2>Functional Impact Summary (${impacts.length} entries)</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
      <div style="background:#f5f5f4;border:1px solid #e7e5e4;border-radius:8px;padding:10px;text-align:center;"><p style="font-size:22px;font-weight:700;">${impacts.length}</p><p style="font-size:11px;color:#78716c;margin-top:4px;">Total Entries</p></div>
      <div style="background:#f5f5f4;border:1px solid #e7e5e4;border-radius:8px;padding:10px;text-align:center;"><p style="font-size:22px;font-weight:700;">${avgSev}</p><p style="font-size:11px;color:#78716c;margin-top:4px;">Avg Severity</p></div>
      <div style="background:#f5f5f4;border:1px solid #e7e5e4;border-radius:8px;padding:10px;text-align:center;"><p style="font-size:22px;font-weight:700;">${impacts.filter(i => i.severity >= 4).length}</p><p style="font-size:11px;color:#78716c;margin-top:4px;">High Severity (4–5)</p></div>
    </div>
    <p style="font-size:11px;font-weight:600;color:#78716c;text-transform:uppercase;margin-bottom:8px;">Severity Distribution</p>
    ${severityBarHTML}
    ${typeTagsHTML}
  </div>

  <!-- Insights Section -->
  ${insightsHTML}

  <!-- Carer Capacity -->
  ${carerHTML}

  <!-- Chronological Impact Log -->
  <div style="margin-bottom:32px;">
    <h2>Functional Impact Timeline (${impacts.length} entries)</h2>
    ${impactLogHTML}
  </div>

  <!-- Unlinked Evidence -->
  ${unlinkedEvidenceHTML}

  <!-- All Evidence Summary -->
  ${allEvidence.length > 0 ? `
  <div style="margin-bottom:32px;">
    <h2 style="font-size:15px;font-weight:600;color:#1c1917;border-bottom:1px solid #e7e5e4;padding-bottom:8px;margin-bottom:14px;">All Evidence Files (${allEvidence.length} items)</h2>
    ${allEvidence.map(ev => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:12px;">
        <span style="background:#ccfbf1;color:#0f766e;padding:2px 8px;border-radius:20px;text-transform:capitalize;white-space:nowrap;">${ev.type}</span>
        <div style="flex:1;">
          <p style="margin:0 0 2px;color:#1c1917;font-weight:600;">${ev.description || ev.file_name || ""}</p>
          ${ev.file_name ? `<p style="margin:0 0 2px;font-size:11px;color:#78716c;">${ev.file_name}</p>` : ""}
          ${ev.file_url ? `<a href="${ev.file_url}" style="color:#1d4ed8;text-decoration:underline;font-size:11px;word-break:break-all;">${ev.file_url}</a>` : ""}
        </div>
        <span style="color:#a8a29e;white-space:nowrap;">${ev.upload_date}</span>
      </div>`).join("")}
  </div>` : ""}

  <!-- Footer -->
  <div style="border-top:1px solid #e7e5e4;padding-top:12px;text-align:center;">
    <p style="font-size:11px;color:#a8a29e;">Generated by Impact Vault · ${format(new Date(), "d MMMM yyyy")} · Confidential</p>
  </div>
</body>
</html>`;
  };

  const sendEmail = async () => {
    if (!emailTo) return;
    setEmailSending(true);
    setEmailError("");
    const p = data.participant || {};
    const subject = `Impact Vault Report — ${p.name || "Participant"} (${format(new Date(), "d MMM yyyy")})`;
    const reportHtml = buildPrintHTML();
    
    try {
      await base44.functions.invoke('sendReportEmail', {
        to: emailTo,
        subject,
        body: reportHtml,
        participant_name: p.name || "Report"
      });
      setEmailSending(false);
      setEmailSent(true);
      setEmailModal(false);
    } catch (err) {
      console.error('Failed to send email:', err);
      setEmailSending(false);
      setEmailError(err.message || "Failed to send email. Please try again.");
    }
  };

  const avgSeverity = data?.impacts.length
    ? (data.impacts.reduce((s, i) => s + i.severity, 0) / data.impacts.length).toFixed(1)
    : "—";

  const severityDist = data?.impacts
    ? [1, 2, 3, 4, 5].map((n) => ({ level: `Level ${n}`, count: data.impacts.filter((i) => i.severity === n).length }))
    : [];

  const carerAvg = (key) =>
    data?.carerLogs.length
      ? (data.carerLogs.reduce((s, l) => s + (l[key] || 0), 0) / data.carerLogs.length).toFixed(1)
      : "—";

  // Build a map of log id -> evidence items for quick lookup
  const evidenceByLogId = {};
  if (data?.evidence) {
    data.evidence.forEach((ev) => {
      if (ev.daily_log_id) {
        if (!evidenceByLogId[ev.daily_log_id]) evidenceByLogId[ev.daily_log_id] = [];
        evidenceByLogId[ev.daily_log_id].push(ev);
      }
    });
  }

  return (
    <div>
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          #root, body, html { background: white !important; }
          nav, header { display: none !important; }
          .print-page {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 24px !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .log-entry { page-break-inside: avoid; break-inside: avoid; }
          a { color: #1d4ed8 !important; text-decoration: underline !important; }
          .recharts-wrapper, .recharts-responsive-container { overflow: visible !important; }
        }
      `}</style>

      {/* Settings panel — hidden on print */}
      <div className="no-print">
        <PageHeader
            title="Functional Impact Report"
            subtitle="Create a structured summary of functional impacts, support needs, goals, and supporting evidence over time."
            action={<HelpButton pageName="ReviewReport" />}
          />
        <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Report Settings</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Participant *</label>
              <MobileSelect
                value={selectedPid}
                onChange={(v) => { setSelectedPid(v); setGenerated(false); }}
                placeholder="Select participant…"
                options={[...participants.map((p) => ({ value: p.id, label: p.name }))]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setGenerated(false); }} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setGenerated(false); }} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            {(() => {
              const p = participants.find(x => x.id === selectedPid);
              if (!p?.plan_start_date && !p?.plan_end_date) return null;
              return (
                <div className="flex flex-col justify-end">
                  <label className="block text-xs font-medium text-stone-600 mb-1">Quick Fill</label>
                  <button
                    type="button"
                    onClick={() => { setDateFrom(p.plan_start_date || ""); setDateTo(p.plan_end_date || ""); setGenerated(false); }}
                    className="px-3 py-2.5 text-sm border border-amber-300 text-amber-800 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors text-left leading-tight"
                  >
                    📅 Use support period<br/>
                    <span className="text-xs text-amber-600">{p.plan_start_date} → {p.plan_end_date}</span>
                  </button>
                </div>
              );
            })()}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={generate} disabled={!selectedPid || loading} className="flex items-center gap-2 px-5 py-2.5 bg-[#B6ADA5] text-white text-sm rounded-xl hover:bg-[#9A9089] disabled:opacity-60 transition-colors">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading ? "Generating…" : "Generate Functional Report"}
            </button>
            {generated && (
              <>
                <button
                  onClick={() => {
                    const html = buildPrintHTML();
                    const win = window.open("", "_blank");
                    win.document.write(html);
                    win.document.close();
                    setTimeout(() => { win.focus(); win.print(); }, 500);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-stone-700 text-white text-sm rounded-xl hover:bg-stone-800 transition-colors"
                >
                  <Download className="w-4 h-4" /> Export / Print PDF
                </button>
                <button
                  onClick={() => { setEmailModal(true); setEmailSent(false); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Mail className="w-4 h-4" /> {emailSent ? "Email Sent ✓" : "Email Report"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-stone-800">Email Report</h3>
              <button onClick={() => setEmailModal(false)} className="p-1 rounded-lg hover:bg-stone-100"><X className="w-4 h-4 text-stone-500" /></button>
            </div>
            <p className="text-sm text-stone-500 mb-4">Share this report with therapists, support teams, or carers to help support conversations, understand functional impacts, and track progress over time.</p>
            <label className="block text-xs font-medium text-stone-600 mb-1">Recipient email (e.g. therapist, support team, carer)</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => { setEmailTo(e.target.value); setEmailError(""); }}
              placeholder="Enter email address"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
            />
            {emailError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{emailError}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setEmailModal(false); setEmailError(""); }} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={sendEmail}
                disabled={!emailTo || emailSending}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {emailSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
                {emailSending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {generated && data && (
        <div className="print-page bg-white rounded-2xl border border-stone-200 p-6 md:p-8 space-y-8">

          {/* Report Header */}
          <div className="border-b border-stone-200 pb-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#B6ADA5] flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-stone-800">Impact Vault — Functional Impact Report</h1>
                  <p className="text-xs text-stone-400">Generated {format(new Date(), "d MMMM yyyy")}</p>
                </div>
              </div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/db6fa2801_Impactvault-whitebackground.jpg"
                alt="Impact Vault"
                className="h-14 w-14 object-contain shrink-0"
              />
            </div>
            {(dateFrom || dateTo) && (
              <p className="text-sm text-stone-500">
                Reporting period: <strong>{dateFrom ? format(parseISO(dateFrom), "d MMM yyyy") : "All dates"}</strong> to <strong>{dateTo ? format(parseISO(dateTo), "d MMM yyyy") : "present"}</strong>
              </p>
            )}
          </div>

          {/* Participant Overview */}
          <Section title="Participant Overview">
            <div className="grid md:grid-cols-2 gap-4">
              <InfoRow label="Name" value={data.participant?.name} />
              <InfoRow label="Date of Birth" value={data.participant?.dob} />
              <InfoRow label="Diagnoses / Conditions" value={data.participant?.diagnoses} />
              <InfoRow label="Functional Impacts" value={data.participant?.functional_impacts} />
              <InfoRow label="Supports in Place" value={data.participant?.supports_in_place} />
              {data.participant?.plan_start_date && (
                <InfoRow label="Plan Period" value={`${data.participant.plan_start_date}${data.participant.plan_end_date ? ` → ${data.participant.plan_end_date}` : ""}`} />
              )}
            </div>
          </Section>

          {/* Support Plan Goals */}
          <Section title="Support Plan Goals">
            {data.goals.length === 0 ? (
              <p className="text-sm text-stone-400">No goals recorded.</p>
            ) : (
              <div className="space-y-4">
                {data.goals.map((g) => (
                  <div key={g.id} className="border border-stone-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-stone-800">{g.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === "achieved" ? "bg-blue-100 text-blue-700" : g.status === "paused" ? "bg-stone-100 text-stone-500" : "bg-emerald-100 text-emerald-700"}`}>{g.status || "active"}</span>
                    </div>
                    {g.description && <p className="text-sm text-stone-600 mb-1">{g.description}</p>}
                    {g.barriers && <p className="text-sm text-stone-500"><strong>Barriers:</strong> {g.barriers}</p>}
                    {g.progress_notes && <p className="text-sm text-stone-500 mt-1"><strong>Progress:</strong> {g.progress_notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Impact Analytics + Charts */}
          <Section title={`Functional Impact Summary (${data.impacts.length} entries)`}>
            {data.impacts.length === 0 ? (
              <p className="text-sm text-stone-400">No impact entries in this period.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <StatBox label="Total Entries" value={data.impacts.length} />
                  <StatBox label="Avg Severity" value={avgSeverity} />
                  <StatBox label="High Severity (4–5)" value={data.impacts.filter((i) => i.severity >= 4).length} />
                </div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Severity Distribution</p>
                <div className="space-y-2">
                  {severityDist.map(({ level, count }) => {
                    const maxCount = Math.max(...severityDist.map(s => s.count), 1);
                    const pct = Math.round((count / maxCount) * 100);
                    const levelNum = parseInt(level.replace("Level ", ""));
                    const color = levelNum >= 4 ? "#ef4444" : levelNum === 3 ? "#d97706" : "#10b981";
                    return (
                      <div key={level} className="flex items-center gap-3">
                        <span className="text-xs text-stone-500 w-14 shrink-0">{level}</span>
                        <div className="flex-1 bg-stone-100 rounded-full h-4">
                          <div className="h-4 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-xs text-stone-500 w-5 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Impact type frequency */}
                {(() => {
                  const typeCounts = {};
                  data.impacts.forEach((imp) => {
                    (imp.impact_types || []).forEach((t) => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
                  });
                  const typeData = Object.entries(typeCounts).map(([name, count]) => {
                    let displayName = name;
                    if (name === "Behaviour Escalation") displayName = "Regulation Difficulty";
                    else if (name === "Fatigue / Shutdown") displayName = "Fatigue / Recovery";
                    else if (name === "Therapy Disruption") displayName = "Therapy Participation Impact";
                    return { name: displayName, count };
                  }).sort((a, b) => b.count - a.count);
                  if (typeData.length === 0) return null;
                  return (
                    <div className="mt-5">
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Most Common Impact Types</p>
                      <div className="flex flex-wrap gap-2">
                        {typeData.map(({ name, count }) => (
                          <span key={name} className="text-xs bg-[#F0EDEB] text-[#7A726C] border border-[#D9D3CF] px-2 py-1 rounded-full">
                            {name} <strong>({count})</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </Section>

          {/* Patterns & Insights */}
          {(() => {
            if (!data.user?.insights_plan) return null;

            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            const dateStr = (d) => d.toISOString().split('T')[0];

            const last30 = data.impacts.filter((i) => i.date >= dateStr(thirtyDaysAgo));
            const prev30 = data.impacts.filter((i) => i.date >= dateStr(sixtyDaysAgo) && i.date < dateStr(thirtyDaysAgo));

            if (last30.length === 0) return null;

            const lastAvgSev = last30.length ? (last30.reduce((s, i) => s + i.severity, 0) / last30.length).toFixed(1) : 0;
            const prevAvgSev = prev30.length ? (prev30.reduce((s, i) => s + i.severity, 0) / prev30.length).toFixed(1) : 0;
            const sevTrend = prev30.length > 0 ? ((lastAvgSev - prevAvgSev) * 10).toFixed(0) : 0;

            const todCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
            last30.forEach((i) => {
              if (i.environment && todCounts[i.environment] !== undefined) todCounts[i.environment]++;
            });
            const topTod = Object.entries(todCounts).sort((a, b) => b[1] - a[1])[0];
            const todBlock = topTod ? TIME_BLOCKS.find(t => t.key === topTod[0]) : null;

            return (
              <Section title="Patterns & Insights (Last 30 Days)">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl p-3 text-center bg-amber-50 border border-amber-200">
                    <p className="text-xs font-medium text-stone-600 uppercase mb-1">Severity Trend</p>
                    <p className="text-lg font-bold text-amber-700">{lastAvgSev}</p>
                    <p className="text-xs text-stone-500 mt-0.5">vs {prevAvgSev} prev month</p>
                  </div>
                  <div className="rounded-xl p-3 text-center bg-blue-50 border border-blue-200">
                    <p className="text-xs font-medium text-stone-600 uppercase mb-1">Peak Time</p>
                    <p className="text-lg font-bold text-blue-700">{todBlock?.label || "—"}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{todBlock?.hours} ({topTod?.[1] || 0})</p>
                  </div>
                  <div className="rounded-xl p-3 text-center bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-medium text-stone-600 uppercase mb-1">Total Entries</p>
                    <p className="text-lg font-bold text-emerald-700">{last30.length}</p>
                    <p className="text-xs text-stone-500 mt-0.5">last 30 days</p>
                  </div>
                </div>
              </Section>
            );
          })()}

          {/* Carer Capacity Summary */}
          {data.carerLogs.length > 0 && (
            <Section title={`Carer Capacity Summary (${data.carerLogs.length} entries)`}>
              {(() => {
                const avgF = parseFloat(carerAvg("fatigue_level"));
                const avgE = parseFloat(carerAvg("emotional_load"));
                const avgS = parseFloat(carerAvg("sleep_impact"));
                const avgA = parseFloat(carerAvg("administrative_load"));
                const getStrainLabel = (v) => v <= 2 ? "Low" : v <= 3 ? "Moderate" : v <= 4 ? "High" : "Critical";
                const getStrainColor = (v) => v <= 2 ? "text-green-700" : v <= 3 ? "text-amber-700" : v <= 4 ? "text-orange-700" : "text-red-700";
                const overallStrain = (avgF + avgE + avgS + avgA) / 4;
                const strainStatus = overallStrain <= 2 ? "Low strain - Carer is managing well" : overallStrain <= 3 ? "Moderate strain - Consider proactive support" : overallStrain <= 4 ? "High strain - Additional support recommended" : "Critical strain - Urgent support needed";
                const strainIcon = overallStrain <= 2 ? "✓" : overallStrain <= 3 ? "→" : overallStrain <= 4 ? "⚠" : "🚨";
                return (
                  <>
                    {/* Strain Status Card */}
                    <div className={`rounded-xl p-4 mb-5 border-l-4 ${overallStrain <= 2 ? "bg-green-50 border-green-400" : overallStrain <= 3 ? "bg-amber-50 border-amber-400" : overallStrain <= 4 ? "bg-orange-50 border-orange-400" : "bg-red-50 border-red-400"}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{strainIcon}</span>
                        <div>
                          <p className={`font-semibold text-sm ${overallStrain <= 2 ? "text-green-900" : overallStrain <= 3 ? "text-amber-900" : overallStrain <= 4 ? "text-orange-900" : "text-red-900"}`}>
                            Overall Strain: {getStrainLabel(overallStrain)}
                          </p>
                          <p className={`text-xs mt-1 ${overallStrain <= 2 ? "text-green-700" : overallStrain <= 3 ? "text-amber-700" : overallStrain <= 4 ? "text-orange-700" : "text-red-700"}`}>
                            {strainStatus}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Four Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      <div className="rounded-xl p-3 bg-gradient-to-br from-rose-100 to-rose-50 border border-rose-200">
                        <p className="text-xs font-semibold text-rose-900 mb-1">Fatigue</p>
                        <p className="text-2xl font-bold text-rose-700">{avgF.toFixed(1)}</p>
                        <p className={`text-xs font-medium mt-1 ${getStrainColor(avgF)}`}>{getStrainLabel(avgF)}</p>
                      </div>
                      <div className="rounded-xl p-3 bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200">
                        <p className="text-xs font-semibold text-amber-900 mb-1">Emotion</p>
                        <p className="text-2xl font-bold text-amber-700">{avgE.toFixed(1)}</p>
                        <p className={`text-xs font-medium mt-1 ${getStrainColor(avgE)}`}>{getStrainLabel(avgE)}</p>
                      </div>
                      <div className="rounded-xl p-3 bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Sleep</p>
                        <p className="text-2xl font-bold text-blue-700">{avgS.toFixed(1)}</p>
                        <p className={`text-xs font-medium mt-1 ${getStrainColor(avgS)}`}>{getStrainLabel(avgS)}</p>
                      </div>
                      <div className="rounded-xl p-3 bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200">
                        <p className="text-xs font-semibold text-purple-900 mb-1">Admin</p>
                        <p className="text-2xl font-bold text-purple-700">{avgA.toFixed(1)}</p>
                        <p className={`text-xs font-medium mt-1 ${getStrainColor(avgA)}`}>{getStrainLabel(avgA)}</p>
                      </div>
                    </div>
                    {/* Entry rows - tighter layout */}
                    <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2 border-t border-stone-200 pt-3">Entry Log</p>
                    <div className="space-y-1.5">
                      {data.carerLogs.map((log) => {
                        const logStrain = (log.fatigue_level + log.emotional_load + log.sleep_impact + log.administrative_load) / 4;
                        const isHighStrain = logStrain >= 4;
                        return (
                          <div key={log.id} className={`rounded-lg p-3 text-xs ${isHighStrain ? "bg-red-50 border border-red-200" : "bg-stone-50 border border-stone-200"}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-stone-800">{log.carer_name}</span>
                              <span className="text-stone-400">{log.date}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                              <div className="bg-rose-100 rounded px-1.5 py-1 text-center">
                                <p className="font-bold text-rose-700">{log.fatigue_level}</p>
                              </div>
                              <div className="bg-amber-100 rounded px-1.5 py-1 text-center">
                                <p className="font-bold text-amber-700">{log.emotional_load}</p>
                              </div>
                              <div className="bg-blue-100 rounded px-1.5 py-1 text-center">
                                <p className="font-bold text-blue-700">{log.sleep_impact}</p>
                              </div>
                              <div className="bg-purple-100 rounded px-1.5 py-1 text-center">
                                <p className="font-bold text-purple-700">{log.administrative_load}</p>
                              </div>
                            </div>
                            {isHighStrain && <p className="text-red-700 font-semibold">⚠ High strain event</p>}
                            {log.notes && <p className="text-stone-600 italic mt-1 border-t border-stone-200 pt-1"><span className="font-semibold">Notes:</span> {log.notes}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </Section>
          )}

          {/* ── CHRONOLOGICAL IMPACT LOG ── */}
          <Section title={`Functional Impact Timeline (${data.impacts.length} entries)`}>
            {data.impacts.length === 0 ? (
              <p className="text-sm text-stone-400">No impact entries in this period.</p>
            ) : (
              <div className="space-y-5">
                {data.impacts.map((imp, idx) => {
                  const logEvidence = evidenceByLogId[imp.id] || [];
                  return (
                    <div key={imp.id} className="log-entry rounded-xl p-4" style={{ border: "1px solid #e7e5e4" }}>
                      {/* Entry header */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">#{idx + 1}</span>
                        <span className="text-sm font-semibold text-stone-800">{imp.date}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${imp.severity >= 4 ? "bg-red-100 text-red-700" : imp.severity === 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          Severity {imp.severity}/5
                        </span>
                        {imp.impact_level && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            imp.impact_level === "minor" ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                            imp.impact_level === "moderate" ? "bg-orange-100 text-orange-800 border-orange-300" :
                            "bg-red-100 text-red-800 border-red-300"
                          }`}>{imp.impact_level.charAt(0).toUpperCase() + imp.impact_level.slice(1)}</span>
                        )}
                        {imp.environment && (
                         <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                            {ENV_LABELS[imp.environment] || imp.environment}
                          </span>
                        )}
                      </div>

                      {/* Impact types */}
                      {imp.impact_types && imp.impact_types.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-stone-500 mb-1">Impact Type</p>
                          <div className="flex flex-wrap gap-1.5">
                            {imp.impact_types.map((t) => (
                              <span key={t} className="text-xs bg-[#F0EDEB] text-[#7A726C] border border-[#D9D3CF] px-2 py-0.5 rounded-full">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Detail rows */}
                      <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {imp.functional_impact && (
                          <div>
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Functional Impact</p>
                            <p className="text-stone-700 mt-0.5">{imp.functional_impact}</p>
                          </div>
                        )}
                        {imp.support_required && (
                          <div>
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Support Required</p>
                            <p className="text-stone-700 mt-0.5">{SUPPORT_LABELS[imp.support_required] || imp.support_required}</p>
                          </div>
                        )}
                        {imp.duration && (
                          <div>
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Duration</p>
                            <p className="text-stone-700 mt-0.5">{imp.duration}</p>
                          </div>
                        )}
                        {imp.notes && (
                          <div>
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Notes</p>
                            <p className="text-stone-500 mt-0.5 italic">{imp.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Attached evidence */}
                      {logEvidence.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-stone-100">
                          <p className="text-xs font-medium text-stone-500 mb-2 flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> Evidence
                          </p>
                          <div className="space-y-1.5">
                            {logEvidence.map((ev) => (
                              <div key={ev.id} className="flex items-center gap-2 text-xs">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-[#EDE9E6] text-[#7A726C] capitalize shrink-0">{ev.type}</span>
                                {ev.file_url ? (
                                  <a href={ev.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                    {ev.file_name || ev.description || "View file"}
                                  </a>
                                ) : (
                                  <span className="text-stone-600">{ev.file_name || ev.description}</span>
                                )}
                                {ev.description && ev.file_name && (
                                  <span className="text-stone-400">— {ev.description}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Standalone Evidence (not linked to a specific log) */}
          {(() => {
            const unlinked = (data.evidence || []).filter((ev) => !ev.daily_log_id);
            if (unlinked.length === 0) return null;
            return (
              <Section title={`Additional Evidence (${unlinked.length} items)`}>
                <div className="space-y-2">
                  {unlinked.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#EDE9E6] text-[#7A726C] capitalize shrink-0">{ev.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700">{ev.description}</p>
                        {ev.file_url ? (
                          <a href={ev.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            {ev.file_name || "View file"}
                          </a>
                        ) : ev.file_name && (
                          <p className="text-xs text-stone-400">{ev.file_name}</p>
                        )}
                      </div>
                      <span className="text-xs text-stone-400 shrink-0">{ev.upload_date}</span>
                    </div>
                  ))}
                </div>
              </Section>
            );
          })()}

          {/* Footer */}
          <div className="border-t border-stone-200 pt-4 text-center">
            <p className="text-xs text-stone-400">Generated by Impact Vault · {format(new Date(), "d MMMM yyyy")} · Confidential</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-base font-semibold pb-2 mb-4" style={{ color: "#1c1917", borderBottom: "1px solid #e7e5e4" }}>{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-stone-700 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#f5f5f4", border: "1px solid #e7e5e4" }}>
      <p className="text-xl font-bold" style={{ color: "#1c1917" }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: "#78716c" }}>{label}</p>
    </div>
  );
}