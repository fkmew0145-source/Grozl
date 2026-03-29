'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoginScreen from '@/components/login-screen'
import ChatScreen from '@/components/chat-screen'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      console.log('[v0] Checking user session')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[v0] User:', user)
      setUser(user)
      setIsLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[v0] Auth state changed:', _event, session?.user)
      setUser(session?.user ?? null)
      if (session?.user) {
        setIsGuest(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleGuestContinue = () => {
    console.log('[v0] Entering guest mode')
    setIsGuest(true)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    )
  }

  if (user || isGuest) {
    return <ChatScreen user={user} />
  }

  return <LoginScreen onGuestContinue={handleGuestContinue} />
}
