'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Category, Product } from '@/types'

interface ProductsClientProps {
  products: Product[]
  categories: Category[]
}

interface ProductForm {
  name: string
  price: string
  category_id: string
  is_active: boolean
}

const emptyForm: ProductForm = { name: '', price: '', category_id: '', is_active: true }

export function ProductsClient({ products: initialProducts, categories }: ProductsClientProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditTarget(product)
    setForm({
      name: product.name,
      price: product.price.toString(),
      category_id: product.category_id ?? '',
      is_active: product.is_active,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error('商品名と価格は必須です')
      return
    }
    const price = parseInt(form.price)
    if (isNaN(price) || price < 0) {
      toast.error('正しい価格を入力してください')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      price,
      category_id: form.category_id || null,
      is_active: form.is_active,
    }

    if (editTarget) {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editTarget.id)
        .select('*, categories(id, name, sort_order, created_at)')
        .single()

      if (error) {
        toast.error('更新に失敗しました')
      } else {
        setProducts((prev) => prev.map((p) => (p.id === editTarget.id ? (data as Product) : p)))
        toast.success('商品を更新しました')
        setDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('*, categories(id, name, sort_order, created_at)')
        .single()

      if (error) {
        toast.error('作成に失敗しました')
      } else {
        setProducts((prev) => [data as Product, ...prev])
        toast.success('商品を追加しました')
        setDialogOpen(false)
      }
    }
    setSaving(false)
    router.refresh()
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`「${product.name}」を削除しますか？`)) return

    const supabase = createClient()
    const { error } = await supabase.from('products').delete().eq('id', product.id)

    if (error) {
      toast.error('削除に失敗しました')
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
      toast.success('削除しました')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">商品管理</h2>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          ＋ 商品を追加
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">商品名</th>
              <th className="px-4 py-3 font-medium">カテゴリ</th>
              <th className="px-4 py-3 font-medium text-right">価格</th>
              <th className="px-4 py-3 font-medium text-center">状態</th>
              <th className="px-4 py-3 font-medium text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  商品がありません
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {product.categories?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ¥{product.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? '販売中' : '非公開'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(product)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="text-xs text-red-500 hover:underline"
                      >
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
            <DialogTitle>{editTarget ? '商品を編集' : '商品を追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">商品名 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例: コーヒー"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="price">価格（税込）*</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                <Input
                  id="price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="pl-7"
                  placeholder="500"
                  min={0}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>カテゴリ</Label>
              <Select
                value={form.category_id}
                onValueChange={(value) => setForm((f): ProductForm => ({ ...f, category_id: value ?? '' }))}
              >
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left text-sm">
                    {form.category_id
                      ? (categories.find((c) => c.id === form.category_id)?.name ?? 'カテゴリを選択')
                      : 'カテゴリを選択'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">カテゴリなし</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="is_active">販売中（レジに表示）</Label>
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
