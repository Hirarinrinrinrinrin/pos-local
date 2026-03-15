'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Order, PaymentMethodConfig } from '@/types'

interface ReceiptDialogProps {
  open: boolean
  order: Order | null
  onClose: () => void
  paymentMethods: PaymentMethodConfig[]
}

export function ReceiptDialog({ open, order, onClose, paymentMethods }: ReceiptDialogProps) {
  if (!order) return null

  const handlePrint = () => window.print()

  const date = new Date(order.created_at)
  const dateStr = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const pm = paymentMethods.find((m) => m.key === order.payment_method)
  const pmName = pm?.name ?? order.payment_method

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm print:shadow-none">
        <DialogHeader>
          <DialogTitle>レシート</DialogTitle>
        </DialogHeader>

        <div id="receipt" className="font-mono text-sm space-y-2">
          <div className="text-center font-bold text-lg">領収書</div>
          <div className="text-center text-xs text-gray-500">{dateStr}</div>

          <Separator />

          <div className="space-y-1">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="truncate mr-2">
                  {item.name} × {item.quantity}
                </span>
                <span className="shrink-0">¥{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-0.5">
            <div className="flex justify-between font-bold text-base">
              <span>合計</span>
              <span>¥{order.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>支払</span>
              <span>{pmName}</span>
            </div>
            {pm?.requires_amount_input && (
              <>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{pm.requires_change ? '預り' : '受取'}</span>
                  <span>¥{order.payment_amount.toLocaleString()}</span>
                </div>
                {pm.requires_change && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>お釣り</span>
                    <span>¥{order.change_amount.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 pt-2">
            ありがとうございました
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={handlePrint} className="flex-1 touch-manipulation">
            印刷
          </Button>
          <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700 touch-manipulation">
            次の会計
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
