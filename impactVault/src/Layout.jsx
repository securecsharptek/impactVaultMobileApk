import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { appParams } from "@/lib/app-params";
import { authService } from "@/api/auth-service";
import { isNativeRuntime } from "@/lib/native-auth";
import {
  LayoutDashboard,
  Users,
  Target,
  BookOpen,
  Heart,
  FolderOpen,
  FileText,
  HelpCircle,
  Archive,
  Sparkles,
  Menu,
  X,
  Settings,
  LogOut,
  MoreVertical,
  Mail,
  ChevronLeft
} from "lucide-react";
import QuickLogFAB from "./components/QuickLogFAB";
import OnboardingTour from "./components/OnboardingTour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Person Profile", page: "Participants", icon: Users },
  { label: "Goals & Supports", page: "PlanGoals", icon: Target },
  { label: "Impact Log", page: "ImpactLog", icon: BookOpen },
  { label: "Caregiver Capacity", page: "CarerCapacity", icon: Heart },
  { label: "Insights", page: "Insights", icon: Sparkles },
  { label: "Reports", page: "ReviewReport", icon: FileText },
  { label: "Archive", page: "Archive", icon: Archive },
  { label: "Help", page: "Help", icon: HelpCircle },
  { label: "Evidence Library", page: "Evidence", icon: FolderOpen },
];

