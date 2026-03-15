import { createClient } from '@/lib/supabase/server'
import { OrdersClient } from './OrdersClient'
import type { Order, PaymentMethodConfig } from '@/types'

export default async function OrdersPage() {
  const supabase = await createClient()

  const [ordersResult, paymentMethodsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order'),
  ])

  return (
    <OrdersClient
      orders={(ordersResult.data ?? []) as Order[]}
      paymentMethods={(paymentMethodsResult.data ?? []) as PaymentMethodConfig[]}
    />
  )
}
