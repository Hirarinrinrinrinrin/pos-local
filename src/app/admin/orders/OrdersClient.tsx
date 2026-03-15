'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Order, PaymentMethod, OrderStatus } from '@/types'

interface OrdersClientProps {
  orders: Order[]
}

interface EditForm {
  payment_method: PaymentMethod
  status: OrderStatus
}

export function OrdersClient({ orders: initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [selected, setSelected] = useState<Order | null>(null)
  const [form, setForm] = useState<EditForm>({ payment_method: 'cash', status: 'completed' })
  const [saving, setSaving] = useState(false)

  const openDetail = (order: Order) => {
    setSelected(order)
    setForm({ payment_method: order.payment_method, status: order.status })
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('orders')
      .update({ payment_method: form.payment_method, status: form.status })
      .eq('id', selected.id)

    if (error) {
      toast.error('更新に失敗しました')
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selected.id
            ? { ...o, payment_method: form.payment_method, status: form.status }
            : o
        )
      )
      toast.success('注文情報を更新しました')
      setSelected(null)
    }
    setSaving(false)
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">注文履歴</h2>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">日時</th>
              <th className="px-4 py-3 font-medium">商品数</th>
              <th className="px-4 py-3 font-medium">支払方法</th>
              <th className="px-4 py-3 font-medium text-center">状態</th>
              <th className="px-4 py-3 font-medium text-right">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  注文がありません
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetail(order)}
                >
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(order.created_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.order_items?.length ?? 0}点
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.payment_method === 'cash' ? '現金' : 'カード'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={order.status === 'completed' ? 'default' : 'destructive'}>
                      {order.status === 'completed' ? '完了' : '返金'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ¥{order.total.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>注文詳細</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* 注文日時 */}
              <div>
                <p className="text-xs text-gray-500 mb-0.5">注文日時</p>
                <p className="text-sm text-gray-800">
                  {new Date(selected.created_at).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>

              {/* 注文明細 */}
              <div>
                <p className="text-xs text-gray-500 mb-1">注文明細</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs text-gray-500">
                        <th className="px-3 py-2 font-medium">商品名</th>
                        <th className="px-3 py-2 font-medium text-right">単価</th>
                        <th className="px-3 py-2 font-medium text-right">数量</th>
                        <th className="px-3 py-2 font-medium text-right">小計</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selected.order_items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-gray-800">{item.name}</td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            ¥{item.price.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">
                            ¥{(item.price * item.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 支払い方法（編集可） */}
              <div className="space-y-1">
                <Label>支払い方法</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v as PaymentMethod }))}
                >
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left text-sm">
                      {form.payment_method === 'cash' ? '現金' : 'カード'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">現金</SelectItem>
                    <SelectItem value="card">カード</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ステータス（編集可） */}
              <div className="space-y-1">
                <Label>ステータス</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as OrderStatus }))}
                >
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left text-sm">
                      {form.status === 'completed' ? '完了' : '返金'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">完了</SelectItem>
                    <SelectItem value="refunded">返金</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 金額サマリ */}
              <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>合計</span>
                  <span className="font-semibold text-gray-900">¥{selected.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>お預かり</span>
                  <span>¥{selected.payment_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>お釣り</span>
                  <span>¥{selected.change_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setSelected(null)}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
