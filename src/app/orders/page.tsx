import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile, getOrders, getDashboardStats } from '@/lib/queries'
import OrdersClient from './OrdersClient'

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profile, currentOrders, pastOrders, stats] = await Promise.all([
    getProfile(),
    getOrders('current'),
    getOrders('past'),
    getDashboardStats(),
  ])

  return <OrdersClient profile={profile} currentOrders={currentOrders} pastOrders={pastOrders} stats={stats} />
}
