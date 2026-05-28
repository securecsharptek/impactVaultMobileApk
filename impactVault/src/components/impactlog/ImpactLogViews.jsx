import SeverityBadge from "../shared/SeverityBadge";
import { Paperclip, Pencil, Trash2, Archive } from "lucide-react";

const ENV_COLORS = { morning: "bg-yellow-100 text-yellow-700", afternoon: "bg-orange-100 text-orange-700", evening: "bg-purple-100 text-purple-700", night: "bg-blue-100 text-blue-700" };
const ENV_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" };
const SUPPORT_REQUIRED_OPTIONS = [
  { value: "no_additional", label: "No additional support required" },
  { value: "parent_carer", label: "Parent/carer intervention required" },
  { value: "therapy_worker", label: "Therapy/support worker required" },
  { value: "school_intervention", label: "School intervention required" },
  { value: "medical_support", label: "Medical support required" },
];

const severityDotColor = (s) => {
  if (s <= 1) return "bg-green-400";
  if (s <= 2) return "bg-yellow-400";
  if (s <= 3) return "bg-orange-400";
  if (s <= 4) return "bg-red-400";
  return "bg-red-600";
};

// ── Card View ─────────────────────────────────────────────────────────────────
export function CardView({ logs, participants, goals, evidence, onEdit, onDelete, onArchive }) {
  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const p = participants.find((x) => x.id === log.participant_id);
        const g = goals.find((x) => x.id === log.plan_goal_id);
        const logEvidence = evidence.filter((e) => e.daily_log_id === log.id);
        return (
          <div key={log.id} className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge level={log.severity} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENV_COLORS[log.environment] || "bg-stone-100 text-stone-600"}`}>{ENV_LABELS[log.environment] || log.environment}</span>
                {log.impact_level && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                    log.impact_level === "minor" ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                    log.impact_level === "moderate" ? "bg-orange-100 text-orange-800 border-orange-300" :
                    "bg-red-100 text-red-800 border-red-300"
                  }`}>{log.impact_level.charAt(0).toUpperCase() + log.impact_level.slice(1)}</span>
                )}
                <span className="text-xs text-stone-400">{log.date}</span>
                {p && <span className="text-xs text-stone-500 font-medium">{p.name}</span>}
                {logEvidence.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                    <Paperclip className="w-3 h-3" />{logEvidence.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                 <button onClick={() => onEdit(log)} className="p-1.5 rounded-lg hover:bg-amber-50"><Pencil className="w-3.5 h-3.5 text-amber-600" /></button>
                 {onArchive && <button onClick={() => onArchive(log)} title="Archive" className="p-1.5 rounded-lg hover:bg-stone-100"><Archive className="w-3.5 h-3.5 text-stone-400" /></button>}
                 <button onClick={() => onDelete(log.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
              </div>
              {log.impact_types?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {log.impact_types.map((t) => (
                  <span key={t} className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
            {log.description && <p className="text-sm text-stone-800 mt-2">{log.description}</p>}
            {log.functional_impact && <p className="text-sm text-stone-500 mt-1"><span className="font-medium">Impact:</span> {log.functional_impact}</p>}
            {log.support_required && <p className="text-xs text-stone-500 mt-1"><span className="font-medium">Support:</span> {SUPPORT_REQUIRED_OPTIONS.find(o => o.value === log.support_required)?.label}</p>}
            {log.duration && <p className="text-xs text-stone-400 mt-1">Duration: {log.duration}</p>}
            {g && <p className="text-xs text-amber-600 mt-1">Goal: {g.title}</p>}
            {log.notes && <p className="text-xs text-stone-400 mt-1 italic">{log.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
export function ListView({ logs, participants, evidence, onEdit, onDelete, onArchive }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
      {logs.map((log) => {
        const p = participants.find((x) => x.id === log.participant_id);
        const logEvidence = evidence.filter((e) => e.daily_log_id === log.id);
        return (
          <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
            <SeverityBadge level={log.severity} />
            <div className="w-24 shrink-0">
              <p className="text-xs text-stone-500">{log.date}</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {log.impact_types?.slice(0, 2).map((t) => (
                  <span key={t} className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full truncate max-w-[140px]">{t}</span>
                ))}
                {log.impact_types?.length > 2 && <span className="text-xs text-stone-400">+{log.impact_types.length - 2}</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${ENV_COLORS[log.environment] || "bg-stone-100 text-stone-600"}`}>{ENV_LABELS[log.environment]}</span>
                {p && <span className="text-xs text-stone-400">{p.name}</span>}
                {logEvidence.length > 0 && <Paperclip className="w-3 h-3 text-teal-500" />}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(log)} className="p-1.5 rounded-lg hover:bg-amber-50"><Pencil className="w-3.5 h-3.5 text-amber-600" /></button>
              {onArchive && <button onClick={() => onArchive(log)} title="Archive" className="p-1.5 rounded-lg hover:bg-stone-100"><Archive className="w-3.5 h-3.5 text-stone-400" /></button>}
              <button onClick={() => onDelete(log.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Timeline View ─────────────────────────────────────────────────────────────
export function TimelineView({ logs, participants, evidence, onEdit, onDelete, onArchive }) {
  // Group by date
  const grouped = logs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-stone-200" />

      <div className="space-y-6">
        {dates.map((date) => (
          <div key={date}>
            {/* Date marker */}
            <div className="flex items-center gap-3 mb-3 relative">
              <div className="absolute -left-6 w-5 h-5 rounded-full bg-amber-700 border-2 border-white flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full ml-0">
                {new Date(date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            {/* Entries for this date */}
            <div className="space-y-2 ml-0">
              {grouped[date].map((log) => {
                const p = participants.find((x) => x.id === log.participant_id);
                const logEvidence = evidence.filter((e) => e.daily_log_id === log.id);
                return (
                  <div key={log.id} className="bg-white rounded-2xl border border-stone-200 p-4 hover:border-amber-200 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Severity dot */}
                        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${severityDotColor(log.severity)}`} title={`Severity ${log.severity}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-stone-700">Severity {log.severity}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ENV_COLORS[log.environment] || "bg-stone-100 text-stone-600"}`}>{ENV_LABELS[log.environment]}</span>
                            {log.impact_level && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                log.impact_level === "minor" ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                                log.impact_level === "moderate" ? "bg-orange-100 text-orange-800 border-orange-300" :
                                "bg-red-100 text-red-800 border-red-300"
                              }`}>{log.impact_level.charAt(0).toUpperCase() + log.impact_level.slice(1)}</span>
                            )}
                            {p && <span className="text-xs text-stone-400">{p.name}</span>}
                            {logEvidence.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                <Paperclip className="w-3 h-3" />{logEvidence.length}
                              </span>
                            )}
                          </div>
                          {log.impact_types?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {log.impact_types.map((t) => (
                                <span key={t} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{t}</span>
                              ))}
                            </div>
                          )}
                          {log.functional_impact && (
                            <p className="text-xs text-stone-500 mt-2 leading-relaxed">{log.functional_impact}</p>
                          )}
                          {log.notes && <p className="text-xs text-stone-400 mt-1 italic">{log.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => onEdit(log)} className="p-1.5 rounded-lg hover:bg-amber-50"><Pencil className="w-3.5 h-3.5 text-amber-600" /></button>
                        {onArchive && <button onClick={() => onArchive(log)} title="Archive" className="p-1.5 rounded-lg hover:bg-stone-100"><Archive className="w-3.5 h-3.5 text-stone-400" /></button>}
                        <button onClick={() => onDelete(log.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}