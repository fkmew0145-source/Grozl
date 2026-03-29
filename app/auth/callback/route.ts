import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const origin = requestUrl.origin

  // Handle OAuth errors from provider
  if (error) {
    console.error('[v0] OAuth error from provider:', error, errorDescription)
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(errorUrl)
  }

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('[v0] Code exchange error:', exchangeError)
      const errorUrl = new URL('/auth/error', origin)
      errorUrl.searchParams.set('error', exchangeError.message)
      return NextResponse.redirect(errorUrl)
    }

    console.log('[v0] Successfully authenticated user:', data.user?.email)
    return NextResponse.redirect(new URL(next, origin))
  }

  console.error('[v0] No code or error in callback')
  return NextResponse.redirect(new URL('/auth/error', origin))
}
