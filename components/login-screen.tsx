'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginScreen() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleGuestContinue = () => {
    window.location.href = '/chat?guest=true'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mx-auto mb-5 flex h-[90px] w-[90px] items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 shadow-lg shadow-indigo-500/15">
          <span className="text-xs font-medium text-indigo-500">Logo</span>
        </div>

        {/* Title */}
        <h1 className="mb-1.5 text-2xl font-semibold text-gray-900">Grozl AI</h1>
        <p className="mb-8 text-sm text-gray-500">
          {"All the World's Best AI. One Platform."}
        </p>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-4 text-[15px] font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn-icons-png.flaticon.com/512/300/300221.png"
            width={18}
            height={18}
            alt="Google"
          />
          Continue with Google
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
          className="w-full rounded-xl bg-indigo-50 px-4 py-4 text-[15px] font-medium text-indigo-600 transition hover:bg-indigo-100"
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
