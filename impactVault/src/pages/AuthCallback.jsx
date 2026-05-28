import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleAuthCallbackPage, isNativeRuntime } from '@/lib/native-auth';
import { useAuth } from '@/lib/AuthContext';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      if (isNativeRuntime()) {
        // Close browser and refresh auth state
        await handleAuthCallbackPage(() => {
          checkAppState();
        });
      }
      
      // Give a moment for auth state to refresh, then navigate to dashboard
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    };

    processCallback();
  }, [navigate, checkAppState]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-slate-600">Completing sign in...</p>
      </div>
    </div>
  );
}
