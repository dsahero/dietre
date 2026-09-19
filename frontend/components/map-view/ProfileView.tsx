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
import { HostThemeToggle } from '@/frontend/components/host-theme-toggle';

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
    <div id="profile-page" className="min-h-screen w-full bg-[var(--dash-bg)] flex flex-col text-[var(--dash-text)] select-none">
      <header className="h-16 w-full bg-[var(--dash-surface)] border-b border-[var(--dash-border)] px-6 md:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <Link
          href="/events"
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--dash-accent)]" />
          <span>Back to Events</span>
        </Link>
        <HostThemeToggle />
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Identity Card */}
        <div className="bg-[var(--dash-surface)] rounded-3xl border border-[var(--dash-border)] shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--dash-accent)] bg-[var(--dash-surface-raised)] flex items-center justify-center text-2xl font-bold text-[var(--dash-accent)]">
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
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white flex items-center justify-center shadow-md cursor-pointer disabled:opacity-60"
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
                    className="flex-1 px-2.5 py-1.5 text-sm bg-white border border-[var(--dash-border)] rounded-lg text-[var(--dash-text)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                  />
                  <button type="submit" className="text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName(profile.name);
                      setIsEditingName(false);
                    }}
                    className="text-xs font-semibold text-[var(--dash-text-soft)] hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-heading text-[var(--dash-text)] truncate">{name}</h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="text-[11px] font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer shrink-0"
                  >
                    Edit
                  </button>
                </div>
              )}
              <p className="text-xs text-[var(--dash-text-soft)] mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[var(--dash-text-muted)]" />
                {profile.email}
              </p>
              <p className="text-[11px] text-[var(--dash-text-muted)] mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[var(--dash-text-muted)]" />
                Host since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={avatarBusy}
              className="text-[11px] font-semibold text-[var(--dash-text-soft)] hover:text-[var(--dash-accent)] underline cursor-pointer disabled:opacity-60"
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
                <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--dash-accent)]" />
              )}
              <span>{nameFeedback.message}</span>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className="bg-[var(--dash-surface)] rounded-3xl border border-[var(--dash-border)] shadow-xs p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dash-text)] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--dash-accent)]" />
            Account Security
          </h3>

          {profile.provider === 'mock' ? (
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-3.5 bg-[var(--dash-surface-raised)] hover:bg-white border border-[var(--dash-border)] rounded-xl transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-xs font-semibold text-[var(--dash-text)]">
                <Lock className="w-4 h-4 text-[var(--dash-accent)]" />
                Change Password
              </span>
              <span className="text-[11px] text-[var(--dash-text-muted)]">Update →</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 p-3.5 bg-[var(--dash-surface-raised)] border border-[var(--dash-border)] rounded-xl text-xs text-[var(--dash-text-soft)]">
              <Lock className="w-4 h-4 text-[var(--dash-text-muted)] shrink-0" />
              <span>Your password is managed by Google/Firebase, not here.</span>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-[var(--dash-surface)] rounded-3xl border border-[var(--dash-border)] shadow-xs p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dash-text)]">Session</h3>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-between p-3.5 bg-[var(--dash-surface-raised)] hover:bg-white border border-[var(--dash-border)] rounded-xl transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5 text-xs font-semibold text-[var(--dash-text)]">
              <LogOut className="w-4 h-4 text-[var(--dash-accent)]" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--dash-surface)] w-full max-w-md rounded-2xl border border-[var(--dash-border)] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--dash-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--dash-accent)] text-white flex items-center justify-center">
                  <Lock className="w-4 h-4 text-[#FFDEC9]" />
                </div>
                <h3 className="text-sm font-bold font-heading text-[var(--dash-text)]">Change Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] cursor-pointer"
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
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--dash-accent)]" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--dash-text-soft)] mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--dash-text-soft)] mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--dash-text-soft)] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--dash-text-soft)] hover:bg-[var(--dash-surface-hover)] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordBusy}
                  className="px-4 py-2 text-xs font-semibold bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--dash-surface)] w-full max-w-sm rounded-2xl border border-[var(--dash-border)] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[var(--dash-accent)] text-white flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-6 h-6 text-[#FFDEC9]" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold font-heading text-[var(--dash-text)]">Sign out of your account?</h3>
              <p className="text-xs text-[var(--dash-text-soft)]">
                You&apos;ll need to sign back in with {profile.email} to manage your events.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-[var(--dash-text-soft)] bg-[var(--dash-surface-raised)] hover:bg-white border border-[var(--dash-border)] rounded-xl cursor-pointer shadow-2xs"
              >
                Stay Signed In
              </button>
              <button
                onClick={handleLogOut}
                className="flex-1 py-2 text-xs font-semibold bg-[var(--dash-accent)] hover:bg-[var(--dash-accent-deep)] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Account Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--dash-surface)] w-full max-w-md rounded-2xl border border-[var(--dash-border)] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#993A20] text-white flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold font-heading text-[var(--dash-text)]">Delete your account?</h3>
              <p className="text-xs text-[var(--dash-text-soft)]">
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
                <label className="block text-xs font-semibold text-[var(--dash-text-soft)] mb-1">Confirm your password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-white border border-[var(--dash-border)] rounded-xl text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent)]"
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
                className="flex-1 py-2 text-xs font-semibold text-[var(--dash-text-soft)] bg-[var(--dash-surface-raised)] hover:bg-white border border-[var(--dash-border)] rounded-xl cursor-pointer shadow-2xs"
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
