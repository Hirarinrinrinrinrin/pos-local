import { createClient } from '@/lib/supabase/server'
import { OrdersClient } from './OrdersClient'
import type { Order } from '@/types'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(100)

  return <OrdersClient orders={(orders ?? []) as Order[]} />
}
