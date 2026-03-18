'use client'

import { useState } from 'react'
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
import { staffRepo } from '@/lib/db'

interface StaffClientProps {
  staffList: Staff[]
  onReload: () => void
}

export function StaffClient({ staffList, onReload }: StaffClientProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Staff | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)

  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier')
  const [saving, setSaving] = useState(false)

  function openAdd() {
    setName('')
    setRole('cashier')
    setAddOpen(true)
  }

  function openEdit(staff: Staff) {
    setName(staff.name)
    setRole(staff.role)
    setEditTarget(staff)
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await staffRepo.add({ name: name.trim(), role })
      toast.success('スタッフを追加しました')
      setAddOpen(false)
      onReload()
    } catch {
      toast.error('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editTarget || !name.trim()) return
    setSaving(true)
    try {
      await staffRepo.update(editTarget.id, { name: name.trim(), role })
      toast.success('スタッフ情報を更新しました')
      setEditTarget(null)
      onReload()
    } catch {
      toast.error('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await staffRepo.delete(deleteTarget.id)
      toast.success('スタッフを削除しました')
      setDeleteTarget(null)
      onReload()
    } catch {
      toast.error('エラーが発生しました')
    } finally {
      setSaving(false)
    }
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
              <th className="px-4 py-3 font-medium text-center">ロール</th>
              <th className="px-4 py-3 font-medium">登録日</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  スタッフが登録されていません
                </td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{staff.name}</td>
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
                        onClick={() => setDeleteTarget(staff)}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
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
                onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ロール</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'cashier')}>
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
            <Button onClick={handleAdd} disabled={saving || !name.trim()}>
              {saving ? '追加中...' : '追加する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スタッフ編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>名前</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ロール</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'cashier')}>
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
            <Button onClick={handleEdit} disabled={saving || !name.trim()}>
              {saving ? '更新中...' : '更新する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スタッフ削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            <span className="font-semibold">{deleteTarget?.name}</span> を削除しますか？
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
