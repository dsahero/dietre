import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface SignUpPageProps {
  onSignUp: (profileData: UserProfile) => void;
  onGoToLogin: () => void;
  onGoToHome: () => void;
  defaultEmail?: string;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

const PRESET_AVATARS = [
  {
    label: 'Host 1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Host 2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Host 3',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Host 4',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Host 5',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
];

export const SignUpPage: React.FC<SignUpPageProps> = ({
  onSignUp,
  onGoToLogin,
  onGoToHome,
  defaultEmail = '',
}) => {
  // All fields mirroring the Profile Page
  const [name, setName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Profile picture is NOT required - starts empty
  const [avatarUrl, setAvatarUrl] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [provider, setProvider] = useState<'Email & Password' | 'Google Account'>('Email & Password');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedCustom = isCustomAvatar && customAvatarUrl.trim();
  const activeAvatar = selectedCustom ? customAvatarUrl.trim() : (avatarUrl.trim() || DEFAULT_AVATAR);
  const hasUserChosenAvatar = Boolean(selectedCustom || avatarUrl.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
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

    setSuccessMessage('Creating your Host Profile and configuring workspace...');

    setTimeout(() => {
      const now = new Date();
      const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      const newProfile: UserProfile = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        avatarUrl: activeAvatar,
        provider,
        lastLogin: 'Just now',
        createdAt: monthYear,
      };

      onSignUp(newProfile);
    }, 800);
  };

  const handleQuickGoogleSignUp = () => {
    setErrorMessage(null);
    setSuccessMessage('Connecting Google credentials...');
    setTimeout(() => {
      const now = new Date();
      const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      onSignUp({
        name: name.trim() || 'Lily Dritten',
        email: email.trim().toLowerCase() || 'lilythedritten@gmail.com',
        avatarUrl: activeAvatar,
        provider: 'Google Account',
        lastLogin: 'Just now (Google OAuth)',
        createdAt: monthYear,
      });
    }, 600);
  };

  return (
    <div
      id="signup-page"
      className="min-h-screen w-full bg-[#F5EDE3] flex flex-col items-center justify-center p-4 sm:p-6 text-[#2B170F] select-none"
    >
      {/* Top Breadcrumb / Return to Homepage */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4 px-2">
        <button
          id="btn-signup-back-to-home"
          type="button"
          onClick={onGoToHome}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#523526] hover:text-[#2B170F] cursor-pointer bg-[#FAF5EF] hover:bg-white px-3 py-1.5 rounded-xl border border-[#DFCEBD] transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#C15C3D]" />
          <span>Back to Overview</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-[#7A6052]">
          <span>Already registered?</span>
          <button
            id="link-header-to-login"
            type="button"
            onClick={onGoToLogin}
            className="font-bold text-[#C15C3D] underline hover:text-[#8E3A20] cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>

      {/* Main Sign Up Card */}
      <div className="w-full max-w-lg bg-[#EFE5D8] rounded-3xl border border-[#DFCEBD] shadow-xl overflow-hidden transition-all duration-300">
        {/* Header banner */}
        <div className="bg-[#E5D7C7] border-b border-[#D5C2AF] p-6 text-center space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-[#C15C3D] text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
            <Sparkles className="w-5 h-5 text-[#FFDEC9]" />
          </div>
          <h2 className="text-xl font-bold font-serif text-[#2B170F] tracking-tight">
            Create Your Host Account
          </h2>
          <p className="text-xs text-[#7A6052] max-w-md mx-auto">
            Set up your host identity and security credentials to begin planning, scheduling, and managing venues and events.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {/* Feedback messages */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Section 1: Profile Identity (Name & Optional Photo) */}
            <div className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD] space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-serif text-[#472E21] uppercase tracking-wider">
                  1. Host Information
                </h3>
                <span className="text-[10px] text-[#8C6D5A] font-medium">
                  Name required • Photo optional
                </span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  Full Name <span className="text-[#C15C3D]">*</span>
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

              {/* Profile Photo (Optional) */}
              <div className="pt-0.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#523526]">
                    Profile Photo <span className="text-[#8C6D5A] font-normal">(Optional)</span>
                  </label>
                  {hasUserChosenAvatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('');
                        setCustomAvatarUrl('');
                        setIsCustomAvatar(false);
                      }}
                      className="text-[10px] font-semibold text-[#C15C3D] hover:text-[#8E3A20] underline cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#DFCEBD] bg-[#E8DDD0] flex items-center justify-center flex-shrink-0 shadow-2xs">
                    {hasUserChosenAvatar ? (
                      <img
                        src={activeAvatar}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-[#9C7F6E]" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('');
                          setCustomAvatarUrl('');
                          setIsCustomAvatar(false);
                        }}
                        className={`px-2 py-1 text-[10px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                          !hasUserChosenAvatar
                            ? 'bg-[#C15C3D] text-white border-[#C15C3D] shadow-2xs'
                            : 'bg-white text-[#523526] border-[#DFCEBD] hover:bg-[#FAF5EF]'
                        }`}
                      >
                        Default (No photo)
                      </button>

                      {PRESET_AVATARS.slice(0, 3).map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(item.url);
                            setIsCustomAvatar(false);
                          }}
                          className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-transform cursor-pointer ${
                            !isCustomAvatar && avatarUrl === item.url
                              ? 'border-[#C15C3D] scale-110 ring-2 ring-[#DFAB62]'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                          title={`Select ${item.label}`}
                        >
                          <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setIsCustomAvatar(!isCustomAvatar)}
                        className={`px-2 py-1 text-[10px] font-semibold rounded-lg border cursor-pointer transition-colors ${
                          isCustomAvatar
                            ? 'bg-[#C15C3D] text-white border-[#C15C3D]'
                            : 'bg-white text-[#523526] border-[#DFCEBD] hover:bg-[#FAF5EF]'
                        }`}
                      >
                        Custom URL
                      </button>
                    </div>

                    {isCustomAvatar && (
                      <div className="relative mt-1">
                        <ImageIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C7F6E]" />
                        <input
                          type="url"
                          value={customAvatarUrl}
                          onChange={(e) => setCustomAvatarUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/... (Optional)"
                          className="w-full pl-8 pr-2.5 py-1 text-[11px] bg-white border border-[#DFCEBD] rounded-lg text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-1 focus:ring-[#C15C3D]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Account Login Credentials */}
            <div className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#DFCEBD] space-y-3">
              <h3 className="text-xs font-bold font-serif text-[#472E21] uppercase tracking-wider">
                2. Login Credentials
              </h3>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  Email Address <span className="text-[#C15C3D]">*</span>
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

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  Password (minimum 6 characters) <span className="text-[#C15C3D]">*</span>
                </label>
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
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  Confirm Password <span className="text-[#C15C3D]">*</span>
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
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              id="btn-submit-host-signup"
              className="w-full py-3 px-4 bg-[#C15C3D] hover:bg-[#A8482C] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Create Host Account & Enter Dashboard</span>
              <ArrowRight className="w-4 h-4 text-[#FFDEC9]" />
            </button>
          </form>

          {/* Alternative: Google Sign Up option */}
          <div className="relative flex items-center justify-center my-1.5 gap-3">
            <div className="border-t border-[#DFCEBD] flex-1" />
            <span className="text-[11px] font-semibold text-[#8C6D5A] uppercase tracking-wider whitespace-nowrap shrink-0 select-none">
              Or quick register with
            </span>
            <div className="border-t border-[#DFCEBD] flex-1" />
          </div>

          <button
            type="button"
            onClick={handleQuickGoogleSignUp}
            className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF5EF] border border-[#DFCEBD] text-[#472E21] text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99]"
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
            <span>Sign up with Google</span>
          </button>

          {/* Switch to Login */}
          <div className="pt-3 border-t border-[#DFCEBD] text-center">
            <p className="text-xs text-[#7A6052]">
              Already have an account?{' '}
              <button
                type="button"
                id="link-switch-to-login"
                onClick={onGoToLogin}
                className="font-bold text-[#C15C3D] hover:underline cursor-pointer ml-1"
              >
                Log In
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-[11px] text-[#8C6D5A]">
        <span>Protected host credential storage • Terms of Event Service</span>
      </div>
    </div>
  );
};
