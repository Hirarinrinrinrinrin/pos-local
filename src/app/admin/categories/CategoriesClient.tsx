'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Category } from '@/types'

interface CategoriesClientProps {
  categories: Category[]
}

interface CategoryForm {
  name: string
  sort_order: string
}

const emptyForm: CategoryForm = { name: '', sort_order: '0' }

export function CategoriesClient({ categories: initial }: CategoriesClientProps) {
  const router = useRouter()
  const [categories, setCategories] = useState(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', sort_order: String(categories.length + 1) })
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditTarget(cat)
    setForm({ name: cat.name, sort_order: String(cat.sort_order) })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('カテゴリ名は必須です')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const payload = { name: form.name.trim(), sort_order: parseInt(form.sort_order) || 0 }

    if (editTarget) {
      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', editTarget.id)
        .select()
        .single()

      if (error) {
        toast.error('更新に失敗しました')
      } else {
        setCategories((prev) => prev.map((c) => (c.id === editTarget.id ? (data as Category) : c)))
        toast.success('カテゴリを更新しました')
        setDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single()

      if (error) {
        toast.error('作成に失敗しました')
      } else {
        setCategories((prev) => [...prev, data as Category].sort((a, b) => a.sort_order - b.sort_order))
        toast.success('カテゴリを追加しました')
        setDialogOpen(false)
      }
    }
    setSaving(false)
    router.refresh()
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`「${cat.name}」を削除しますか？\n関連商品のカテゴリはなしになります。`)) return

    const supabase = createClient()
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)

    if (error) {
      toast.error('削除に失敗しました')
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      toast.success('削除しました')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">カテゴリ管理</h2>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          ＋ カテゴリを追加
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">カテゴリ名</th>
              <th className="px-4 py-3 font-medium text-center">表示順</th>
              <th className="px-4 py-3 font-medium text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  カテゴリがありません
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{cat.sort_order}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEdit(cat)} className="text-xs text-blue-600 hover:underline">
                        編集
                      </button>
                      <button onClick={() => handleDelete(cat)} className="text-xs text-red-500 hover:underline">
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'カテゴリを編集' : 'カテゴリを追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="cat-name">カテゴリ名 *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例: フード"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sort-order">表示順</Label>
              <Input
                id="sort-order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                min={0}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1" disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
