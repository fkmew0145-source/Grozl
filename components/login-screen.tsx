'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LoginScreenProps {
  onGuestContinue?: () => void
}

export default function LoginScreen({ onGuestContinue }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        setIsLoading(false)
      }
      void data
    } catch {
      setError('Failed to start Google login')
      setIsLoading(false)
    }
  }

  const handleGuestContinue = () => {
    if (onGuestContinue) onGuestContinue()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3EF] dark:bg-[#1a1a1a] p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mx-auto mb-5 h-[90px] w-[90px]">
          <img src="/logo.png" alt="Grozl" className="w-full h-full object-contain" />
        </div>

        {/* Title */}
        <h1 className="mb-1.5 text-2xl font-semibold text-gray-900 dark:text-[#ececec]">Grozl AI</h1>
        <p className="mb-8 text-sm text-gray-500 dark:text-white/50">
          {"All the World's Best AI. One Platform."}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#2a2a2a] px-4 py-4 text-[15px] font-medium text-gray-800 dark:text-[#ececec] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <div className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-gray-300 dark:border-white/20 border-t-indigo-600" />
          ) : (
            <img
              src="https://cdn-icons-png.flaticon.com/512/300/300221.png"
              width={18}
              height={18}
              alt="Google"
            />
          )}
          {isLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-2.5 text-sm text-gray-400 dark:text-white/30">
          <span className="h-px flex-1 bg-gray-200 dark:bg-white/[0.08]" />
          or
          <span className="h-px flex-1 bg-gray-200 dark:bg-white/[0.08]" />
        </div>

        {/* Guest Continue */}
        <button
          onClick={handleGuestContinue}
          disabled={isLoading}
          className="w-full rounded-xl bg-indigo-50 dark:bg-indigo-500/20 px-4 py-4 text-[15px] font-medium text-indigo-600 dark:text-indigo-400 transition hover:bg-indigo-100 dark:hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue without account
        </button>

        {/* Footer */}
        <p className="mt-5 text-xs leading-relaxed text-gray-400 dark:text-white/30">
          By continuing, you agree to our{' '}
          <a
            href="#"
            className="relative font-medium text-indigo-600 dark:text-indigo-400 after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-indigo-600 after:transition-all hover:after:w-full"
          >
            Privacy Policy
          </a>
          .<br />
          Your data is safe with us.
        </p>
      </div>
    </div>
  )
    }
      
