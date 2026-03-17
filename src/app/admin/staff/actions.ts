'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) throw new Error('認証が必要です')

  const { data: staffData } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single()

  if (staffData?.role !== 'admin') throw new Error('管理者権限が必要です')
}

export async function addStaff(formData: FormData) {
  await requireAdmin()

  const name = (formData.get('name') as string).trim()
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const role = formData.get('role') as string

  if (!name || !email || password.length < 6) {
    throw new Error('入力内容を確認してください（パスワードは6文字以上）')
  }

  const adminClient = createAdminClient()

  // 1. Supabase Auth にユーザー作成
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? 'ユーザーの作成に失敗しました')
  }

  // 2. staff テーブルに挿入
  const { error: staffError } = await adminClient
    .from('staff')
    .insert({ id: authData.user.id, name, role, email })

  if (staffError) {
    // ロールバック: Auth ユーザーを削除
    await adminClient.auth.admin.deleteUser(authData.user.id)
    throw new Error(`スタッフ登録に失敗しました: ${staffError.message}`)
  }

  revalidatePath('/admin/staff')
}

export async function updateStaff(id: string, name: string, role: string, email?: string) {
  await requireAdmin()

  const adminClient = createAdminClient()

  // auth.users のメールアドレスを更新（指定された場合）
  if (email && email.trim()) {
    const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
      email: email.trim(),
      email_confirm: true,
    })
    if (authError) throw new Error(`メールアドレスの更新に失敗しました: ${authError.message}`)
  }

  const updateData: Record<string, string> = { name: name.trim(), role }
  if (email && email.trim()) updateData.email = email.trim()

  const { error } = await adminClient
    .from('staff')
    .update(updateData)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/staff')
}

export async function deleteStaff(id: string) {
  await requireAdmin()

  const adminClient = createAdminClient()
  // auth.users から削除 → CASCADE で staff も削除される
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/staff')
}

export async function resetStaffPassword(id: string, newPassword: string) {
  await requireAdmin()

  if (newPassword.length < 6) {
    throw new Error('パスワードは6文字以上で入力してください')
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(id, {
    password: newPassword,
  })

  if (error) throw new Error(error.message)
}
