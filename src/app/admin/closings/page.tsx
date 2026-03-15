import { createClient } from '@/lib/supabase/server'
import { ClosingsClient } from './ClosingsClient'
import type { DailyClosing } from '@/types'

export default async function ClosingsPage() {
  const supabase = await createClient()

  const [closingsResult, paymentMethodsResult] = await Promise.all([
    supabase.from('daily_closings').select('*').order('date', { ascending: false }).limit(90),
    supabase.from('payment_methods').select('key, name').order('sort_order'),
  ])

  return (
    <ClosingsClient
      closings={(closingsResult.data ?? []) as DailyClosing[]}
      pmNameMap={Object.fromEntries(
        (paymentMethodsResult.data ?? []).map((m) => [m.key, m.name])
      )}
    />
  )
}