const TAB_ROOTS = {
  Dashboard: "/Dashboard",
  ImpactLog: "/ImpactLog",
  PlanGoals: "/PlanGoals",
  Insights: "/Insights",
};

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToLogin } = useAuth();

  // Remember the last visited path for each bottom tab
  const tabHistory = useRef({
    Dashboard: "/Dashboard",
    ImpactLog: "/ImpactLog",
    PlanGoals: "/PlanGoals",
    Insights: "/Insights",
  });

  // Update tab history whenever location changes
  useEffect(() => {
    const path = location.pathname.replace("/", "") || "Dashboard";
    for (const tabPage of Object.keys(TAB_ROOTS)) {
      if (path === tabPage || path.startsWith(tabPage + "/")) {
        tabHistory.current[tabPage] = location.pathname + location.search;
        break;
      }
    }
  }, [location]);

  // Sync dark mode with system preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    apply(mq);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }

    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      let user = null;
      const urlParams = new URLSearchParams(window.location.search);
      const isCheckoutReturn = urlParams.get('checkout') === 'success';

      try {
        user = await base44.auth.me();
        setCurrentUser(user);
        if (user && !user.onboarding_complete) {
          setShowOnboarding(true);
        }
        if (!user) {
          if (currentPageName !== 'Pricing') {
            navigateToLogin(isCheckoutReturn ? window.location.href : undefined);
          }
          return;
        }
        if (user?.role === 'admin') return;
        // Enable plan selection for users without a plan
        if (!appParams.bypassPaywall && !user?.plan && currentPageName !== 'Pricing' && !isCheckoutReturn) {
          navigate(createPageUrl('Pricing'));
        }
      } catch (e) {
        if (currentPageName !== 'Pricing') {
          navigateToLogin(isCheckoutReturn ? window.location.href : undefined);
        }
      }
    };
    checkAccess();
  }, [currentPageName, navigate, navigateToLogin]);

  // Handle logout for both web and mobile users
  const handleLogout = () => {
    try {
      // Clear all auth tokens
      authService.logout();
      
      // On web, also call base44 logout
      if (!isNativeRuntime()) {
        try {
          base44.auth.logout('/login');
        } catch (e) {
          console.log('Base44 logout error:', e);
        }
      } else {
        // On mobile, just navigate to MobileLogin (prevents Base44 default UI)
        navigate('/MobileLogin');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans" style={{fontFamily: "'Inter', system-ui, sans-serif"}}>
      <style>{`
        :root {
          --color-brand: #B6ADA5;
          --color-brand-dark: #9A9089;
          --color-surface: #FAFAF9;
          --color-muted: #F4F2F0;
        }
        html, body {
          font-family: 'Inter', system-ui, sans-serif;
          background: #FAFAF9;
          -webkit-font-smoothing: antialiased;
          -webkit-text-size-adjust: 100%;
          -moz-text-size-adjust: 100%;
          text-size-adjust: 100%;
          overflow-x: hidden;
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>

      {/* Top bar */}
      <header
        className="bg-white border-b border-stone-200 sticky top-0 z-40"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <div className="max-w-5xl mx-auto px-5 md:px-6 h-14 flex items-center justify-between">
          {/* Left: back button (mobile) or logo */}
          <div className="flex items-center gap-2 text-[#7A726C]">
            {location.pathname !== '/' && (
              <button
                onClick={() => navigate(-1)}
                className="md:hidden p-2 rounded-lg hover:bg-stone-100 -ml-1"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5 text-[#7A726C]" />
              </button>
            )}
            <div className="hidden md:inline-flex items-center justify-center rounded-2xl bg-[#F0EDEB] p-1">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/a6b63ebfa_Impactvault-whitebackground.jpg"
                alt="Impact Vault"
                className="w-7 h-7 rounded-lg object-cover"
              />
            </div>
          </div>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-stone-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5 text-stone-600" /> : <Menu className="w-5 h-5 text-stone-600" />}
          </button>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.slice(0, 7).map((item) => {
              const Icon = item.icon;
              const active = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-stone-900 text-white"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-stone-400 hover:text-stone-700 hover:bg-stone-50">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navItems.slice(7).map((item) => {
                  const Icon = item.icon;
                  const active = currentPageName === item.page;
                  return (
                    <DropdownMenuItem key={item.page} asChild>
                      <Link
                        to={createPageUrl(item.page)}
                        className={`flex items-center gap-2 ${active ? "bg-stone-900 text-white" : ""}`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                {currentUser?.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl('XeroSettings')}
                        className={currentPageName === 'XeroSettings' ? "bg-[#F0EDEB] text-[#7A726C]" : ""}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Xero Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl('EmailTemplates')}
                        className={currentPageName === 'EmailTemplates' ? "bg-[#F0EDEB] text-[#7A726C]" : ""}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email Templates
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-red-500 hover:text-red-700"
                  >
                    <LogOut className="w-4 h-4 mr-2 inline" />
                    Sign out
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
            <div className="flex items-center px-4 border-b border-stone-100" style={{ minHeight: '56px', paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
              <div className="flex items-center gap-3 text-[#7A726C]">
                <div className="rounded-2xl bg-[#F0EDEB] p-1">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69abba91a39ae7e3c2b27293/a6b63ebfa_Impactvault-whitebackground.jpg"
                    alt="Impact Vault"
                    className="w-9 h-9 rounded-xl object-cover"
                  />
                </div>
                <span className="font-semibold text-[#7A726C]">Impact Vault</span>
              </div>
            </div>
            <nav className="flex flex-col gap-1 p-3 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-stone-900 text-white"
                        : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              {currentUser?.role === 'admin' && (
                <Link
                  to={createPageUrl('XeroSettings')}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPageName === 'XeroSettings'
                      ? "bg-[#F0EDEB] text-[#7A726C]"
                      : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Xero Settings
                </Link>
              )}
              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-stone-500 hover:text-red-500 hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Page content */}
      <main
        className="max-w-5xl mx-auto px-5 md:px-6 py-6 md:py-8 overflow-y-auto flex-1"
        style={{ 
          paddingBottom: 'calc(max(env(safe-area-inset-bottom), 12px) + 7rem)',
          maxHeight: 'calc(100vh - 56px - max(env(safe-area-inset-top), 16px) - max(env(safe-area-inset-bottom), 12px) - 80px)',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="hidden md:block max-w-5xl mx-auto px-4 py-6 border-t border-stone-100 mt-4">
        <div className="flex items-center gap-6 text-sm text-stone-400">
          <a href="/About" className="hover:text-stone-700 transition-colors">About</a>
          <a href="/Contact" className="hover:text-stone-700 transition-colors">Contact</a>
        </div>
      </footer>

      <QuickLogFAB />

      {/* Bottom tab bar — mobile only */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 flex md:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)', paddingTop: '4px' }}
      >
        {[
          { label: 'Home', page: 'Dashboard', icon: LayoutDashboard },
          { label: 'Log', page: 'ImpactLog', icon: BookOpen },
          { label: 'Goals', page: 'PlanGoals', icon: Target },
          { label: 'Insights', page: 'Insights', icon: Sparkles },
          { label: 'More', page: null, icon: Menu },
        ].map((tab) => {
          if (tab.page === null) {
            const Icon = tab.icon;
            return (
              <button
                key="more"
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-stone-400 hover:text-stone-700`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }
          const Icon = tab.icon;
          const active = currentPageName === tab.page;
          return (
            <button
              key={tab.page}
              onClick={() => {
                if (active) {
                  // Already on this tab — reset to root
                  tabHistory.current[tab.page] = TAB_ROOTS[tab.page];
                  navigate(TAB_ROOTS[tab.page], { replace: true });
                } else {
                  // Navigate to last remembered path for this tab
                  const dest = tabHistory.current[tab.page] || TAB_ROOTS[tab.page];
                  navigate(dest);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}