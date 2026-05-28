import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import EmailPreview from './pages/EmailPreview';
import About from './pages/About';
import Contact from './pages/Contact';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { handleAuthCallbackPage, isNativeRuntime } from '@/lib/native-auth';
import AuthCallbackPage from './pages/AuthCallback';
import MobileLogin from './pages/MobileLogin';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const shouldRedirectToLogin = authError?.type === 'auth_required';
  const isMobileApp = isNativeRuntime();

  useEffect(() => {
    // For web, redirect to login; for mobile, show MobileLogin page
    if (shouldRedirectToLogin && !isMobileApp) {
      navigateToLogin();
    }
  }, [shouldRedirectToLogin, navigateToLogin, isMobileApp]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (shouldRedirectToLogin) {
      // On mobile, show the native login page
      if (isMobileApp) {
        return <MobileLogin />;
      }
      // On web, show loading while redirect happens
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-slate-700">Unable to initialize app.</p>
        <p className="text-xs text-slate-500 break-all">{authError.message}</p>
      </div>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/EmailPreview" element={<EmailPreview />} />
      <Route path="/About" element={<About />} />
      <Route path="/Contact" element={<Contact />} />
      <Route path="/MobileLogin" element={<MobileLogin />} />
      <Route path="/auth-callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App