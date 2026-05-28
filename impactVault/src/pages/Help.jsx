import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Users, Target, BookOpen, Heart, FolderOpen, FileText, ChevronDown, ChevronUp, HelpCircle, Zap, Settings, CreditCard, Sparkles, AlertTriangle, ExternalLink
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";

const DICTATION_TIP = "💡 Tip: If typing is difficult, use the microphone on your phone's keyboard to dictate instead. On most smartphones, tap the microphone icon on your keyboard to speak your entry — it works in any text field in this app.";

const sections = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    page: "Dashboard",
    intro: "Your Dashboard provides a clear overview of functional impacts, support needs, evidence, and patterns over time.",
    tips: [
      "The summary cards provide a snapshot of captured functional impacts, supporting evidence, and carer capacity updates.",
      "The trend chart helps identify patterns in emotional regulation, fatigue, support needs, and daily functioning over time.",
      "Recent functional impacts help build a clearer picture of day-to-day experiences and support needs.",
      "Use the Dashboard before conversations, reviews, or appointments to quickly understand patterns and recent changes.",
    ],
  },
  {
    icon: Users,
    title: "Profiles",
    page: "Participants",
    intro: "Profiles store important information, support details, and documents to help build a clearer picture over time.",
    tips: [
      "Enter the person's full name and date of birth so information stays organised across impacts, evidence, and reports.",
      "Add diagnoses or conditions to provide context for functional impacts, support needs, and reports — this appears in generated reports.",
      "Enter the primary carer's name and email in the Carer section — this is used across reports, support records, and captured impacts.",
      "Attach the current support plan or important documents so they're always on hand. Tick 'No current plan' if one isn't in place yet.",
      "Plan start and end dates help track when a review is coming up and trigger plan end reminders on your dashboard.",
      "🔄 When your plan is renewed, tap Edit on the profile and use the 'New Plan Period' button in the Support Plan section. This archives the current plan dates and document into a history list, then clears the fields so you can enter the new plan dates and upload the new plan document. Previous plans and documents remain securely stored inside the profile.",
    ],
  },
  {
    icon: Target,
    title: "Goals & Supports",
    page: "PlanGoals",
    intro: "Goals & Supports helps track support goals, daily strategies, and progress over time.",
    tips: [
      "Create one goal per goal important to the person's daily life and support needs for easy linking.",
      "Use the 'Supports & Strategies' field to describe what supports, strategies, or adjustments are helping in daily life.",
      "Add progress notes over time to document movement towards the goal — helpful for identifying patterns, progress, and changing support needs.",
      "Goals can be linked to functional impacts and supporting evidence, tying everything together for reports.",
      "If there is no formal plan yet, create goals based on what the person is working towards in daily life. Capturing progress over time helps build a clearer picture of support needs and daily functioning.",
      "🔄 Starting a new plan period? Tap 'New Plan Period' at the top of this page. Previous goals will be securely archived under the label you choose (e.g. 'Plan 2023–2024'), and you can enter the new plan dates. You can view archived goals anytime using the 'Archived' toggle. Archived goals can also be restored individually if needed.",
    ],
  },
  {
    icon: BookOpen,
    title: "Functional Impacts",
    page: "ImpactLog",
    intro: "Functional Impacts help build a clearer picture of daily life, support needs, and patterns over time. Use this section to capture everyday moments, challenges, changes, and support needs as they happen.",
    tips: [
      "Log as soon as possible after something important happens while details are fresh.",
      "Severity 1–5: use lower scores for mild impacts and higher scores for situations requiring greater support or recovery.",
      "Select all applicable Impact Types (e.g. emotional regulation, fatigue, transitions, communication, participation) — you can choose multiple.",
      "Record the time of day (morning, afternoon, evening, night) to identify patterns.",
      "Use 'Functional Impact' to describe what happened and how it affected daily functioning or support needs.",
      "Select 'Who Reported' to capture who observed or supported the impact — a parent, carer, school, or therapist.",
      "The 'Support Required' field documents what supports or assistance were needed — important for plan evidence.",
      "Attach evidence (photos, letters, school reports, screenshots) directly to a log entry for clear supporting evidence over time.",
      "Link entries to a specific goal to connect everyday impacts to goals, progress, and support needs.",
    ],
  },
  {
    icon: Zap,
    title: "Quick Capture",
    page: "Dashboard",
    intro: "Quick Capture is a simple way to capture functional impacts, support needs, and important moments as they happen.",
    tips: [
      "Use the Quick Capture cards on your Dashboard to log rapidly — choose Regulation, Sleep, School, Therapy, Emotional Impact, or Other.",
      "Quick captures become part of the person's functional impact history — they help build patterns and insights over time and appear in reports.",
      "You can link quick captures to a goal if needed, but it's optional for faster capturing.",
      "Each quick capture includes the date, time, and functional area — you can add notes about what happened.",
      "Quick captures appear in Functional Impacts and in reports alongside detailed records, so nothing is missed.",
    ],
  },
  {
    icon: Heart,
    title: "Caregiver Capacity",
    page: "CarerCapacity",
    intro: "Caregiver Capacity helps capture the ongoing emotional, physical, and practical impact of caring over time. Over time, this helps build a clearer picture of how caring responsibilities affect wellbeing, routines, and daily life.",
    tips: [
      "Log carer capacity regularly — regular updates help identify patterns and changing support needs over time.",
      "Capture each area (fatigue, emotional load, sleep impact, admin load) honestly on a scale of 1–5.",
      "Record impacts on work attendance, cancelled events, or plans that were impacted by caring responsibilities or support needs.",
      "Use the notes field to capture real-life context — e.g. 'Missed work', 'Hospital visit this week', or 'School called three times'.",
      "High consistent scores across multiple dimensions help demonstrate how caring responsibilities affect long-term wellbeing and support capacity.",
    ],
  },
  {
    icon: FolderOpen,
    title: "Evidence Library",
    page: "Evidence",
    intro: "The Evidence Library keeps supporting evidence, documents, and real-life records organised in one place — school reports, therapy notes, medical letters, photos, and more.",
    tips: [
      "Upload documents as you receive them so important information is easy to find later.",
      "Categorise each item (school, therapy, medical, functional impact, other) to keep the library organised.",
      "Link evidence to a specific person and goal to make it easy to bring together for conversations, reviews, and reports.",
      "Add a clear description so you remember why each file matters without having to open it.",
      "💡 Tip: Screenshot emails, WhatsApp messages, or text messages to save as supporting evidence — just take a screenshot and upload directly.",
      "Evidence linked to a functional impact record is also accessible from the log itself.",
    ],
  },
  {
    icon: FileText,
    title: "Reports",
    page: "ReviewReport",
    intro: "The Reports page brings together functional impacts, support needs, goals, evidence, and patterns over time into one structured summary, ready to use for conversations, reviews, appointments, and planning.",
    tips: [
      "Set the date range to match your support period or the period leading up to a review.",
      "Select a specific person or generate a report across all profiles.",
      "The report includes functional impacts, support patterns, carer capacity, goals, and supporting evidence — all in one document.",
      "Generate an email report to send directly to therapists, support teams, or other professionals.",
      "Export the report as a PDF by clicking 'Download PDF' — you can then print, email, or save it securely for future reference.",
      "💡 Tip: On mobile, tap 'Print/Share' at the top, then select 'Save to Files' or 'Email' to send your report anywhere.",
      "Run a report before any planning meeting to have a clearer picture of patterns, impacts, and support needs.",
    ],
  },
];

