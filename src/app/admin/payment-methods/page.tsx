import { createClient } from '@/lib/supabase/server'
import { PaymentMethodsClient } from './PaymentMethodsClient'
import type { PaymentMethodConfig } from '@/types'

export default async function PaymentMethodsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('payment_methods')
    .select('*')
    .order('sort_order')

  return <PaymentMethodsClient paymentMethods={(data ?? []) as PaymentMethodConfig[]} />
}
