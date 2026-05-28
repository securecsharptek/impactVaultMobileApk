import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Archive, RotateCcw, Trash2, ChevronDown, ChevronRight, BookOpen, Heart, X } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import SeverityBadge from "../components/shared/SeverityBadge";
import { format, parseISO } from "date-fns";

export default function ArchivePage() {
  const [impacts, setImpacts] = useState([]);
  const [carerLogs, setCarerLogs] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [tab, setTab] = useState("impacts"); // "impacts" | "carer"

  const load = async () => {
    const user = await base44.auth.me();
    if (!user) return;
    const [i, c, p] = await Promise.all([
      base44.entities.DailyImpactLog.filter({ created_by: user.email, archived: true }, "-date"),
      base44.entities.CarerCapacityLog.filter({ created_by: user.email, archived: true }, "-date"),
      base44.entities.ParticipantProfile.filter({ created_by: user.email }),
    ]);
    setImpacts(i); setCarerLogs(c); setParticipants(p); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unarchive = async (entityName, id) => {
    await base44.entities[entityName].update(id, { archived: false });
    load();
  };

  const deleteEntry = async (entityName, id) => {
    if (!confirm("Permanently delete this entry? This cannot be undone.")) return;
    await base44.entities[entityName].delete(id);
    load();
  };

  // Group by archive_label or by month
  const groupByLabel = (items) => {
    const groups = {};
    items.forEach((item) => {
      const key = item.archive_label || format(parseISO(item.date), "MMMM yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const toggleGroup = (key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const impactGroups = groupByLabel(impacts);
  const carerGroups = groupByLabel(carerLogs);
  const activeGroups = tab === "impacts" ? impactGroups : carerGroups;
  const hasAny = Object.keys(activeGroups).length > 0;

  return (
    <div>
      <PageHeader
        title="Archive"
        subtitle="Archived records are stored here for reference and won't appear in active views."
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-5 w-fit">
        <button
          onClick={() => setTab("impacts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "impacts" ? "bg-white shadow-sm text-amber-700" : "text-stone-500 hover:text-stone-700"}`}
        >
          <BookOpen className="w-4 h-4" /> Functional Impacts {impacts.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{impacts.length}</span>}
        </button>
        <button
          onClick={() => setTab("carer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "carer" ? "bg-white shadow-sm text-amber-700" : "text-stone-500 hover:text-stone-700"}`}
        >
          <Heart className="w-4 h-4" /> Carer Capacity {carerLogs.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{carerLogs.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : !hasAny ? (
        <EmptyState
          icon={Archive}
          title="No archived records"
          subtitle={`Archived ${tab === "impacts" ? "functional impact records" : "carer capacity entries"} will appear here. Records can be archived from the ${tab === "impacts" ? "Functional Impacts" : "Caregiver Capacity"} page.`}
        />
      ) : (
        <div className="space-y-3">
          {Object.entries(activeGroups).map(([label, items]) => (
            <div key={label} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <button
                onClick={() => toggleGroup(label)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedGroups[label] ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-700 text-sm">{label}</span>
                    <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
                  </div>
                </div>
                <span className="text-xs text-stone-400">
                  {items[items.length - 1]?.date} – {items[0]?.date}
                </span>
              </button>

              {expandedGroups[label] && (
                <div className="border-t border-stone-100 divide-y divide-stone-100">
                  {items.map((item) => {
                    const p = participants.find((x) => x.id === item.participant_id);
                    const entityName = tab === "impacts" ? "DailyImpactLog" : "CarerCapacityLog";
                    return (
                      <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                        {tab === "impacts" && <SeverityBadge level={item.severity} />}
                        {tab === "carer" && (
                          <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                            <Heart className="w-4 h-4 text-pink-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {tab === "impacts" ? (
                            <>
                              <p className="text-sm text-stone-700 truncate">{item.functional_impact || item.description || (item.impact_types || []).join(", ")}</p>
                              <p className="text-xs text-stone-400 mt-0.5">{p?.name || "Unknown"} · {item.date} · {item.environment}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-stone-700">{item.carer_name}</p>
                              <p className="text-xs text-stone-400 mt-0.5">
                                {p?.name || "General"} · {item.date} · Fatigue: {item.fatigue_level}/5
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => unarchive(entityName, item.id)}
                            title="Restore to active"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-stone-400 hover:text-green-600 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entityName, item.id)}
                            title="Delete permanently"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}