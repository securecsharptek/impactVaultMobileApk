import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { authService } from '@/api/auth-service';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { signInWithGoogle, initializeGoogleAuth } from '@/lib/google-auth';
import { Mail, Lock, User, Eye, EyeOff, Loader, ArrowLeft, ArrowRight, Heart, Shield, HandHeart } from 'lucide-react';

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
    setSuccess('');
    setIsLoading(true);

    try {
      // Initialize Firebase if not already done
      await initializeGoogleAuth();
      console.log('[MobileLogin] Firebase Google Auth initialized');

      // Sign in with Google (handles both native and web)
      const signInResult = await signInWithGoogle();
      console.log('[MobileLogin] Google sign-in successful');

      if (!signInResult.idToken) {
        throw new Error('No ID token received from Google sign-in');
      }

      // Exchange Firebase token for Base44 session token
      console.log('[MobileLogin] Exchanging Firebase token for Base44 session');
      const authResult = await authService.authenticateWithFirebaseToken(
        signInResult.idToken,
        'google'
      );

      if (authResult.success && authResult.token) {
        // Verify token was stored
        const token = window.localStorage.getItem('base44_access_token');
        console.log('[MobileLogin] Base44 token stored:', !!token);

        if (token) {
          appParams.token = token;
          // Try to set token in base44 if possible
          try {
            base44.auth.setToken?.(token);
          } catch (e) {
            // Method might not exist, continue anyway
          }
        }

        setSuccess('Google sign-in successful! Redirecting...');

        // Set flag to navigate once authentication is confirmed
        setShouldNavigate(true);

        // Trigger auth state check
        setTimeout(() => {
          console.log('[MobileLogin] Triggering auth check after Google sign-in');
          checkAppState();
        }, 200);
      } else {
        throw new Error('Failed to authenticate with Base44');
      }
    } catch (err) {
      console.error('[MobileLogin] Google OAuth error:', err);
      const errorMessage = err.message || err.error?.message || 'Google sign-in failed. Please try again.';
      setError(errorMessage);
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
  const switchMode = (next) => {
    setMode(next);
    setError('');
    setSuccess('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F2EBDE]">
      <style>{`
        body, html {
          background: #F2EBDE;
          margin: 0;
          padding: 0;
          font-family: 'Inter', system-ui, sans-serif;
        }
      `}</style>

      <div className="w-full max-w-md mx-auto px-6 pt-10 pb-8">
        {/* Brand Header */}
        <div className="text-center">
          <h1
            className="text-[#9C7B57] font-black leading-[0.85] tracking-tight"
            style={{
              fontSize: '64px',
              letterSpacing: '-0.02em',
              fontStretch: 'condensed',
              transform: 'scaleY(1.15)',
              transformOrigin: 'top center',
            }}
          >
            IMPACT<br />VAULT
          </h1>
          <p className="mt-7 text-[11px] tracking-[0.35em] font-semibold text-[#9C7B57]">
            STRENGTH IN SYSTEMS
          </p>
          <div className="flex items-center justify-center gap-3 mt-3 mb-7">
            <div className="h-px w-16 bg-[#D4C5B0]" />
            <Heart className="w-3.5 h-3.5 text-[#C4A981]" strokeWidth={1.5} />
            <div className="h-px w-16 bg-[#D4C5B0]" />
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold text-[#2C2520] leading-tight">
            Your hard days<br />deserve to be remembered.
          </h2>
          <p className="text-[14px] text-[#7A7066] mt-3 leading-snug px-2">
            Capture real-life impacts on <span className="font-semibold text-[#5C5249]">functional capacity</span> in under 60 seconds so you can build a clearer picture over time.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-green-800 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Google Button */}
        <button
          onClick={handleGoogleOAuth}
          disabled={isLoading}
          type="button"
          className="w-full bg-[#A07F5C] hover:bg-[#8E6F4F] text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm"
        >
          <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </span>
          <span>{isLoading ? 'Please wait…' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-[#D4C5B0]" />
          <span className="text-xs italic text-[#9C8E7F]">or</span>
          <div className="h-px flex-1 bg-[#D4C5B0]" />
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-[#2C2520] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8E7F]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#E0D5C2] rounded-xl text-[#2C2520] placeholder-[#B8AB99] focus:outline-none focus:border-[#A07F5C] focus:ring-2 focus:ring-[#A07F5C]/20 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#2C2520] mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8E7F]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E0D5C2] rounded-xl text-[#2C2520] placeholder-[#B8AB99] focus:outline-none focus:border-[#A07F5C] focus:ring-2 focus:ring-[#A07F5C]/20 disabled:bg-stone-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#2C2520] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8E7F]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-3 bg-white border border-[#E0D5C2] rounded-xl text-[#2C2520] placeholder-[#B8AB99] focus:outline-none focus:border-[#A07F5C] focus:ring-2 focus:ring-[#A07F5C]/20 disabled:bg-stone-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C8E7F] hover:text-[#5C5249] disabled:cursor-not-allowed"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isFormValid()}
            className="w-full bg-[#A07F5C] hover:bg-[#8E6F4F] text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </>
            ) : (
              <>{mode === 'login' ? 'Sign in' : 'Create Account'}</>
            )}
          </button>
        </form>

        {/* Privacy Notice */}
        <div className="flex items-start gap-2 mt-5 px-2 text-center justify-center">
          <Shield className="w-4 h-4 text-[#9C8E7F] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-xs text-[#7A7066] leading-snug">
            Your information is private and protected.<br />
            We take the security of your data seriously.
          </p>
        </div>

        {/* New User Card */}
        <div className="mt-6 bg-[#EAE0CF]/60 border border-[#D4C5B0] rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <HandHeart className="w-5 h-5 text-[#A07F5C]" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#2C2520]">
                {mode === 'login' ? 'New to Impact Vault?' : 'Already have an account?'}
              </h3>
              <p className="text-xs text-[#7A7066] mt-0.5 leading-snug">
                {mode === 'login'
                  ? 'Create a free account and review the app. Subscription service required for usage.'
                  : 'Sign in with your existing credentials.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            disabled={isLoading}
            className="w-full mt-3 bg-white border border-[#D4C5B0] hover:bg-[#FAF5EC] text-[#2C2520] font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>{mode === 'login' ? 'Create Free Account' : 'Back to Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Forgot Password */}
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => setError('Password reset is not yet available. Please contact support.')}
            className="text-sm text-[#5C5249] underline underline-offset-2 hover:text-[#2C2520]"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileLogin;
