import { createClient } from '@/lib/supabase/server'
import LoginScreen from '@/components/login-screen'
import ChatScreen from '@/components/chat-screen'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return <ChatScreen user={user} />
  }

  return <LoginScreen />
}
