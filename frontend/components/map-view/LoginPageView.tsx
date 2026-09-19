"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { HostThemeToggle } from '@/frontend/components/host-theme-toggle';

function firebaseConfiguredInBrowser(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function LoginPageView() {
  const router = useRouter();
  const firebaseOn = firebaseConfiguredInBrowser();

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetAcknowledged, setResetAcknowledged] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleGoogleLogin = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const { getFirebaseAuth } = await import('@/frontend/lib/firebase');
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase is not configured in this browser.');
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await cred.user.getIdToken();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cred.user.email || undefined,
          firebaseToken: token,
          name: cred.user.displayName || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not sign in with Google.');
      router.push('/events');
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setBusy(true);
    try {
      if (firebaseOn) {
        const { getFirebaseAuth } = await import('@/frontend/lib/firebase');
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Firebase is not configured in this browser.');
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const token = await cred.user.getIdToken();
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cred.user.email, firebaseToken: token }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not sign in.');
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not sign in.');
      }
      router.push('/events');
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
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

    setBusy(true);
    try {
      if (firebaseOn) {
        const { getFirebaseAuth } = await import('@/frontend/lib/firebase');
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Firebase is not configured in this browser.');
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        const token = await cred.user.getIdToken();
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cred.user.email, firebaseToken: token, name: name.trim() }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not create your account.');
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not create your account.');
      }
      router.push('/events');
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign-up failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    setResetAcknowledged(true);
  };

  return (
    <div
      id="login-page"
      className="min-h-screen w-full bg-[var(--dash-bg)] flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--dash-text)] select-none"
    >
      <div className="w-full max-w-md flex items-center justify-between mb-4 px-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] cursor-pointer bg-[var(--dash-surface-raised)] hover:bg-[var(--dash-surface-hover)] px-3 py-1.5 rounded-xl border border-[var(--dash-border)] transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[var(--dash-accent)]" />
          <span>Back Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <HostThemeToggle />
          <button
            id="link-top-to-signup"
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setAuthMode('signup');
            }}
            className="text-xs font-bold text-[var(--dash-accent)] underline hover:text-[var(--dash-accent-deep)] cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </div>

      <div className="w-full max-w-md bg-[var(--dash-surface)] rounded-3xl border border-[var(--dash-border)] shadow-xl overflow-hidden transition-all duration-300">
        <div className="bg-[var(--dash-surface-hover)] border-b border-[var(--dash-border)] p-6 text-center space-y-1">
          <h2 className="text-xl font-bold font-heading text-[var(--dash-text)] tracking-tight">
            {authMode === 'login' && 'Host Sign In'}
            {authMode === 'signup' && 'Create Host Account'}
            {authMode === 'forgot-password' && 'Reset Host Password'}
          </h2>
          <p className="text-xs text-[var(--dash-text-soft)]">
            {authMode === 'login' && 'Sign in to create events and manage your dashboard'}
            {authMode === 'signup' && 'Register as a host to start collecting anonymous dietary responses'}
            {authMode === 'forgot-password' && 'Enter your registered host email'}
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {authMode === 'forgot-password' ? (
            <div className="space-y-4">
              {resetAcknowledged ? (
                <div className="p-5 bg-[var(--dash-surface-raised)] rounded-2xl border border-[var(--dash-border)] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--dash-surface-hover)] text-[var(--dash-accent)] flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold font-heading text-[var(--dash-text)]">Not available in this demo</h3>
                  <p className="text-xs text-[var(--dash-text-soft)] leading-relaxed">
                    This demo doesn&apos;t send real emails, so password recovery isn&apos;t wired up. If you
                    remember your password, sign in normally — otherwise, sign up for a new account.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setResetAcknowledged(false);
                      setAuthMode('login');
                    }}
                    className="w-full py-2.5 px-4 bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    Return to Log In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--dash-text-soft)] mb-1.5">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 text-[#FFDEC9]" />
                    <span>Continue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setAuthMode('login');
                    }}
                    className="w-full py-2 text-xs font-semibold text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Log In</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <form onSubmit={authMode === 'login' ? handleEmailLogin : handleSignUp} className="space-y-3.5">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--dash-text-soft)] mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[var(--dash-text-soft)] mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--dash-text-soft)]">Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setResetEmail(email);
                          setAuthMode('forgot-password');
                        }}
                        className="text-[11px] font-medium text-[var(--dash-text-soft)] hover:text-[var(--dash-accent)] underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-soft)] cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--dash-text-soft)] mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-soft)] cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full mt-2 py-2.5 px-4 bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
                >
                  <span>{busy ? 'Please wait…' : authMode === 'login' ? 'Log In' : 'Create Account'}</span>
                  {!busy && <ArrowRight className="w-4 h-4 text-[#FFDEC9]" />}
                </button>
              </form>

              {firebaseOn && (
                <>
                  <div className="relative flex items-center justify-center my-1.5 gap-3">
                    <div className="border-t border-[var(--dash-border)] flex-1" />
                    <span className="text-[11px] font-semibold text-[var(--dash-text-muted)] uppercase tracking-wider whitespace-nowrap shrink-0 select-none">
                      Or continue with
                    </span>
                    <div className="border-t border-[var(--dash-border)] flex-1" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={busy}
                    className="w-full py-2.5 px-4 bg-white hover:bg-[var(--dash-surface-raised)] border border-[var(--dash-border)] text-[var(--dash-text)] text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                    <span>{authMode === 'login' ? 'Log in with Google' : 'Sign up with Google'}</span>
                  </button>
                </>
              )}

              {!firebaseOn && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--dash-text-muted)] bg-[var(--dash-surface-raised)] border border-[var(--dash-border)] rounded-xl p-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#687C64] shrink-0" />
                  <span>Running in local demo mode — accounts are real, stored in this project&apos;s own database.</span>
                </div>
              )}

              <div className="pt-3 border-t border-[var(--dash-border)] text-center">
                {authMode === 'login' ? (
                  <p className="text-xs text-[var(--dash-text-soft)]">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setAuthMode('signup');
                      }}
                      className="font-bold text-[var(--dash-accent)] hover:underline cursor-pointer ml-1"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-[var(--dash-text-soft)]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setAuthMode('login');
                      }}
                      className="font-bold text-[var(--dash-accent)] hover:underline cursor-pointer ml-1"
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

      <div className="mt-6 text-center text-[11px] text-[var(--dash-text-muted)]">
        <span>Guests never sign in — this door is only for hosts creating events.</span>
      </div>
    </div>
  );
}
