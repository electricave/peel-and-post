import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile, getConversations, getDashboardStats } from '@/lib/queries'
import MessagesClient from './MessagesClient'

export default async function MessagesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profile, conversations, stats] = await Promise.all([
    getProfile(),
    getConversations(),
    getDashboardStats(),
  ])

  return <MessagesClient profile={profile} conversations={conversations} stats={stats} userId={user.id} />
}
