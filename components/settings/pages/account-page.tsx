 client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, Mail, Camera, Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { profileKey } from '../settings-store'

interface AccountPageProps {
  user: User | null
  onBack: () => void
  onLogout: () => void
}

interface ProfileData {
  fullName: string
  nickname: string
  bio: string
  avatarUrl: string
}

export default function AccountPage({ user, onBack, onLogout }: AccountPageProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditProfile, setShowEditProfile]   = useState(false)
  const [profile, setProfile]                   = useState<ProfileData>({ fullName: '', nickname: '', bio: '', avatarUrl: '' })
  const [editProfile, setEditProfile]           = useState<ProfileData>({ fullName: '', nickname: '', bio: '', avatarUrl: '' })
  const [savingProfile, setSavingProfile]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const PROFILE_KEY = profileKey(user?.id)

  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setProfile({ fullName: parsed.fullName || '', nickname: parsed.nickname || '', bio: parsed.bio || '', avatarUrl: parsed.avatarUrl || '' })
      } catch { /* ignore */ }
    }
  }, [PROFILE_KEY])

  const maskedEmail = user?.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, (_: string, a: string, b: string, c: string) => a + '*'.repeat(Math.min(b.length, 6)) + c)
    : null

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    onLogout()
  }

  const handleGuestLogout = () => { onLogout() }

  const openEditProfile = () => {
    setEditProfile({ ...profile })
    setShowEditProfile(true)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setEditProfile(prev => ({ ...prev, avatarUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const updated = { ...editProfile }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
    setProfile(updated)
    setSavingProfile(false)
    setShowEditProfile(false)
  }

  const initials = profile.fullName
    ? profile.fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : (profile.nickname || user?.email?.split('@')[0] || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7] dark:bg-[#0d0f14]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] dark:bg-[#0d0f14] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200 dark:hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">Account settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">

        {/* Profile card */}
        <div className="mb-6 flex flex-col items-center rounded-2xl bg-white dark:bg-white/5 px-4 py-6">
          <div className="relative mb-3">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 text-[22px] font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          <p className="text-[17px] font-semibold text-gray-900 dark:text-white">{profile.fullName || profile.nickname || user?.email?.split('@')[0] || 'Guest'}</p>
          {profile.nickname && profile.fullName && (
            <p className="text-[13px] text-gray-400 dark:text-white/30">{profile.nickname}</p>
          )}
          {profile.bio && (
            <p className="mt-2 text-center text-[13px] text-gray-500 px-4">{profile.bio}</p>
          )}
          <button
            onClick={openEditProfile}
            className="mt-4 rounded-xl border border-gray-200 px-5 py-2 text-[14px] font-medium text-gray-700 transition hover:bg-gray-50 dark:hover:bg-white/5"
          >
            Edit Profile
          </button>
        </div>

        {/* Account info */}
        <p className="mb-2 px-1 text-[13px] text-gray-500 dark:text-white/50">Account</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white dark:bg-white/5 dark:bg-white/5">
          {user?.email && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500 dark:text-white/50" />
                <span className="text-[15px] text-gray-800 dark:text-white/90">Email</span>
              </div>
              <span className="text-[13px] text-gray-400 dark:text-white/30">{maskedEmail}</span>
            </div>
          )}
          {user?.app_metadata?.provider === 'google' && (
            <>
              {user?.email && <div className="mx-4 h-px bg-gray-100 dark:bg-white/10" />}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-[15px] text-gray-800 dark:text-white/90">Google</span>
                </div>
                <span className="text-[13px] text-gray-400 dark:text-white/30">Linked</span>
              </div>
            </>
          )}
          {!user && (
            <div className="px-4 py-3.5">
              <span className="text-[15px] text-gray-500 dark:text-white/50">Guest account — no login</span>
            </div>
          )}
        </div>

        {/* Danger actions */}
        {user ? (
          <>
            <div className="mb-3 overflow-hidden rounded-2xl bg-white dark:bg-white/5 dark:bg-white/5">
              <button
                onClick={() => setShowLogoutDialog(true)}
                className="w-full px-4 py-4 text-left text-[15px] font-medium text-red-500 transition active:bg-gray-50 dark:active:bg-white/5"
              >
                Log out of all devices
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white dark:bg-white/5 dark:bg-white/5">
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="w-full px-4 py-4 text-left text-[15px] font-medium text-red-500 transition active:bg-gray-50 dark:active:bg-white/5"
              >
                Delete account
              </button>
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-white/5 dark:bg-white/5">
            <button
              onClick={handleGuestLogout}
              className="w-full px-4 py-4 text-left text-[15px] font-medium text-red-500 transition active:bg-gray-50 dark:active:bg-white/5"
            >
              Clear data &amp; restart
            </button>
          </div>
        )}
      </div>

      {/* Edit Profile Sheet */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-t-3xl bg-white dark:bg-white/5 px-4 pb-8 pt-4">
            <div className="mb-5 flex items-center justify-between">
              <button onClick={() => setShowEditProfile(false)} className="text-[15px] text-gray-500 dark:text-white/50">Cancel</button>
              <p className="text-[17px] font-semibold text-gray-900 dark:text-white">Edit Profile</p>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="text-[15px] font-semibold text-[#4D6BFE] disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </button>
            </div>

            {/* Avatar picker */}
            <div className="mb-6 flex flex-col items-center">
              <div className="relative">
                {editProfile.avatarUrl ? (
                  <img src={editProfile.avatarUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 text-[22px] font-bold text-white">
                    {(editProfile.fullName || editProfile.nickname || 'U').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#4D6BFE] text-white shadow-md"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-[13px] text-[#4D6BFE]">
                Change photo
              </button>
            </div>

            {/* Fields */}
            {[
              { label: 'Full Name', key: 'fullName', placeholder: 'Your full name' },
              { label: 'Nickname', key: 'nickname', placeholder: 'What should Grozl call you?' },
            ].map(field => (
              <div key={field.key} className="mb-4">
                <p className="mb-1.5 text-[13px] text-gray-500 dark:text-white/50">{field.label}</p>
                <div className="rounded-2xl bg-gray-100 px-4 py-3">
                  <input
                    type="text"
                    value={editProfile[field.key as 'fullName' | 'nickname']}
                    onChange={e => setEditProfile(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/30"
                  />
                </div>
              </div>
            ))}
            <div className="mb-4">
              <p className="mb-1.5 text-[13px] text-gray-500 dark:text-white/50">Bio</p>
              <div className="rounded-2xl bg-gray-100 px-4 py-3">
                <textarea
                  value={editProfile.bio}
                  onChange={e => setEditProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="A little about yourself..."
                  rows={3}
                  className="w-full resize-none bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/30"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirm dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white dark:bg-white/5 dark:bg-white/5 shadow-2xl">
            <div className="px-5 py-5 text-center">
              <p className="text-[17px] font-semibold text-gray-900 dark:text-white">Confirm log out?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 dark:text-white/50">
                Logging out won't delete any data. You can sign back in anytime.
              </p>
            </div>
            <div className="flex border-t border-gray-100 dark:border-white/10">
              <button onClick={() => setShowLogoutDialog(false)} className="flex-1 py-3.5 text-[15px] text-gray-600 transition hover:bg-gray-50 dark:hover:bg-white/5 border-r border-gray-100 dark:border-white/10">
                Cancel
              </button>
              <button onClick={handleLogout} className="flex-1 py-3.5 text-[15px] font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white dark:bg-white/5 dark:bg-white/5 shadow-2xl">
            <div className="px-5 py-5 text-center">
              <p className="text-[17px] font-semibold text-gray-900 dark:text-white">Delete account?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 dark:text-white/50">
                This will permanently delete all your chats and memory. This cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-gray-100 dark:border-white/10">
              <button onClick={() => setShowDeleteDialog(false)} className="flex-1 py-3.5 text-[15px] text-gray-600 transition hover:bg-gray-50 dark:hover:bg-white/5 border-r border-gray-100 dark:border-white/10">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  localStorage.clear()
                  onLogout()
                }}
                className="flex-1 py-3.5 text-[15px] font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }

    
