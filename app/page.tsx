'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoginScreen from '@/components/login-screen'
import ChatScreen from '@/components/chat-screen'
import OnboardingScreen from '@/components/onboarding-screen'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser]           = useState<User | null>(null)
  const [isGuest, setIsGuest]     = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setIsGuest(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleGuestContinue = () => {
    // Check if guest has already completed onboarding
    const existing = localStorage.getItem('grozl_user_profile')
    if (existing) {
      setIsGuest(true)
    } else {
      setIsGuest(true)
      setNeedsOnboarding(true)
    }
  }

  const handleOnboardingComplete = (fullName: string, nickname: string) => {
    // Save to localStorage for both guest and logged-in
    localStorage.setItem('grozl_user_profile', JSON.stringify({ fullName, nickname }))
    setNeedsOnboarding(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F3EF]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    )
  }

  // Show onboarding if entering app for first time
  if ((user || isGuest) && needsOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
  }

  // Check on login: if user logged in but never onboarded
  if (user && !needsOnboarding) {
    const existing = localStorage.getItem('grozl_user_profile')
    if (!existing) {
      // First time Google login — show onboarding once
      return (
        <OnboardingScreen
          onComplete={(fullName, nickname) => {
            localStorage.setItem('grozl_user_profile', JSON.stringify({ fullName, nickname }))
            // Re-render will pick up the saved profile
            window.location.reload()
          }}
        />
      )
    }
    return <ChatScreen user={user} />
  }

  if (isGuest) {
    return <ChatScreen user={null} />
  }

  return <LoginScreen onGuestContinue={handleGuestContinue} />
}
  
