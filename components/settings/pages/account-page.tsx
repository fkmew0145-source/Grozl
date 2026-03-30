'use client'

import { useState } from 'react'
import { ChevronLeft, Mail, Chrome } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AccountPageProps {
  user: User | null
  onBack: () => void
  onLogout: () => void
}

export default function AccountPage({ user, onBack, onLogout }: AccountPageProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const maskedEmail = user?.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, (_: string, a: string, b: string, c: string) => a + '*'.repeat(Math.min(b.length, 6)) + c)
    : null

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('grozl_user_profile')
    onLogout()
  }

  const handleGuestLogout = () => {
    localStorage.removeItem('grozl_user_profile')
    onLogout()
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">Account settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Profile section */}
        <p className="mb-2 px-1 text-[13px] text-gray-500">Profile</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-white">
          {user?.email && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <span className="text-[15px] text-gray-800">Email</span>
              </div>
              <span className="text-[13px] text-gray-400">{maskedEmail}</span>
            </div>
          )}
          {user?.app_metadata?.provider === 'google' && (
            <>
              {user?.email && <div className="mx-4 h-px bg-gray-100" />}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {/* Google G icon */}
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-[15px] text-gray-800">Google</span>
                </div>
                <span className="text-[13px] text-gray-400">Bound</span>
              </div>
            </>
          )}
          {!user && (
            <div className="px-4 py-3.5">
              <span className="text-[15px] text-gray-500">Guest account — no login</span>
            </div>
          )}
        </div>

        {/* Danger actions */}
        {user ? (
          <>
            <div className="mb-3 overflow-hidden rounded-2xl bg-white">
              <button
                onClick={() => setShowLogoutDialog(true)}
                className="w-full px-4 py-4 text-left text-[15px] font-medium text-red-500 transition active:bg-gray-50"
              >
                Log out of all devices
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white">
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="w-full px-4 py-4 text-left text-[15px] font-medium text-red-500 transition active:bg-gray-50"
              >
                Delete account
              </button>
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white">
            <button
              onClick={handleGuestLogout}
              className="w-full px-4 py-4 text-left text-[15px] font-medium text-red-500 transition active:bg-gray-50"
            >
              Clear data &amp; restart
            </button>
          </div>
        )}
      </div>

      {/* Logout confirm dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="px-5 py-5 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Confirm log out?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                Logging out won't delete any data. You can sign back in anytime.
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => setShowLogoutDialog(false)} className="flex-1 py-3.5 text-[15px] text-gray-600 transition hover:bg-gray-50 border-r border-gray-100">
                Cancel
              </button>
              <button onClick={handleLogout} className="flex-1 py-3.5 text-[15px] font-medium text-red-500 transition hover:bg-red-50">
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="px-5 py-5 text-center">
              <p className="text-[17px] font-semibold text-gray-900">Delete account?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                This will permanently delete all your chats and memory. This cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => setShowDeleteDialog(false)} className="flex-1 py-3.5 text-[15px] text-gray-600 transition hover:bg-gray-50 border-r border-gray-100">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  localStorage.clear()
                  onLogout()
                }}
                className="flex-1 py-3.5 text-[15px] font-medium text-red-500 transition hover:bg-red-50"
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
          
