'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('error')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-10 w-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          Authentication Error
        </h1>
        <p className="mb-6 text-gray-600">
          {errorMessage || 'Something went wrong during sign in. Please try again.'}
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-indigo-500 px-6 py-3 font-medium text-white transition hover:bg-indigo-600"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
