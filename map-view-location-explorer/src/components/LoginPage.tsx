import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (profileData: Partial<UserProfile>) => void;
  onGoToSignUp: () => void;
  onGoToHome?: () => void;
  defaultEmail?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onGoToSignUp,
  onGoToHome,
  defaultEmail = 'lilythedritten@gmail.com',
}) => {
  // Mode: 'login' | 'signup' | 'forgot-password'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('login');

  // Form Fields
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Lily Dritten');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password email
  const [resetEmail, setResetEmail] = useState(defaultEmail);
  const [resetSent, setResetSent] = useState(false);

  // Feedback / Error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Google Login
  const handleGoogleLogin = () => {
    setErrorMessage(null);
    setSuccessMessage('Signing in with Google...');
    setTimeout(() => {
      onLogin({
        name: 'Lily Dritten',
        email: email.trim() || 'lilythedritten@gmail.com',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        provider: 'Google Account',
        lastLogin: 'Just now (Google OAuth)',
      });
    }, 600);
  };

  // Handle Email + Password Login
  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setSuccessMessage('Logging in...');
    setTimeout(() => {
      // Derive display name from email if not Lily
      const derivedName = email.split('@')[0].replace(/[._]/g, ' ');
      const formattedName =
        derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

      onLogin({
        name: formattedName || 'Lily Dritten',
        email: email.trim(),
        provider: 'Email & Password',
        lastLogin: 'Just now',
      });
    }, 600);
  };

  // Handle Sign Up
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSuccessMessage('Account created successfully! Signing in...');
    setTimeout(() => {
      onLogin({
        name: name.trim(),
        email: email.trim(),
        avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        provider: 'Email & Password',
        lastLogin: 'Just now',
        createdAt: 'September 2026',
      });
    }, 800);
  };

  // Handle Password Reset Request
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    setResetSent(true);
  };

  return (
    <div
      id="login-page"
      className="min-h-screen w-full bg-[#F5EDE3] flex flex-col items-center justify-center p-4 sm:p-6 text-[#2B170F] select-none"
    >
      {/* Top Breadcrumb / Return to Homepage */}
      {onGoToHome && (
        <div className="w-full max-w-md flex items-center justify-between mb-4 px-2">
          <button
            id="btn-login-back-to-home"
            type="button"
            onClick={onGoToHome}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#523526] hover:text-[#2B170F] cursor-pointer bg-[#FAF5EF] hover:bg-white px-3 py-1.5 rounded-xl border border-[#DFCEBD] transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C15C3D]" />
            <span>Back to Overview</span>
          </button>

          <button
            id="link-top-to-signup"
            type="button"
            onClick={onGoToSignUp}
            className="text-xs font-bold text-[#C15C3D] underline hover:text-[#8E3A20] cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Main Card Container */}
      <div className="w-full max-w-md bg-[#EFE5D8] rounded-3xl border border-[#DFCEBD] shadow-xl overflow-hidden transition-all duration-300">
        {/* Top Header Section */}
        <div className="bg-[#E5D7C7] border-b border-[#D5C2AF] p-6 text-center space-y-1">
          <h2 className="text-xl font-bold font-serif text-[#2B170F] tracking-tight">
            {authMode === 'login' && 'Host Sign In'}
            {authMode === 'signup' && 'Create Host Account'}
            {authMode === 'forgot-password' && 'Reset Host Password'}
          </h2>
          <p className="text-xs text-[#7A6052]">
            {authMode === 'login' && 'Log in to coordinate, plan, and manage your events and venues'}
            {authMode === 'signup' && 'Register as an event host to schedule, manage, and track your events'}
            {authMode === 'forgot-password' &&
              "Enter your registered host email and we'll send you recovery steps"}
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {/* Notification Feedback Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[#EEF2EB] border border-[#BFD1BA] rounded-xl text-xs font-semibold text-[#3D5A38] flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#687C64] flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================= VIEW 1: FORGOT PASSWORD ================= */}
          {authMode === 'forgot-password' ? (
            <div className="space-y-4">
              {resetSent ? (
                <div className="p-5 bg-[#FAF5EF] rounded-2xl border border-[#BFD1BA] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#EEF2EB] text-[#687C64] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold font-serif text-[#2B170F]">
                    Reset Link Dispatched
                  </h3>
                  <p className="text-xs text-[#7A6052] leading-relaxed">
                    We sent a password recovery link to{' '}
                    <span className="font-semibold text-[#2B170F] font-mono">
                      {resetEmail}
                    </span>
                    . Please check your inbox and spam folder.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setResetSent(false);
                      setAuthMode('login');
                    }}
                    className="w-full py-2.5 px-4 bg-[#C15C3D] hover:bg-[#A8482C] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    Return to Log In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#523526] mb-1.5">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7F6E]" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-send-reset-link"
                    className="w-full py-2.5 px-4 bg-[#C15C3D] hover:bg-[#A8482C] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 text-[#FFDEC9]" />
                    <span>Send Password Reset Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setAuthMode('login');
                    }}
                    className="w-full py-2 text-xs font-semibold text-[#7A6052] hover:text-[#2B170F] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Log In</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ================= VIEW 2: LOGIN & SIGN UP ================= */
            <>
              {/* Form: Email and Password */}
              <form
                onSubmit={authMode === 'login' ? handleEmailLogin : handleSignUp}
                className="space-y-3.5"
              >
                {/* Name field (visible only in Sign Up mode) */}
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#523526] mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7F6E]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Lily Dritten"
                        className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                      />
                    </div>
                  </div>
                )}

                {/* Email input */}
                <div>
                  <label className="block text-xs font-semibold text-[#523526] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7F6E]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                    />
                  </div>
                </div>

                {/* Password input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#523526]">
                      Password
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        id="link-forgot-password"
                        onClick={() => {
                          setErrorMessage(null);
                          setResetEmail(email);
                          setAuthMode('forgot-password');
                        }}
                        className="text-[11px] font-medium text-[#7A6052] hover:text-[#C15C3D] underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7F6E]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C7F6E] hover:text-[#523526] cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (only in Sign Up mode) */}
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#523526] mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C7F6E]" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C7F6E] hover:text-[#523526] cursor-pointer"
                        aria-label={
                          showConfirmPassword
                            ? 'Hide confirm password'
                            : 'Show confirm password'
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  id={authMode === 'login' ? 'btn-submit-login' : 'btn-submit-signup'}
                  className="w-full mt-2 py-2.5 px-4 bg-[#C15C3D] hover:bg-[#A8482C] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span>{authMode === 'login' ? 'Log In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 text-[#FFDEC9]" />
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1.5 gap-3">
                <div className="border-t border-[#DFCEBD] flex-1" />
                <span className="text-[11px] font-semibold text-[#8C6D5A] uppercase tracking-wider whitespace-nowrap shrink-0 select-none">
                  Or continue with
                </span>
                <div className="border-t border-[#DFCEBD] flex-1" />
              </div>

              {/* Log in with Google Button (Placed Under Log In Button) */}
              <div>
                <button
                  id="btn-login-google"
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF5EF] border border-[#DFCEBD] text-[#472E21] text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99]"
                >
                  {/* Official Google Vector Logo */}
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>
                    {authMode === 'login'
                      ? 'Log in with Google'
                      : 'Sign up with Google'}
                  </span>
                </button>
              </div>

              {/* Bottom Toggle: Don't have an account? Sign up / Already have an account? Log in */}
              <div className="pt-3 border-t border-[#DFCEBD] text-center">
                {authMode === 'login' ? (
                  <p className="text-xs text-[#7A6052]">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      id="link-switch-to-signup"
                      onClick={() => {
                        setErrorMessage(null);
                        onGoToSignUp();
                      }}
                      className="font-bold text-[#C15C3D] hover:underline cursor-pointer ml-1"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-[#7A6052]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      id="link-switch-to-login"
                      onClick={() => {
                        setErrorMessage(null);
                        setAuthMode('login');
                      }}
                      className="font-bold text-[#C15C3D] hover:underline cursor-pointer ml-1"
                    >
                      Log in
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-[11px] text-[#8C6D5A]">
        <span>Protected by standard encryption • Test session enabled</span>
      </div>
    </div>
  );
};
