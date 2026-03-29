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
    console.log('[v0] Starting Google OAuth login')
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      console.log('[v0] OAuth response:', { data, error })
      
      if (error) {
        console.error('[v0] OAuth error:', error)
        setError(error.message)
        setIsLoading(false)
      }
    } catch (err) {
      console.error('[v0] OAuth exception:', err)
      setError('Failed to start Google login')
      setIsLoading(false)
    }
  }

  const handleGuestContinue = () => {
    console.log('[v0] Guest continue clicked')
    if (onGuestContinue) {
      onGuestContinue()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mx-auto mb-5 h-[90px] w-[90px] rounded-full overflow-hidden shadow-lg shadow-indigo-500/15"
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Grozl" className="w-full h-full object-cover rounded-full" />
        </div>

        {/* Title */}
        <h1 className="mb-1.5 text-2xl font-semibold text-gray-900">Grozl AI</h1>
        <p className="mb-8 text-sm text-gray-500">
          {"All the World's Best AI. One Platform."}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-4 text-[15px] font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <div className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
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
        <div className="my-5 flex items-center gap-2.5 text-sm text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          or
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Guest Continue */}
        <button
          onClick={handleGuestContinue}
          disabled={isLoading}
          className="w-full rounded-xl bg-indigo-50 px-4 py-4 text-[15px] font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue without account
        </button>

        {/* Footer */}
        <p className="mt-5 text-xs leading-relaxed text-gray-400">
          By continuing, you agree to our{' '}
          <a
            href="#"
            className="relative font-medium text-indigo-600 after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-indigo-600 after:transition-all hover:after:w-full"
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
          
