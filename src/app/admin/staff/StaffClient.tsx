'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Staff } from '@/types'
import { addStaff, updateStaff, deleteStaff, resetStaffPassword } from './actions'

interface StaffClientProps {
  staffList: Staff[]
  currentUserId: string
}

export function StaffClient({ staffList, currentUserId }: StaffClientProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Staff | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)
  const [resetTarget, setResetTarget] = useState<Staff | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier')
  const [newPassword, setNewPassword] = useState('')

  const [isPending, startTransition] = useTransition()

  function openAdd() {
    setName('')
    setEmail('')
    setPassword('')
    setRole('cashier')
    setAddOpen(true)
  }

  function openEdit(staff: Staff) {
    setName(staff.name)
    setEmail(staff.email ?? '')
    setRole(staff.role)
    setEditTarget(staff)
  }

  function handleAdd() {
    const fd = new FormData()
    fd.set('name', name)
    fd.set('email', email)
    fd.set('password', password)
    fd.set('role', role)
    startTransition(async () => {
      try {
        await addStaff(fd)
        toast.success('スタッフを追加しました')
        setAddOpen(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
      }
    })
  }

  function handleEdit() {
    if (!editTarget) return
    startTransition(async () => {
      try {
        await updateStaff(editTarget.id, name, role, email || undefined)
        toast.success('スタッフ情報を更新しました')
        setEditTarget(null)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      try {
        await deleteStaff(deleteTarget.id)
        toast.success('スタッフを削除しました')
        setDeleteTarget(null)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
      }
    })
  }

  function handleResetPassword() {
    if (!resetTarget) return
    startTransition(async () => {
      try {
        await resetStaffPassword(resetTarget.id, newPassword)
        toast.success('パスワードを変更しました')
        setResetTarget(null)
        setNewPassword('')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
      }
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">スタッフ管理</h2>
        <Button onClick={openAdd}>＋ スタッフ追加</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">名前</th>
              <th className="px-4 py-3 font-medium">メールアドレス</th>
              <th className="px-4 py-3 font-medium text-center">ロール</th>
              <th className="px-4 py-3 font-medium">登録日</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  スタッフが登録されていません
                </td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {staff.name}
                    {staff.id === currentUserId && (
                      <span className="ml-2 text-xs text-blue-500">(自分)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{staff.email ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                      {staff.role === 'admin' ? '管理者' : 'スタッフ'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(staff.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => openEdit(staff)}>
                        編集
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setNewPassword(''); setResetTarget(staff) }}
                      >
                        PW変更
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={staff.id === currentUserId}
                        onClick={() => setDeleteTarget(staff)}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 disabled:opacity-30"
                      >
                        削除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* スタッフ追加ダイアログ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スタッフ追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>名前</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-1.5">
              <Label>メールアドレス</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>パスワード（6文字以上）</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ロール</Label>
              <Select value={role} onValueChange={v => setRole(v as 'admin' | 'cashier')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">スタッフ（レジ操作のみ）</SelectItem>
                  <SelectItem value="admin">管理者（全機能）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>キャンセル</Button>
            <Button
              onClick={handleAdd}
              disabled={isPending || !name.trim() || !email.trim() || password.length < 6}
            >
              {isPending ? '追加中...' : '追加する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スタッフ編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>名前</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>メールアドレス</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ロール</Label>
              <Select value={role} onValueChange={v => setRole(v as 'admin' | 'cashier')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">スタッフ（レジ操作のみ）</SelectItem>
                  <SelectItem value="admin">管理者（全機能）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>キャンセル</Button>
            <Button onClick={handleEdit} disabled={isPending || !name.trim()}>
              {isPending ? '更新中...' : '更新する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スタッフ削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            <span className="font-semibold">{deleteTarget?.name}</span> を削除しますか？
            <br />
            <span className="text-red-600">この操作は取り消せません。対象のスタッフはログインできなくなります。</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* パスワード変更ダイアログ */}
      <Dialog open={!!resetTarget} onOpenChange={o => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワード変更</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <p className="text-sm text-gray-500 mb-3">
              <span className="font-semibold text-gray-800">{resetTarget?.name}</span> の新しいパスワードを設定します。
            </p>
            <Label>新しいパスワード（6文字以上）</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>キャンセル</Button>
            <Button
              onClick={handleResetPassword}
              disabled={isPending || newPassword.length < 6}
            >
              {isPending ? '変更中...' : '変更する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
