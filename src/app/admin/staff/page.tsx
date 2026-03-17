import { createClient } from '@/lib/supabase/server'
import { StaffClient } from './StaffClient'

export default async function StaffPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: staffList } = await supabase
    .from('staff')
    .select('*')
    .order('created_at')

  return <StaffClient staffList={staffList ?? []} currentUserId={user?.id ?? ''} />
}
