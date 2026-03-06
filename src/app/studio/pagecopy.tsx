import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardClient from './StudioDashboardClient'

export default async function StudioPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Verify studio role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'studio') redirect('/dashboard')

  // Fetch all orders with customer profiles
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      profiles:customer_id (
        id,
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch all proofs
  const { data: proofs } = await supabase
    .from('proofs')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch unread/recent messages count per order
  const { data: messages } = await supabase
    .from('messages')
    .select('order_id, created_at, sender_id, content')
    .order('created_at', { ascending: false })

  // Fetch all artwork uploads
  const { data: artwork } = await supabase
    .from('artwork')
    .select('order_id, file_url, created_at')

  return (
    <StudioDashboardClient
      studioName={profile.full_name || 'Studio'}
      orders={orders || []}
      proofs={proofs || []}
      messages={messages || []}
      artwork={artwork || []}
      currentUserId={user.id}
    />
  )
}
