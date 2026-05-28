import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { authService } from '@/api/auth-service';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { isNativeRuntime, openNativeGoogleLogin, getNativeAuthRedirectUrl } from '@/lib/native-auth';
import { Mail, Lock, User, Eye, EyeOff, Loader, ArrowLeft } from 'lucide-react';

const MobileLogin = () => {
  const navigate = useNavigate();
  const { checkAppState, isAuthenticated } = useAuth();
  
  const [screen, setScreen] = useState('auth'); // 'auth' or 'otp'
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [shouldNavigate, setShouldNavigate] = useState(false);

  // Refs for OTP input fields
  const otpInputRefs = useRef([]);
  const setOtpInputRef = (index, ref) => {
    if (ref) {
      otpInputRefs.current[index] = ref;
    }
  };

  // Watch for authentication success and navigate
  useEffect(() => {
    if (shouldNavigate && isAuthenticated) {
      console.log('[MobileLogin] Auth confirmed, navigating to Dashboard');
      navigate('/Dashboard', { replace: true });
      setShouldNavigate(false);
    }
  }, [shouldNavigate, isAuthenticated, navigate]);

  // Form validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = () => {
    if (mode === 'signup') {
      return (
        email.trim() &&
        password.trim() &&
        fullName.trim() &&
        isValidEmail(email) &&
        password.length >= 6
      );
    }
    return email.trim() && password.trim() && isValidEmail(email);
  };

  const isOtpValid = () => {
    return otpDigits.every((digit) => digit !== ''); // All 6 digits must be filled
  };

  // Handle OTP digit input change
  const handleOtpDigitChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);

    // Auto-focus next field if digit is entered
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP digit keydown (for backspace)
  const handleOtpDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (otpDigits[index]) {
        // Clear current digit
        const newOtpDigits = [...otpDigits];
        newOtpDigits[index] = '';
        setOtpDigits(newOtpDigits);
      } else if (index > 0) {
        // Move to previous field and clear it
        const newOtpDigits = [...otpDigits];
        newOtpDigits[index - 1] = '';
        setOtpDigits(newOtpDigits);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Cooldown timer for resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[MobileLogin] Attempting login with:', email);
      const result = await authService.login(email, password);
      
      console.log('[MobileLogin] Login result:', result);
      
      if (result.success && result.token) {
        // Verify token was stored
        const token = window.localStorage.getItem('base44_access_token');
        console.log('[MobileLogin] Token stored:', !!token);
        
        if (token) {
          appParams.token = token;
          // Try to set token in base44 if possible
          try {
            base44.auth.setToken?.(token);
          } catch (e) {
            // Method might not exist, continue anyway
          }
        }
        
        setSuccess('Login successful! Redirecting...');
        
        // Set flag to navigate once authentication is confirmed
        setShouldNavigate(true);
        
        // Trigger auth state check
        setTimeout(() => {
          console.log('[MobileLogin] Triggering auth check after login');
          checkAppState();
        }, 200);
      }
    } catch (err) {
      console.error('[MobileLogin] Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.register(email, password, fullName);
      
      if (result.success) {
        // Check if OTP verification is required
        // If the API returns a token directly, user is registered
        // If it requires OTP verification, proceed to OTP screen
        if (result.token) {
          // User registered and logged in without OTP
          // Update appParams with new token for auth context to recognize it
          const token = window.localStorage.getItem('base44_access_token');
          if (token) {
            appParams.token = token;
            // Try to set token in base44 if possible
            try {
              base44.auth.setToken?.(token);
            } catch (e) {
              // Method might not exist, continue anyway
            }
          }
          
          setSuccess('Account created successfully! Redirecting...');
          
          // Set flag to navigate once authentication is confirmed
          setShouldNavigate(true);
          
          // Trigger auth state check
          setTimeout(() => {
            console.log('[MobileLogin] Triggering auth check after signup');
            checkAppState();
          }, 200);
        } else {
          // OTP verification required
          setSuccess('Account created! Verify your email with OTP.');
          setScreen('otp');
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Signup error:', err);
      
      // Check if error message indicates OTP is required
      if (err.message && err.message.toLowerCase().includes('otp')) {
        setSuccess('Account created! Verify your email with OTP.');
        setScreen('otp');
        setIsLoading(false);
      } else {
        setError(err.message || 'Sign up failed. Please try again.');
        setIsLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isOtpValid()) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);

    try {
      const otpString = otpDigits.join('');
      console.log('[MobileLogin] Verifying OTP for:', email);
      const result = await authService.verifyOtp(email, otpString);
      
      console.log('[MobileLogin] OTP verification result:', result);
      
      if (result.success) {
        // Update appParams with new token for auth context to recognize it
        const token = window.localStorage.getItem('base44_access_token');
        console.log('[MobileLogin] Token stored after OTP:', !!token);
        
        if (token) {
          appParams.token = token;
          // Try to set token in base44 if possible
          try {
            base44.auth.setToken?.(token);
          } catch (e) {
            // Method might not exist, continue anyway
          }
        }
        
        setSuccess('Email verified! Redirecting...');
        console.log('[MobileLogin] OTP verified');
        
        // Set flag to navigate once authentication is confirmed
        setShouldNavigate(true);
        
        // Trigger auth state check
        setTimeout(() => {
          console.log('[MobileLogin] Triggering auth check after OTP verification');
          checkAppState();
        }, 200);
      }
    } catch (err) {
      console.error('[MobileLogin] OTP verification error:', err);
      setError(err.message || 'OTP verification failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) {
      setError(`Please wait ${resendCooldown} seconds before resending`);
      return;
    }

    setError('');
    setSuccess('');

    try {
      const result = await authService.resendOtp(email);
      
      if (result.success) {
        setSuccess('OTP resent successfully! Check your email.');
        setOtpDigits(['', '', '', '', '', '']); // Clear the inputs
        setResendCooldown(60); // 60 second cooldown
        // Focus first input
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'Failed to resend OTP. Please try again.');
    }
  };

  const handleGoogleOAuth = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (isNativeRuntime()) {
        const callbackUrl = getNativeAuthRedirectUrl();
        const googleOAuthUrl = authService.getOAuthUrlWithRedirect('google', callbackUrl);
        
        console.log('[Mobile Login] Opening Google OAuth with redirect:', callbackUrl);
        
        await openNativeGoogleLogin(googleOAuthUrl, () => {
          console.log('[Mobile Login] OAuth callback received, refreshing auth state');
          checkAppState();
        });
      } else {
        const oauthUrl = authService.getOAuthUrl('google', window.location.href);
        window.location.href = oauthUrl;
      }
    } catch (err) {
      console.error('OAuth error:', err);
      setError('Google login failed. Please try again.');
      setIsLoading(false);
    }
  };

  // OTP Verification Screen
  if (screen === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header with Back Button */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => {
                setScreen('auth');
                setOtpDigits(['', '', '', '', '', '']);
                setError('');
                setSuccess('');
              }}
              className="mr-4 p-2 hover:bg-amber-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Verify Email</h1>
              <p className="text-gray-600 text-sm">Check your inbox for OTP</p>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm font-medium">{success}</p>
              </div>
            )}

            {/* Email Display */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Verification code sent to:</p>
              <p className="text-lg font-semibold text-gray-900">{email}</p>
            </div>

            {/* OTP Input Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* OTP Input - 6 Separate Digits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Enter 6-Digit Code
                </label>
                <div className="flex gap-2 justify-between mb-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(ref) => setOtpInputRef(index, ref)}
                      type="text"
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpDigitKeyDown(index, e)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      maxLength="1"
                      disabled={isLoading}
                      inputMode="numeric"
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {otpDigits.filter((d) => d !== '').length}/6 digits entered
                </p>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={isLoading || !isOtpValid()}
                className="w-full bg-gradient-to-r from-amber-900 to-amber-700 hover:from-amber-800 hover:to-amber-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </button>
            </form>

            {/* Resend OTP */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Didn't receive the code?{' '}
              </p>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className="text-amber-900 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? (
                  <>Resend in {resendCooldown}s</>
                ) : (
                  <>Resend OTP</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login/Signup Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center p-4">
      <style>{`
        body {
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(to bottom right, #fef3c7, #fed7aa);
          margin: 0;
          padding: 0;
        }
        html {
          background: linear-gradient(to bottom right, #fef3c7, #fed7aa);
        }
      `}</style>

      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-900 rounded-lg mb-4">
            <span className="text-white font-bold text-xl">iV</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">impactVault</h1>
          <p className="text-gray-600 text-sm mt-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white text-amber-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-amber-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {/* Full Name - Only for Signup */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="w-full bg-gradient-to-r from-amber-900 to-amber-700 hover:from-amber-800 hover:to-amber-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {mode === 'login' ? 'Logging in...' : 'Creating account...'}
                </>
              ) : (
                <>{mode === 'login' ? 'Login' : 'Create Account'}</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleOAuth}
            disabled={isLoading}
            type="button"
            className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default MobileLogin;
