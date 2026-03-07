import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/artwork — record an artwork upload and notify the studio
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { order_id, file_name, file_path, file_size, mime_type } = body

  if (!order_id || !file_name || !file_path) {
    return NextResponse.json({ error: 'order_id, file_name, and file_path required' }, { status: 400 })
  }

  // Insert artwork_files record
  const { data: record, error: dbError } = await supabase
    .from('artwork_files')
    .insert({
      order_id,
      user_id: user.id,
      file_name,
      file_path,
      file_size: file_size ?? null,
      mime_type: mime_type ?? null,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Fetch the order to get product name
  const { data: order } = await supabase
    .from('orders')
    .select('product, status, customer_id')
    .eq('id', order_id)
    .single()

  if (order) {
    // Move order status to in_review if it's pending or artwork_needed
    if (order.status === 'pending' || order.status === 'artwork_needed') {
      await supabase
        .from('orders')
        .update({ status: 'in_review' })
        .eq('id', order_id)
    }

    // Fetch customer name
    const { data: customer } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const customerName = customer?.full_name || customer?.email || 'A customer'

    // Notify all studio users
    const { data: studioUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'studio')

    if (studioUsers && studioUsers.length > 0) {
      await supabase.from('notifications').insert(
        studioUsers.map(su => ({
          user_id: su.id,
          type: 'order_update',
          title: `${customerName} uploaded artwork`,
          body: `New artwork file "${file_name}" for ${order.product} order. Ready for review.`,
          order_id,
        }))
      )
    }
  }

  return NextResponse.json({ data: record }, { status: 201 })
}
