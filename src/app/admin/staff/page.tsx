import { createClient } from '@/lib/supabase/server'
import { StaffClient } from './StaffClient'

export default async function StaffPage() {
  const supabase = await createClient()

  const { data: staffList } = await supabase
    .from('staff')
    .select('*')
    .order('created_at')

  // auth.usersからメールアドレスを取得（admin APIが必要なためemailは別途保持推奨）
  return <StaffClient staffList={staffList ?? []} />
}
