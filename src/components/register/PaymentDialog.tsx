'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Numpad } from './Numpad'
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
  const [step, setStep] = useState<1 | 2>(1)
  const [method, setMethod] = useState<string>(paymentMethods[0]?.key ?? '')
  const [amountInput, setAmountInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(1)
      setMethod(paymentMethods[0]?.key ?? '')
      setAmountInput('')
    }
  }, [open, paymentMethods])

  const totalAmount = total()
  const enteredAmount = parseInt(amountInput) || 0
  const change = enteredAmount - totalAmount

  const selectedMethod = paymentMethods.find((m) => m.key === method)
  const requiresAmountInput = selectedMethod?.requires_amount_input ?? false
  const requiresChange = selectedMethod?.requires_change ?? false

  const handleSubmit = async () => {
    if (requiresAmountInput && enteredAmount === 0) {
      toast.error('金額を入力してください')
      return
    }
    if (requiresChange && enteredAmount < totalAmount) {
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
        payment_amount: requiresAmountInput ? enteredAmount : totalAmount,
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
      product_id: item.product.id.startsWith('custom_') ? null : item.product.id,
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
    setAmountInput('')
    onComplete(orderData as Order)
  }

  // Step1 → Step2 or 直接確定
  const handleNext = () => {
    if (requiresAmountInput) {
      setAmountInput('')
      setStep(2)
    } else {
      handleSubmit()
    }
  }

  const isStep2ConfirmDisabled =
    loading ||
    (requiresAmountInput && enteredAmount === 0) ||
    (requiresChange && enteredAmount < totalAmount)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">お会計</DialogTitle>
            {requiresAmountInput && (
              <span className="text-xs text-gray-400 font-normal">{step} / 2</span>
            )}
          </div>
        </DialogHeader>

        {/* ===== Step 1: 支払方法選択 ===== */}
        {step === 1 && (
          <div className="space-y-4">
            {/* 合計金額 */}
            <div className="text-center py-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">合計金額</p>
              <p className="text-4xl font-bold text-gray-900">¥{totalAmount.toLocaleString()}</p>
            </div>

            {/* 支払方法選択 */}
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">支払方法が登録されていません</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={`py-4 rounded-xl border-2 font-semibold text-sm transition-colors touch-manipulation ${
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

            {/* ボタン */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 touch-manipulation"
                disabled={loading}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 font-bold touch-manipulation"
                disabled={loading || paymentMethods.length === 0}
              >
                {loading ? '処理中...' : requiresAmountInput ? '次へ →' : '確定'}
              </Button>
            </div>
          </div>
        )}

        {/* ===== Step 2: 金額入力（現金等） ===== */}
        {step === 2 && (
          <div className="space-y-3">
            {/* 合計 + 預り金表示 */}
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-gray-500">合計</p>
                <p className="text-lg font-bold tabular-nums">¥{totalAmount.toLocaleString()}</p>
              </div>
              <div className="flex-1 bg-blue-50 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-blue-500">{requiresChange ? '預り金' : '受取金額'}</p>
                <p className={`text-lg font-bold tabular-nums ${amountInput ? 'text-blue-700' : 'text-blue-300'}`}>
                  ¥{enteredAmount > 0 ? enteredAmount.toLocaleString() : '0'}
                </p>
              </div>
            </div>

            {/* クイック金額 */}
            {requiresChange && (
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmountInput(amt.toString())}
                    className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 active:scale-95 transition-transform touch-manipulation"
                  >
                    ¥{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            )}

            {/* テンキー */}
            <Numpad value={amountInput} onChange={setAmountInput} />

            {/* お釣り / 不足 */}
            {amountInput && (
              <div className={`flex justify-between text-base font-bold rounded-xl px-4 py-3 ${
                change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                <span>{change >= 0 ? 'お釣り' : '不足'}</span>
                <span className="tabular-nums">¥{Math.abs(change).toLocaleString()}</span>
              </div>
            )}

            {/* ボタン */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep(1); setAmountInput('') }}
                className="flex-1 h-12 touch-manipulation"
                disabled={loading}
              >
                ← 戻る
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 font-bold touch-manipulation"
                disabled={isStep2ConfirmDisabled}
              >
                {loading ? '処理中...' : '確定'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
