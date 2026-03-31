'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoginScreen from '@/components/login-screen'
import ChatScreen from '@/components/chat-screen'
import OnboardingScreen from '@/components/onboarding-screen'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser]                   = useState<User | null>(null)
  const [isGuest, setIsGuest]             = useState(false)
  const [isLoading, setIsLoading]         = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Check onboarding for logged-in user here (in effect, not in render)
      if (user) {
        const existing = localStorage.getItem('grozl_user_profile')
        if (!existing) setNeedsOnboarding(true)
      }

      setIsLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      if (newUser) {
        setIsGuest(false)
        // Check onboarding on auth change too
        const existing = localStorage.getItem('grozl_user_profile')
        if (!existing) setNeedsOnboarding(true)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGuestContinue = () => {
    const existing = localStorage.getItem('grozl_user_profile')
    setIsGuest(true)
    if (!existing) setNeedsOnboarding(true)
  }

  const handleOnboardingComplete = (fullName: string, nickname: string) => {
    localStorage.setItem('grozl_user_profile', JSON.stringify({ fullName, nickname }))
    setNeedsOnboarding(false)
  }

  // Loading spinner
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F3EF]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    )
  }

  // Onboarding (guest or logged-in, first time)
  if ((user || isGuest) && needsOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
  }

  // Logged-in user → chat
  if (user) return <ChatScreen user={user} onLogout={() => { setUser(null); setNeedsOnboarding(false) }} />

  // Guest → chat
  if (isGuest) return <ChatScreen user={null} onLogout={() => { setIsGuest(false); setNeedsOnboarding(false) }} />

  // Not logged in → login
  return <LoginScreen onGuestContinue={handleGuestContinue} />
      }

      