function HelpSection({ section, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const Icon = section.icon;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-amber-700" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-stone-800">{section.title}</p>
          <p className="text-xs text-stone-400 mt-0.5">{section.tips.length} tips</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-stone-100">
          <p className="text-sm text-stone-600 mt-4 mb-3">{section.intro}</p>
          <ul className="space-y-2">
            {section.tips.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-stone-600">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center shrink-0 font-medium">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
          <Link
            to={createPageUrl(section.page)}
            className="inline-block mt-4 text-xs text-amber-700 font-medium hover:underline"
          >
            Go to {section.title} →
          </Link>
        </div>
      )}
    </div>
  );
}

function ManageAccount() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await base44.auth.deleteMe();
      base44.auth.logout('/');
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete account. Please contact support.' });
      setLoading(false);
      setConfirmAction(null);
    }
  };

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const handleAction = async (action) => {
    setLoading(true);
    setMessage(null);
    const res = await base44.functions.invoke('manageSubscription', { action });
    setLoading(false);
    setConfirmAction(null);
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else if (res.data?.success) {
      setMessage({ type: 'success', text: res.data.message });
      base44.auth.me().then(setUser);
    } else {
      setMessage({ type: 'error', text: res.data?.error || 'Something went wrong. Please try again.' });
    }
  };

  if (!user?.plan && !user?.insights_plan) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-3">
      <button
        onClick={() => {}}
        className="w-full flex items-center gap-3 p-5 text-left cursor-default"
      >
        <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4 text-stone-600" />
        </div>
        <div>
          <p className="font-semibold text-stone-800">Manage Account & Billing</p>
          <p className="text-xs text-stone-400 mt-0.5">Cancel or manage your plans</p>
        </div>
      </button>

      <div className="px-5 pb-5 border-t border-stone-100 space-y-3 pt-4">
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Stripe billing portal */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="w-4 h-4 text-stone-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-700">Billing Portal</p>
              <p className="text-xs text-stone-500 mt-0.5">Update payment details, view invoices, or manage your subscription directly in Stripe's secure portal.</p>
            </div>
          </div>
          <button
            onClick={() => handleAction('portal')}
            disabled={loading}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-stone-800 text-white text-xs font-semibold rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Billing Portal
          </button>
        </div>

        {/* Cancel Insights */}
        {user?.insights_plan && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Cancel Insights Plan</p>
                <p className="text-xs text-amber-700 mt-0.5">Removes access to pattern detection, trigger analysis, and advanced charts. Your logged data is not affected.</p>
              </div>
            </div>
            {confirmAction === 'cancel_insights' ? (
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleAction('cancel_insights')} disabled={loading} className="flex-1 px-3 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50">
                  {loading ? 'Cancelling…' : 'Yes, cancel Insights'}
                </button>
                <button onClick={() => setConfirmAction(null)} className="px-3 py-2 bg-white border border-stone-200 text-xs font-medium rounded-xl text-stone-600 hover:bg-stone-50">
                  Keep it
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmAction('cancel_insights')} className="mt-3 px-4 py-2 border border-amber-400 text-amber-700 text-xs font-semibold rounded-xl hover:bg-amber-100 transition-colors">
                Cancel Insights Plan
              </button>
            )}
          </div>
        )}

        {/* Cancel full plan */}
        {user?.plan && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Cancel Impact Vault</p>
                <p className="text-xs text-red-600 mt-0.5">Cancels your Core plan and stops all charges. Your data remains for 30 days, then is deleted. This cannot be undone.</p>
              </div>
            </div>
            {confirmAction === 'cancel_all' ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-red-700 font-medium">Are you sure? This will remove all access immediately and cancel all billing.</p>
                <div className="flex gap-2">
                  <button onClick={() => handleAction('cancel_all')} disabled={loading} className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                    {loading ? 'Cancelling…' : 'Yes, cancel everything'}
                  </button>
                  <button onClick={() => setConfirmAction(null)} className="px-3 py-2 bg-white border border-stone-200 text-xs font-medium rounded-xl text-stone-600 hover:bg-stone-50">
                    Keep my plan
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmAction('cancel_all')} className="mt-3 px-4 py-2 border border-red-400 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-100 transition-colors">
                Cancel Impact Vault
              </button>
            )}
          </div>
        )}

        {/* Delete Account */}
        <div className="bg-stone-50 border border-stone-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-stone-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-700">Delete Account</p>
              <p className="text-xs text-stone-500 mt-0.5">Permanently deletes your account and all associated data. This cannot be undone.</p>
            </div>
          </div>
          {confirmAction === 'delete_account' ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-stone-700 font-medium">Are you absolutely sure? All your data will be permanently deleted.</p>
              <div className="flex gap-2">
                <button onClick={handleDeleteAccount} disabled={loading} className="flex-1 px-3 py-2 bg-stone-800 text-white text-xs font-semibold rounded-xl hover:bg-stone-900 disabled:opacity-50">
                  {loading ? 'Deleting…' : 'Yes, delete my account'}
                </button>
                <button onClick={() => setConfirmAction(null)} className="px-3 py-2 bg-white border border-stone-200 text-xs font-medium rounded-xl text-stone-600 hover:bg-stone-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmAction('delete_account')} className="mt-3 px-4 py-2 border border-stone-400 text-stone-600 text-xs font-semibold rounded-xl hover:bg-stone-100 transition-colors">
              Delete Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Help() {
  return (
    <div>
      <PageHeader
        title="Help & Tips"
        subtitle="Guidance on how to use each section of Impact Vault"
      />
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
        <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Impact Vault helps families and carers capture functional impacts, support needs, and real-life evidence over time for conversations, reviews, and planning. Over time, patterns and daily impacts become clearer — helping support conversations feel less overwhelming. Click any section below for tips.
        </p>
      </div>
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex gap-3">
        <span className="text-lg shrink-0">🎤</span>
        <div>
          <p className="text-sm font-medium text-blue-800 mb-0.5">Use your phone's microphone to dictate</p>
          <p className="text-sm text-blue-700">If typing is challenging, tap the <strong>microphone icon</strong> on your phone's keyboard to speak your entries instead. It works in every text field in this app — just tap, speak, and it types for you.</p>
        </div>
      </div>
      <div className="space-y-3">
        {sections.map((s) => (
          <HelpSection key={s.page} section={s} />
        ))}
        <ManageAccount />
      </div>
    </div>
  );
}