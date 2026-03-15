'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { PaymentMethodConfig } from '@/types'

// 入力タイプ（UI上の3択）
type InputType = 'exact' | 'amount' | 'cash'

interface PaymentMethodsClientProps {
  paymentMethods: PaymentMethodConfig[]
}

interface PMForm {
  name: string
  key: string
  input_type: InputType
  is_active: boolean
  sort_order: string
}

const emptyForm: PMForm = {
  name: '',
  key: '',
  input_type: 'exact',
  is_active: true,
  sort_order: '0',
}

// InputType → DB フィールドへの変換
function toFlags(input_type: InputType): { requires_amount_input: boolean; requires_change: boolean } {
  if (input_type === 'cash')   return { requires_amount_input: true, requires_change: true }
  if (input_type === 'amount') return { requires_amount_input: true, requires_change: false }
  return { requires_amount_input: false, requires_change: false }
}

// DB フィールド → InputType への変換
function toInputType(pm: PaymentMethodConfig): InputType {
  if (pm.requires_change) return 'cash'
  if (pm.requires_amount_input) return 'amount'
  return 'exact'
}

const INPUT_TYPE_LABELS: Record<InputType, string> = {
  exact:  'ぴったり払い（カード・QR等）',
  amount: '金額入力・その他（テンキーあり）',
  cash:   '現金（テンキーあり・お釣り計算）',
}

export function PaymentMethodsClient({ paymentMethods: initial }: PaymentMethodsClientProps) {
  const router = useRouter()
  const [methods, setMethods] = useState(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PaymentMethodConfig | null>(null)
  const [form, setForm] = useState<PMForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (pm: PaymentMethodConfig) => {
    setEditTarget(pm)
    setForm({
      name: pm.name,
      key: pm.key,
      input_type: toInputType(pm),
      is_active: pm.is_active,
      sort_order: pm.sort_order.toString(),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('表示名は必須です')
      return
    }
    if (!form.key.trim()) {
      toast.error('識別キーは必須です')
      return
    }
    if (!/^[a-z0-9_]+$/.test(form.key)) {
      toast.error('識別キーは半角英小文字・数字・アンダースコアのみ使用できます')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const flags = toFlags(form.input_type)
    const payload = {
      name: form.name.trim(),
      key: form.key.trim(),
      ...flags,
      is_active: form.is_active,
      sort_order: parseInt(form.sort_order) || 0,
    }

    if (editTarget) {
      const { data, error } = await supabase
        .from('payment_methods')
        .update(payload)
        .eq('id', editTarget.id)
        .select()
        .single()

      if (error) {
        toast.error('更新に失敗しました')
      } else {
        setMethods((prev) =>
          prev.map((m) => (m.id === editTarget.id ? (data as PaymentMethodConfig) : m))
        )
        toast.success('支払方法を更新しました')
        setDialogOpen(false)
        router.refresh()
      }
    } else {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(payload)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('その識別キーはすでに使用されています')
        } else {
          toast.error('作成に失敗しました')
        }
      } else {
        setMethods((prev) =>
          [...prev, data as PaymentMethodConfig].sort((a, b) => a.sort_order - b.sort_order)
        )
        toast.success('支払方法を追加しました')
        setDialogOpen(false)
        router.refresh()
      }
    }
    setSaving(false)
  }

  const handleDelete = async (pm: PaymentMethodConfig) => {
    if (!confirm(`「${pm.name}」を削除しますか？\n既存の注文データには影響しません。`)) return

    const supabase = createClient()
    const { error } = await supabase.from('payment_methods').delete().eq('id', pm.id)

    if (error) {
      toast.error('削除に失敗しました')
    } else {
      setMethods((prev) => prev.filter((m) => m.id !== pm.id))
      toast.success('削除しました')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">支払方法管理</h2>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          ＋ 追加
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">表示名</th>
              <th className="px-4 py-3 font-medium">識別キー</th>
              <th className="px-4 py-3 font-medium">入力タイプ</th>
              <th className="px-4 py-3 font-medium text-center">並び順</th>
              <th className="px-4 py-3 font-medium text-center">状態</th>
              <th className="px-4 py-3 font-medium text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {methods.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  支払方法がありません
                </td>
              </tr>
            ) : (
              methods.map((pm) => (
                <tr key={pm.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{pm.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{pm.key}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {INPUT_TYPE_LABELS[toInputType(pm)]}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{pm.sort_order}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={pm.is_active ? 'default' : 'secondary'}>
                      {pm.is_active ? '有効' : '無効'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(pm)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(pm)}
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
            <DialogTitle>{editTarget ? '支払方法を編集' : '支払方法を追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="pm-name">表示名 *</Label>
              <Input
                id="pm-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例: PayPay、商品券"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pm-key">
                識別キー *{editTarget && <span className="text-xs text-gray-400 ml-1">（変更不可）</span>}
              </Label>
              <Input
                id="pm-key"
                value={form.key}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                  }))
                }
                placeholder="例: paypay、voucher"
                disabled={!!editTarget}
                className={editTarget ? 'bg-gray-50 text-gray-400' : ''}
              />
              <p className="text-xs text-gray-400">半角英小文字・数字・アンダースコアのみ</p>
            </div>
            <div className="space-y-1">
              <Label>入力タイプ *</Label>
              <select
                value={form.input_type}
                onChange={(e) => setForm((f) => ({ ...f, input_type: e.target.value as InputType }))}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="exact">ぴったり払い（カード・QR等）</option>
                <option value="amount">金額入力・その他（テンキーあり）</option>
                <option value="cash">現金（テンキーあり・お釣り計算）</option>
              </select>
              <p className="text-xs text-gray-400">
                {form.input_type === 'exact'  && '合計金額をそのまま記録します'}
                {form.input_type === 'amount' && 'テンキーで受け取り金額を入力します（お釣りなし）'}
                {form.input_type === 'cash'   && 'テンキーで預かり金額を入力し、お釣りを計算します'}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pm-sort">並び順</Label>
              <Input
                id="pm-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                min={0}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="pm-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="pm-active">有効（レジに表示）</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
