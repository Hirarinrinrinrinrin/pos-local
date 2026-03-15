'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface ClosingSectionProps {
  todayDate: string
  isClosed: boolean
  closedAt: string | null
  todaySales: number
  todayCount: number
  refundCount: number
  refundTotal: number
  paymentBreakdown: Record<string, number>
  pmNameMap: Record<string, string>
}

export function ClosingSection({
  todayDate,
  isClosed: initialClosed,
  closedAt: initialClosedAt,
  todaySales,
  todayCount,
  refundCount,
  refundTotal,
  paymentBreakdown,
  pmNameMap,
}: ClosingSectionProps) {
  const [closed, setClosed] = useState(initialClosed)
  const [closedAt, setClosedAt] = useState(initialClosedAt)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = async () => {
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('daily_closings').insert({
      date: todayDate,
      total_sales: todaySales,
      order_count: todayCount,
      refund_count: refundCount,
      refund_total: refundTotal,
      payment_breakdown: paymentBreakdown,
      closed_by: user?.id ?? null,
      note: note.trim() || null,
    })

    setSaving(false)
    if (error) {
      toast.error('締め処理に失敗しました')
    } else {
      setClosed(true)
      setClosedAt(new Date().toISOString())
      setDialogOpen(false)
      toast.success('営業を締めました')
    }
  }

  if (closed) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
        <span className="text-lg">✓</span>
        <span className="font-medium">本日の営業は締め済みです</span>
        {closedAt && (
          <span className="text-green-500 text-xs ml-auto">
            {new Date(closedAt).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            締め
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="text-sm text-amber-700">
          <span className="font-semibold">本日の営業は未締めです</span>
          <span className="ml-2 text-amber-500 text-xs">
            営業終了時に締め処理を行ってください
          </span>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 h-9"
        >
          営業を締める
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>営業締め確認</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between font-semibold text-base">
                <span>本日の売上</span>
                <span>¥{todaySales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>取引件数</span>
                <span>{todayCount}件</span>
              </div>
              {refundCount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>返金</span>
                  <span>
                    -¥{refundTotal.toLocaleString()}（{refundCount}件）
                  </span>
                </div>
              )}
            </div>

            {Object.keys(paymentBreakdown).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 font-medium">支払方法別</p>
                {Object.entries(paymentBreakdown).map(([key, amount]) => (
                  <div key={key} className="flex justify-between text-gray-600">
                    <span>{pmNameMap[key] ?? key}</span>
                    <span>¥{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">メモ（任意）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="特記事項があれば入力..."
                rows={2}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleClose}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                disabled={saving}
              >
                {saving ? '処理中...' : '締める'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
