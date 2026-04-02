'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LoginScreenProps {
  onGuestContinue?: () => void
}

export default function LoginScreen({ onGuestContinue }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setError(error.message); setIsLoading(false) }
      void data
    } catch {
      setError('Failed to start Google login')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d0f14] p-6">

      {/* Premium background glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute right-1/4 top-1/3 h-[250px] w-[250px] rounded-full bg-blue-600/8 blur-[80px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm text-center">

        {/* Logo with glow */}
        <div className="mx-auto mb-6 flex h-[88px] w-[88px] items-center justify-center">
          <div className="absolute h-[88px] w-[88px] rounded-full bg-indigo-500/20 blur-2xl" />
          <img src="/logo.png" alt="Grozl" className="relative h-full w-full object-contain drop-shadow-2xl" />
        </div>

        {/* Title — bright and premium */}
        <h1 className="mb-2 bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-[28px] font-bold tracking-tight text-transparent">
          Grozl AI
        </h1>
        <p className="mb-10 text-[14px] text-white/40">
          All the World&apos;s Best AI. One Platform.
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-400">
            {error}
          </div>
        )}

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="group relative mb-3 flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/[0.12] bg-white px-5 py-4 text-[15px] font-semibold text-gray-800 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          ) : (
            <img
              src="https://cdn-icons-png.flaticon.com/512/300/300221.png"
              width={20} height={20} alt="Google"
            />
          )}
          {isLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="my-4 flex items-center gap-3 text-[13px] text-white/20">
          <span className="h-px flex-1 bg-white/[0.08]" />
          or
          <span className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Guest button */}
        <button
          onClick={onGuestContinue}
          disabled={isLoading}
          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-5 py-4 text-[15px] font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.08] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue without account
        </button>

        {/* Footer */}
        <p className="mt-6 text-[12px] leading-relaxed text-white/25">
          By continuing, you agree to our{' '}
          <a href="#" className="text-indigo-400/70 underline underline-offset-2 hover:text-indigo-400">
            Privacy Policy
          </a>
          .<br />
          Your data is safe with us.
        </p>
      </div>
    </div>
  )
        }
      
