import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || profile.role !== 'studio') redirect('/dashboard')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, product, quantity, estimated_total, final_total, created_at, paid_at')
    .order('created_at', { ascending: true })

  if (!orders) {
    return <AnalyticsClient profile={profile} data={null} />
  }

  const now = new Date()

  // Stat cards
  const totalOrders = orders.length
  const paidOrders = orders.filter(o => o.final_total && ['paid', 'in_production', 'shipped', 'delivered'].includes(o.status))
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.final_total ?? 0), 0)
  const avgOrderValue = paidOrders.length ? totalRevenue / paidOrders.length : 0
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const ordersThisMonth = orders.filter(o => o.created_at >= thisMonthStart).length

  // Last 6 months
  const months: { label: string; key: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    })
  }

  const ordersByMonth = months.map(({ label, key }) => ({
    label,
    count: orders.filter(o => o.created_at.startsWith(key)).length,
    revenue: orders
      .filter(o => o.created_at.startsWith(key) && o.final_total)
      .reduce((sum, o) => sum + Number(o.final_total ?? 0), 0),
  }))

  // Orders by status
  const statusCounts: Record<string, number> = {}
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  }

  // Orders by product
  const productCounts: Record<string, number> = {}
  for (const o of orders) {
    productCounts[o.product] = (productCounts[o.product] ?? 0) + 1
  }

  const data = {
    stats: { totalOrders, totalRevenue, avgOrderValue, ordersThisMonth },
    ordersByMonth,
    statusCounts,
    productCounts,
  }

  return <AnalyticsClient profile={profile} data={data} />
}
