'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Order, PaymentMethodConfig } from '@/types'

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  onComplete: (order: Order) => void
  paymentMethods: PaymentMethodConfig[]
}

const QUICK_AMOUNTS = [1000, 5000, 10000]

export function PaymentDialog({ open, onClose, onComplete, paymentMethods }: PaymentDialogProps) {
  const { items, total, clearCart } = useCartStore()
  const [method, setMethod] = useState<string>(paymentMethods[0]?.key ?? 'cash')
  const [cashInput, setCashInput] = useState('')
  const [loading, setLoading] = useState(false)

  // ダイアログが開くたびに最初の支払方法にリセット
  useEffect(() => {
    if (open) {
      setMethod(paymentMethods[0]?.key ?? 'cash')
      setCashInput('')
    }
  }, [open, paymentMethods])

  const totalAmount = total()
  const cashAmount = parseInt(cashInput.replace(/[^0-9]/g, '')) || 0
  const change = cashAmount - totalAmount

  const selectedMethod = paymentMethods.find((m) => m.key === method)
  const requiresChange = selectedMethod?.requires_change ?? false

  const handleSubmit = async () => {
    if (requiresChange && cashAmount < totalAmount) {
      toast.error('預り金が不足しています')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        total: totalAmount,
        payment_method: method,
        payment_amount: requiresChange ? cashAmount : totalAmount,
        change_amount: requiresChange ? Math.max(0, change) : 0,
        status: 'completed',
        staff_id: user?.id ?? null,
      })
      .select()
      .single()

    if (orderError || !orderData) {
      toast.error('注文の保存に失敗しました')
      setLoading(false)
      return
    }

    const orderItems = items.map((item) => ({
      order_id: orderData.id,
      product_id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      toast.error('明細の保存に失敗しました')
      setLoading(false)
      return
    }

    clearCart()
    setLoading(false)
    setCashInput('')
    onComplete(orderData as Order)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">お会計</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="text-center py-3 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">合計金額</p>
            <p className="text-4xl font-bold text-gray-900">¥{totalAmount.toLocaleString()}</p>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">支払方法</Label>
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-gray-400">支払方法が登録されていません</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => {
                      setMethod(m.key)
                      setCashInput('')
                    }}
                    className={`py-3 rounded-xl border-2 font-semibold text-sm transition-colors touch-manipulation ${
                      method === m.key
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {requiresChange && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="cash-input" className="text-sm font-semibold">預り金</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <Input
                    id="cash-input"
                    type="number"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    className="pl-7 text-lg h-12"
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashInput(amt.toString())}
                    className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 active:scale-95 transition-transform touch-manipulation"
                  >
                    ¥{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {cashInput && (
                <div className={`flex justify-between text-lg font-bold rounded-xl p-3 ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  <span>お釣り</span>
                  <span>¥{change >= 0 ? change.toLocaleString() : '不足'}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 touch-manipulation" disabled={loading}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 font-bold touch-manipulation"
              disabled={
                loading ||
                paymentMethods.length === 0 ||
                (requiresChange && (cashAmount < totalAmount || !cashInput))
              }
            >
              {loading ? '処理中...' : '確定'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
