import { createClient } from '@/lib/supabase/server'
import { SetupClient } from './SetupClient'

export default async function SetupPage() {
  const supabase = await createClient()

  const [catRes, prodRes, pmRes] = await Promise.all([
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('payment_methods').select('id', { count: 'exact', head: true }),
  ])

  return (
    <SetupClient
      categoryCount={catRes.count ?? 0}
      productCount={prodRes.count ?? 0}
      paymentMethodCount={pmRes.count ?? 0}
    />
  )
}
