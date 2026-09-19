"use client";

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Lock,
  Trash2,
  LogOut,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Calendar,
  X,
} from 'lucide-react';

export interface ProfileData {
  host_id: string;
  email: string;
  name: string;
  avatar_data_url?: string;
  provider: 'firebase' | 'mock';
  created_at: string;
}

// Downscales + compresses an uploaded image client-side before it ever
// touches the network, so avatars stay well under the server's size cap
// regardless of the original photo's resolution.
async function fileToCompressedDataUrl(file: File, maxSize = 256, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported in this browser.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export function ProfileView({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_data_url);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNameFeedback({ type: 'error', message: 'Please choose an image file.' });
      return;
    }

    setAvatarBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_data_url: dataUrl }),
      });
      const data = (await res.json()) as { error?: string; profile?: ProfileData };
      if (!res.ok) throw new Error(data.error || 'Could not save photo.');
      setAvatarUrl(dataUrl);
      router.refresh();
    } catch (err) {
      setNameFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_data_url: null }),
      });
      if (!res.ok) throw new Error('Could not remove photo.');
      setAvatarUrl(undefined);
      router.refresh();
    } catch {
      setNameFeedback({ type: 'error', message: 'Could not remove photo.' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not save name.');
      setNameFeedback({ type: 'success', message: 'Name updated.' });
      setIsEditingName(false);
      router.refresh();
      setTimeout(() => setNameFeedback(null), 2000);
    } catch (err) {
      setNameFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Could not save name.' });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setPasswordBusy(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not change password.');
      setPasswordFeedback({ type: 'success', message: 'Password changed.' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordFeedback(null);
      }, 1200);
    } catch (err) {
      setPasswordFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Could not change password.' });
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleLogOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    setDeleteFeedback(null);
    setDeleteBusy(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not delete account.');
      router.push('/');
      router.refresh();
    } catch (err) {
      setDeleteFeedback(err instanceof Error ? err.message : 'Could not delete account.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div id="profile-page" className="min-h-screen w-full bg-[#F5EDE3] flex flex-col text-[#2B170F] select-none">
      <header className="h-16 w-full bg-[#EFE5D8] border-b border-[#DFCEBD] px-6 md:px-8 flex items-center shadow-xs sticky top-0 z-30">
        <Link
          href="/events"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#523526] hover:text-[#2B170F] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#C15C3D]" />
          <span>Back to Events</span>
        </Link>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Identity Card */}
        <div className="bg-[#EFE5D8] rounded-3xl border border-[#DFCEBD] shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#C15C3D] bg-[#FAF5EF] flex items-center justify-center text-2xl font-bold text-[#C15C3D]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                title="Change photo"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#C15C3D] hover:bg-[#A8482C] text-white flex items-center justify-center shadow-md cursor-pointer disabled:opacity-60"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
            </div>

            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <form onSubmit={handleNameSave} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-sm bg-white border border-[#DFCEBD] rounded-lg text-[#2B170F] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                  />
                  <button type="submit" className="text-xs font-semibold text-[#C15C3D] hover:underline cursor-pointer">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName(profile.name);
                      setIsEditingName(false);
                    }}
                    className="text-xs font-semibold text-[#7A6052] hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-serif text-[#2B170F] truncate">{name}</h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="text-[11px] font-semibold text-[#C15C3D] hover:underline cursor-pointer shrink-0"
                  >
                    Edit
                  </button>
                </div>
              )}
              <p className="text-xs text-[#7A6052] mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#9C7F6E]" />
                {profile.email}
              </p>
              <p className="text-[11px] text-[#8C6D5A] mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#9C7F6E]" />
                Host since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={avatarBusy}
              className="text-[11px] font-semibold text-[#7A6052] hover:text-[#C15C3D] underline cursor-pointer disabled:opacity-60"
            >
              Remove photo
            </button>
          )}

          {nameFeedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                nameFeedback.type === 'success'
                  ? 'bg-[#EEF2EB] text-[#3D5A38] border border-[#BFD1BA]'
                  : 'bg-[#FDF2F0] text-[#993A20] border border-[#F3C4BE]'
              }`}
            >
              {nameFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#687C64]" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#C15C3D]" />
              )}
              <span>{nameFeedback.message}</span>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className="bg-[#EFE5D8] rounded-3xl border border-[#DFCEBD] shadow-xs p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#472E21] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#C15C3D]" />
            Account Security
          </h3>

          {profile.provider === 'mock' ? (
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-3.5 bg-[#FAF5EF] hover:bg-white border border-[#DFCEBD] rounded-xl transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-xs font-semibold text-[#2B170F]">
                <Lock className="w-4 h-4 text-[#C15C3D]" />
                Change Password
              </span>
              <span className="text-[11px] text-[#8C6D5A]">Update →</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 p-3.5 bg-[#FAF5EF] border border-[#DFCEBD] rounded-xl text-xs text-[#7A6052]">
              <Lock className="w-4 h-4 text-[#9C7F6E] shrink-0" />
              <span>Your password is managed by Google/Firebase, not here.</span>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-[#EFE5D8] rounded-3xl border border-[#DFCEBD] shadow-xs p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#472E21]">Session</h3>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-between p-3.5 bg-[#FAF5EF] hover:bg-white border border-[#DFCEBD] rounded-xl transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5 text-xs font-semibold text-[#2B170F]">
              <LogOut className="w-4 h-4 text-[#C15C3D]" />
              Log Out
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between p-3.5 bg-[#FDF2F0] hover:bg-[#FBE6E1] border border-[#F3C4BE] rounded-xl transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5 text-xs font-semibold text-[#993A20]">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </span>
          </button>
        </div>
      </main>

      {/* MODAL: Change Password */}
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
                className="text-[#7A6052] hover:text-[#2B170F] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
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
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#687C64]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#C15C3D]" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">Current Password</label>
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
                <label className="block text-xs font-semibold text-[#523526] mb-1">New Password</label>
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
                <label className="block text-xs font-semibold text-[#523526] mb-1">Confirm New Password</label>
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
                  disabled={passwordBusy}
                  className="px-4 py-2 text-xs font-semibold bg-[#C15C3D] hover:bg-[#A8482C] text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {passwordBusy ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Log Out Confirmation */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-[#2B170F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EFE5D8] w-full max-w-sm rounded-2xl border border-[#DFCEBD] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#C15C3D] text-white flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-6 h-6 text-[#FFDEC9]" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold font-serif text-[#2B170F]">Sign out of your account?</h3>
              <p className="text-xs text-[#7A6052]">
                You&apos;ll need to sign back in with {profile.email} to manage your events.
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
                onClick={handleLogOut}
                className="flex-1 py-2 text-xs font-semibold bg-[#C15C3D] hover:bg-[#A8482C] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Account Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-[#2B170F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EFE5D8] w-full max-w-md rounded-2xl border border-[#DFCEBD] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#993A20] text-white flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold font-serif text-[#2B170F]">Delete your account?</h3>
              <p className="text-xs text-[#7A6052]">
                This removes your host profile permanently. Events you created stay in the database (guests keep
                their links working) but won&apos;t be editable without a new account.
              </p>
            </div>

            {deleteFeedback && (
              <div className="p-2.5 rounded-xl text-xs font-medium bg-[#FDF2F0] text-[#993A20] border border-[#F3C4BE] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteFeedback}</span>
              </div>
            )}

            {profile.provider === 'mock' && (
              <div>
                <label className="block text-xs font-semibold text-[#523526] mb-1">Confirm your password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DFCEBD] rounded-xl text-[#2B170F] placeholder:text-[#9C7F6E] focus:outline-none focus:ring-2 focus:ring-[#C15C3D]"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteFeedback(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-[#523526] bg-[#FAF5EF] hover:bg-white border border-[#DFCEBD] rounded-xl cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteBusy}
                className="flex-1 py-2 text-xs font-semibold bg-[#993A20] hover:bg-[#7A2E18] text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-60"
              >
                {deleteBusy ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
