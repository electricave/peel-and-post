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
    .select('id, role, full_name, email, company_name, avatar_url, created_at, updated_at')
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
        email,
        company_name,
        role
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch all proofs
  const { data: proofs } = await supabase
    .from('proofs')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch all conversations with messages
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      order_id,
      messages (
        id,
        sender_id,
        content,
        read_at,
        created_at
      )
    `)

  // Fetch all artwork/files
  const { data: artwork } = await supabase
    .from('files')
    .select('order_id, file_url, file_name, created_at')
    .order('created_at', { ascending: false })

  return (
    <StudioDashboardClient
      profile={profile as any}
      studioName={profile.full_name || 'Studio'}
      orders={orders || []}
      proofs={proofs || []}
      conversations={conversations || []}
      artwork={artwork || []}
      currentUserId={user.id}
    />
  )
}
