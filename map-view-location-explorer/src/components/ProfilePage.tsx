import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Trash2,
  LogOut,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Calendar,
  Clock,
} from 'lucide-react';

interface ProfilePageProps {
  profile: UserProfile;
  onUpdateEmail: (newEmail: string) => void;
  onUpdateName?: (newName: string) => void;
  onUpdateAvatar?: (newAvatar: string) => void;
  onDeleteAccount: () => void;
  onLogOut: () => void;
  onGoToLogin?: () => void;
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  onUpdateEmail,
  onUpdateName,
  onUpdateAvatar,
  onDeleteAccount,
  onLogOut,
  onGoToLogin,
  onBack,
}) => {
  // Modal / Tab states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Email form state
  const [newEmail, setNewEmail] = useState('');
  const [emailPasswordConfirm, setEmailPasswordConfirm] = useState('');
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete confirmation text
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Edit Avatar URL state
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarInput, setAvatarInput] = useState(profile.avatarUrl);

  // Edit Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);

  // Handle Email Change
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@') || !newEmail.includes('.')) {
      setEmailFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    if (newEmail.trim().toLowerCase() === profile.email.toLowerCase()) {
      setEmailFeedback({ type: 'error', message: 'New email must be different from current email.' });
      return;
    }
    if (!emailPasswordConfirm.trim()) {
      setEmailFeedback({ type: 'error', message: 'Please enter your current password to authorize this change.' });
      return;
    }

    onUpdateEmail(newEmail.trim());
    setEmailFeedback({ type: 'success', message: 'Email address updated successfully!' });
    setTimeout(() => {
      setShowEmailModal(false);
      setNewEmail('');
      setEmailPasswordConfirm('');
      setEmailFeedback(null);
    }, 1200);
  };

  // Handle Password Change
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setPasswordFeedback({ type: 'success', message: 'Password changed successfully!' });
    setTimeout(() => {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback(null);
    }, 1200);
  };

  const handleAvatarSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (avatarInput.trim() && onUpdateAvatar) {
      onUpdateAvatar(avatarInput.trim());
    }
    setIsEditingAvatar(false);
  };

  const handleNameSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim() && onUpdateName) {
      onUpdateName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div
      id="profile-page"
      className="min-h-screen w-full bg-[#F5EDE3] flex flex-col text-[#2B170F] select-none"
    >
      {/* Top Header */}
      <header className="h-16 w-full bg-[#EFE5D8] border-b border-[#DFCEBD] px-6 md:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            id="btn-profile-back"
            onClick={onBack}
            className="p-2 rounded-xl bg-[#FAF5EF] hover:bg-white text-[#523526] hover:text-[#2B170F] border border-[#DFCEBD] shadow-2xs transition-all cursor-pointer flex items-center justify-center"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[#C15C3D]" />
          </button>
          <div>
            <h1 className="text-lg font-bold font-serif text-[#2B170F] leading-tight">
              User Profile
            </h1>
            <p className="text-xs text-[#7A6052]">
              Manage your personal information, credentials, and account settings
            </p>
          </div>
        </div>

        {/* Profile Circle on top right */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#C15C3D] shadow-xs">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* Main Profile Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Profile Identity Card */}
        <div className="bg-[#EFE5D8] rounded-2xl border border-[#DFCEBD] p-6 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Profile Picture */}
          <div className="relative group flex-shrink-0">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#FAF5EF] shadow-md bg-[#E8DDD0]">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                }}
              />
            </div>
            <button
              id="btn-edit-avatar"
              onClick={() => setIsEditingAvatar((prev) => !prev)}
              title="Change Profile Photo"
              className="absolute bottom-1 right-1 p-2 bg-[#C15C3D] text-white rounded-full hover:bg-[#A8482C] shadow-md cursor-pointer transition-colors"
            >
              <Camera className="w-4 h-4 text-[#FFDEC9]" />
            </button>
          </div>

          {/* Name & Basic Info */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {isEditingName ? (
                <form onSubmit={handleNameSave} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-3 py-1 bg-white border border-[#DFCEBD] rounded-lg text-sm font-bold font-serif text-[#2B170F] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                    placeholder="Your Name"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs bg-[#C15C3D] text-white rounded-lg hover:bg-[#A8482C] cursor-pointer font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(profile.name);
                      setIsEditingName(false);
                    }}
                    className="px-2 py-1 text-xs text-[#7A6052] hover:text-[#2B170F] cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold font-serif text-[#2B170F] tracking-tight">
                    {profile.name}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-xs text-[#C15C3D] hover:text-[#8E3A20] underline cursor-pointer ml-1"
                  >
                    Edit
                  </button>
                </div>
              )}

              <span className="inline-flex items-center gap-1.5 self-center sm:self-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF2EB] text-[#3D5A38] border border-[#BFD1BA]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#687C64]" />
                Active Account
              </span>
            </div>

            <p className="text-sm font-medium text-[#523526] flex items-center justify-center sm:justify-start gap-2">
              <Mail className="w-4 h-4 text-[#C15C3D] flex-shrink-0" />
              <span>{profile.email}</span>
            </p>

            {/* Account meta details */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#7A6052]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C15C3D]" />
                Member since {profile.createdAt}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C15C3D]" />
                Last active {profile.lastLogin}
              </span>
            </div>

            {/* Quick avatar edit popup form if open */}
            {isEditingAvatar && (
              <form onSubmit={handleAvatarSave} className="mt-3 p-3 bg-[#FAF5EF] border border-[#DFCEBD] rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-[#523526]">
                  Profile Image URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarInput}
                    onChange={(e) => setAvatarInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#DFCEBD] rounded-lg text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#C15C3D] text-white rounded-lg text-xs font-semibold hover:bg-[#A8482C] cursor-pointer"
                  >
                    Update Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAvatar(false)}
                    className="px-2 py-1.5 text-xs text-[#7A6052] hover:text-[#2B170F] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Account Credentials & Security Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Email Login Info & Change Email */}
          <div className="bg-[#EFE5D8] rounded-2xl border border-[#DFCEBD] p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C15C3D] text-white flex items-center justify-center shadow-xs">
                  <Mail className="w-4 h-4 text-[#FFDEC9]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-serif text-[#2B170F]">
                    Email Log In Info
                  </h3>
                  <p className="text-xs text-[#7A6052]">
                    Primary login credential and notifications
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-[#FAF5EF] rounded-xl border border-[#DFCEBD] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6052] font-medium">Current Login Email:</span>
                  <span className="font-semibold text-[#2B170F] font-mono">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6052] font-medium">Auth Provider:</span>
                  <span className="text-[#523526] font-medium">{profile.provider}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6052] font-medium">Verification Status:</span>
                  <span className="text-[#3D5A38] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#687C64]" /> Verified
                  </span>
                </div>
              </div>
            </div>

            <button
              id="btn-open-change-email"
              onClick={() => {
                setShowEmailModal(true);
                setEmailFeedback(null);
                setNewEmail('');
                setEmailPasswordConfirm('');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#FAF5EF] hover:bg-white border border-[#DFCEBD] text-[#472E21] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4 text-[#C15C3D]" />
              <span>Change Email Address</span>
            </button>
          </div>

          {/* Card 2: Password Security & Change Password */}
          <div className="bg-[#EFE5D8] rounded-2xl border border-[#DFCEBD] p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C15C3D] text-white flex items-center justify-center shadow-xs">
                  <KeyRound className="w-4 h-4 text-[#FFDEC9]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-serif text-[#2B170F]">
                    Password & Security
                  </h3>
                  <p className="text-xs text-[#7A6052]">
                    Manage access credentials and password policy
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-[#FAF5EF] rounded-xl border border-[#DFCEBD] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6052] font-medium">Password:</span>
                  <span className="font-semibold text-[#2B170F] tracking-widest">••••••••••••</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6052] font-medium">Last Changed:</span>
                  <span className="text-[#523526]">30 days ago</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6052] font-medium">Security Level:</span>
                  <span className="text-[#687C64] font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#687C64]" /> Standard
                  </span>
                </div>
              </div>
            </div>

            <button
              id="btn-open-change-password"
              onClick={() => {
                setShowPasswordModal(true);
                setPasswordFeedback(null);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#FAF5EF] hover:bg-white border border-[#DFCEBD] text-[#472E21] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-[#C15C3D]" />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {/* Danger Zone: Log Out & Delete Account */}
        <div className="bg-[#EFE5D8] rounded-2xl border border-[#DFCEBD] p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold font-serif text-[#2B170F]">
              Account Actions
            </h3>
            <p className="text-xs text-[#7A6052]">
              Sign out of this device session or permanently delete your account
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Log Out Button */}
            <div className="p-4 bg-[#FAF5EF] rounded-xl border border-[#DFCEBD] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-[#472E21] flex items-center gap-1.5">
                  <LogOut className="w-4 h-4 text-[#C15C3D]" />
                  Sign Out
                </h4>
                <p className="text-[11px] text-[#7A6052] mt-0.5">
                  End your current session. You can log back in at any time with your credentials.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  id="btn-open-logout-modal"
                  onClick={() => setShowLogoutModal(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#C15C3D] hover:bg-[#A8482C] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#FFDEC9]" />
                  <span>Log Out</span>
                </button>
                {onGoToLogin && (
                  <button
                    id="btn-switch-account-login"
                    onClick={onGoToLogin}
                    className="py-2 px-3 rounded-xl bg-white hover:bg-[#FAF5EF] border border-[#DFCEBD] text-[#523526] text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="Open Login Screen"
                  >
                    <span>Switch Account</span>
                  </button>
                )}
              </div>
            </div>

            {/* Delete Account Button */}
            <div className="p-4 bg-[#FDF2F0] rounded-xl border border-[#F3C4BE] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-[#993A20] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#C15C3D]" />
                  Delete Account
                </h4>
                <p className="text-[11px] text-[#A85139] mt-0.5">
                  Permanently delete your profile, saved settings, and all associated personal records.
                </p>
              </div>
              <button
                id="btn-open-delete-modal"
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteConfirmText('');
                }}
                className="w-full py-2 px-3.5 rounded-xl bg-[#C15C3D] hover:bg-[#993A20] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ================= MODAL: CHANGE EMAIL ================= */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-[#2B170F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EFE5D8] w-full max-w-md rounded-2xl border border-[#DFCEBD] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFCEBD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C15C3D] text-white flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[#FFDEC9]" />
                </div>
                <h3 className="text-sm font-bold font-serif text-[#2B170F]">Change Email Address</h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-[#7A6052] hover:text-[#2B170F] text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {emailFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  emailFeedback.type === 'success'
                    ? 'bg-[#EEF2EB] text-[#3D5A38] border border-[#BFD1BA]'
                    : 'bg-[#FDF2F0] text-[#993A20] border border-[#F3C4BE]'
                }`}
              >
                {emailFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#687C64]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#C15C3D]" />
                )}
                <span>{emailFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  Current Email
                </label>
                <input
                  type="text"
                  disabled
                  value={profile.email}
                  className="w-full px-3 py-2 text-xs bg-[#E8DDD0] border border-[#DFCEBD] rounded-xl text-[#7A6052] font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="your.new.email@example.com"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  Current Password (for authorization)
                </label>
                <input
                  type="password"
                  required
                  value={emailPasswordConfirm}
                  onChange={(e) => setEmailPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7A6052] hover:bg-[#E8DDD0] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#C15C3D] hover:bg-[#A8482C] text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm New Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE PASSWORD ================= */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-[#2B170F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EFE5D8] w-full max-w-md rounded-2xl border border-[#DFCEBD] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFCEBD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C15C3D] text-white flex items-center justify-center">
                  <Lock className="w-4 h-4 text-[#FFDEC9]" />
                </div>
                <h3 className="text-sm font-bold font-serif text-[#2B170F]">Change Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-[#7A6052] hover:text-[#2B170F] text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  passwordFeedback.type === 'success'
                    ? 'bg-[#EEF2EB] text-[#3D5A38] border border-[#BFD1BA]'
                    : 'bg-[#FDF2F0] text-[#993A20] border border-[#F3C4BE]'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#687C64]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#C15C3D]" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7A6052] hover:bg-[#E8DDD0] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#C15C3D] hover:bg-[#A8482C] text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOG OUT CONFIRMATION ================= */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-[#2B170F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EFE5D8] w-full max-w-sm rounded-2xl border border-[#DFCEBD] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#C15C3D] text-white flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-6 h-6 text-[#FFDEC9]" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold font-serif text-[#2B170F]">Sign out of your account?</h3>
              <p className="text-xs text-[#7A6052]">
                You will need to sign back in with {profile.email} to continue exploring events.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-[#523526] bg-[#FAF5EF] hover:bg-white border border-[#DFCEBD] rounded-xl cursor-pointer shadow-2xs"
              >
                Stay Signed In
              </button>
              <button
                id="btn-confirm-logout"
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogOut();
                }}
                className="flex-1 py-2 text-xs font-semibold bg-[#C15C3D] hover:bg-[#A8482C] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE ACCOUNT CONFIRMATION ================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-[#2B170F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EFE5D8] w-full max-w-md rounded-2xl border border-[#DFCEBD] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF2F0] text-[#C15C3D] flex items-center justify-center mx-auto border border-[#F3C4BE]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold font-serif text-[#993A20]">
                Permanently Delete Account?
              </h3>
              <p className="text-xs text-[#A85139]">
                This action cannot be undone. All your saved bookmarks, personal data, and preferences will be erased immediately.
              </p>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-[#F3C4BE] space-y-2">
              <label className="block text-xs font-semibold text-[#523526]">
                To confirm deletion, type <span className="font-mono text-[#C15C3D] font-bold">DELETE</span> below:
              </label>
              <input
                id="input-delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 text-xs bg-white border border-[#F3C4BE] rounded-xl text-[#2B170F] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#7A6052] hover:bg-[#E8DDD0] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-account"
                type="button"
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={() => {
                  setShowDeleteModal(false);
                  onDeleteAccount();
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#C15C3D] hover:bg-[#993A20] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
