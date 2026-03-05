import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile, getOrders, getDashboardStats } from '@/lib/queries'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profile, orders, stats] = await Promise.all([
    getProfile(),
    getOrders('current'),
    getDashboardStats(),
  ])

  return <DashboardClient profile={profile} orders={orders} stats={stats} />
}
