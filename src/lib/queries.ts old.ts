import { createClient } from './supabase/server'
import type { Order, Proof, Conversation, Message, Notification, Profile } from '@/types'

// ============================================================
// PROFILE
// ============================================================

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

// ============================================================
// ORDERS
// ============================================================

export async function getOrders(status?: 'current' | 'past'): Promise<Order[]> {
  const supabase = createClient()

  let query = supabase
    .from('orders')
    .select('*, profiles(full_name, company_name, email)')
    .order('created_at', { ascending: false })

  if (status === 'current') {
    query = query.not('status', 'in', '("delivered","cancelled")')
  } else if (status === 'past') {
    query = query.in('status', ['delivered', 'cancelled'])
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getOrder(id: string): Promise<Order | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, company_name, email, avatar_url)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createOrder(orderData: {
  product: string
  quantity: number
  finish: string
  size: string
  shape: string
  turnaround: string
  notes?: string
  estimated_total?: number
}): Promise<Order> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('orders')
    .insert({ ...orderData, customer_id: user.id })
    .select()
    .single()

  if (error) throw error

  // Auto-create a conversation for this order
  await supabase
    .from('conversations')
    .insert({ order_id: data.id })

  return data
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  extra?: Partial<Order>
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('orders')
    .update({ status, ...extra })
    .eq('id', orderId)

  if (error) throw error
}

// ============================================================
// PROOFS
// ============================================================

export async function getProofsForOrder(orderId: string): Promise<Proof[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('proofs')
    .select('*')
    .eq('order_id', orderId)
    .order('version', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function reviewProof(
  proofId: string,
  action: 'approved' | 'revision',
  feedback?: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('proofs')
    .update({
      status: action,
      feedback: feedback ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proofId)

  if (error) throw error

  // Update the parent order status
  const { data: proof } = await supabase
    .from('proofs')
    .select('order_id')
    .eq('id', proofId)
    .single()

  if (proof) {
    await supabase
      .from('orders')
      .update({ status: action === 'approved' ? 'proof_approved' : 'proof_sent' })
      .eq('id', proof.order_id)
  }
}

// ============================================================
// MESSAGES
// ============================================================

export async function getConversations(): Promise<Conversation[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      orders(id, order_number, product, status),
      messages(
        id, content, created_at, read_at,
        profiles(full_name, role)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles(id, full_name, role, avatar_url),
      proofs(id, file_name, version, status)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error

  // Mark messages as read
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .is('read_at', null)
    .neq('sender_id', (await supabase.auth.getUser()).data.user?.id)

  return data ?? []
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachment?: { file_url: string; file_name: string }
): Promise<Message> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      ...attachment,
    })
    .select('*, profiles(id, full_name, role, avatar_url)')
    .single()

  if (error) throw error
  return data
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getNotifications(): Promise<Notification[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data ?? []
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)
}

// ============================================================
// STATS (for dashboard)
// ============================================================

export async function getDashboardStats() {
  const supabase = createClient()

  const [ordersRes, proofsRes, messagesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status')
      .not('status', 'in', '("delivered","cancelled")'),

    supabase
      .from('proofs')
      .select('id, status, orders!inner(customer_id)')
      .eq('status', 'pending'),

    supabase
      .from('messages')
      .select('id, read_at, conversations!inner(orders!inner(customer_id))')
      .is('read_at', null),
  ])

  return {
    activeOrders: ordersRes.data?.length ?? 0,
    proofsToReview: proofsRes.data?.length ?? 0,
    unreadMessages: messagesRes.data?.length ?? 0,
  }
}
