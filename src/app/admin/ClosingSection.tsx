'use client'

import { useState } from 'react'
import { closingsRepo } from '@/lib/db'
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
  openingCash: number
}

const DENOMINATIONS = [
  { value: 10000, label: '¥10,000' },
  { value: 5000,  label: '¥5,000' },
  { value: 2000,  label: '¥2,000' },
  { value: 1000,  label: '¥1,000' },
  { value: 500,   label: '¥500' },
  { value: 100,   label: '¥100' },
  { value: 50,    label: '¥50' },
  { value: 10,    label: '¥10' },
  { value: 5,     label: '¥5' },
  { value: 1,     label: '¥1' },
]

export function ClosingSection({
  todayDate, isClosed: initialClosed, closedAt: initialClosedAt,
  todaySales, todayCount, refundCount, refundTotal,
  paymentBreakdown, pmNameMap, openingCash,
}: ClosingSectionProps) {
  const [closed, setClosed] = useState(initialClosed)
  const [closedAt, setClosedAt] = useState(initialClosedAt)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [counts, setCounts] = useState<Record<number, string>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const cashTotal = DENOMINATIONS.reduce((sum, d) => {
    return sum + d.value * (parseInt(counts[d.value] ?? '') || 0)
  }, 0)

  const expectedCash = openingCash + (paymentBreakdown['cash'] ?? 0)
  const cashDiff = cashTotal - expectedCash

  const handleCountChange = (value: number, input: string) => {
    if (input !== '' && !/^\d+$/.test(input)) return
    setCounts((prev) => ({ ...prev, [value]: input }))
  }

  const handleClose = async () => {
    setSaving(true)
    const denominationBreakdown: Record<string, number> = {}
    for (const d of DENOMINATIONS) {
      const n = parseInt(counts[d.value] ?? '') || 0
      if (n > 0) denominationBreakdown[String(d.value)] = n
    }
    try {
      await closingsRepo.add({
        date: todayDate,
        total_sales: todaySales,
        order_count: todayCount,
        refund_count: refundCount,
        refund_total: refundTotal,
        payment_breakdown: paymentBreakdown,
        closing_denomination_breakdown: denominationBreakdown,
        closed_by: null,
        note: note.trim() || null,
      })
      setClosed(true)
      setClosedAt(new Date().toISOString())
      setDialogOpen(false)
      setCounts({})
      setNote('')
      toast.success('営業を締めました')
    } catch {
      toast.error('営業締め処理に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (closed) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
        <span className="font-medium">本日の営業は締め済みです</span>
        <span className="text-gray-400 text-xs">売上 ¥{todaySales.toLocaleString()}</span>
        {closedAt && (
          <span className="text-gray-400 text-xs ml-auto">
            {new Date(closedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 締め
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="text-sm text-amber-700">
          <span className="font-semibold">本日の営業締めが未完了です</span>
          <span className="ml-2 text-amber-500 text-xs">売上 ¥{todaySales.toLocaleString()}（{todayCount}件）</span>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 h-9">
          営業を締める
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>営業締め — 現金確認</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {/* 売上サマリー */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span>本日の売上</span>
                <span>¥{todaySales.toLocaleString()}</span>
              </div>
              {Object.entries(paymentBreakdown).map(([key, amount]) => (
                <div key={key} className="flex justify-between text-gray-500 text-xs">
                  <span>{pmNameMap[key] ?? key}</span>
                  <span>¥{amount.toLocaleString()}</span>
                </div>
              ))}
              {refundCount > 0 && (
                <div className="flex justify-between text-red-500 text-xs">
                  <span>返金（{refundCount}件）</span>
                  <span>-¥{refundTotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* 金種入力 */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">現金ドロア内の金種を入力</p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">金種</th>
                      <th className="text-right px-3 py-2 font-medium w-24">枚数</th>
                      <th className="text-right px-3 py-2 font-medium w-28">小計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {DENOMINATIONS.map((d) => {
                      const n = parseInt(counts[d.value] ?? '') || 0
                      return (
                        <tr key={d.value} className="hover:bg-gray-50/50">
                          <td className="px-3 py-1.5 font-medium text-gray-700">{d.label}</td>
                          <td className="px-3 py-1.5 text-right">
                            <input type="text" inputMode="numeric" value={counts[d.value] ?? ''} onChange={(e) => handleCountChange(d.value, e.target.value)} placeholder="0"
                              className="w-16 text-right border border-input rounded-md px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring tabular-nums" />
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">
                            {n > 0 ? `¥${(d.value * n).toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 font-semibold text-gray-800">現金合計</td>
                      <td className="px-3 py-2 text-right font-bold text-lg tabular-nums text-gray-800">¥{cashTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 差異確認 */}
            {cashTotal > 0 && (
              <div className={`rounded-lg px-3 py-2 text-xs ${Math.abs(cashDiff) === 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <div className="flex justify-between">
                  <span>期待値（開店準備金 + 現金売上）</span>
                  <span>¥{expectedCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold mt-0.5">
                  <span>過不足</span>
                  <span>{cashDiff >= 0 ? '+' : ''}{cashDiff.toLocaleString()}円</span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">メモ（任意）</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="特記事項があれば入力..." rows={2}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1" disabled={saving}>キャンセル</Button>
              <Button onClick={handleClose} className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={saving}>
                {saving ? '処理中...' : '営業を締める'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
