import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOrderForInvoice } from '@/lib/queries'
import InvoiceView from '@/components/orders/InvoiceView'

export const metadata = { title: 'Invoice · Peel & Post Studio' }

export default async function InvoicePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  let order
  try {
    order = await getOrderForInvoice(supabase, params.id)
  } catch {
    redirect('/orders')
  }

  // Access guard: studio sees all, customers only their own
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isStudio = profile?.role === 'studio'
  if (!isStudio && order.customer_id !== user.id) redirect('/orders')

  return <InvoiceView order={order} />
}
