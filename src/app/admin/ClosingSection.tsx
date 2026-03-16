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
  openingCash: number  // 釣り銭準備金（OpeningSectionから連携）
}

// 金種一覧（高額順）
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
  todayDate,
  isClosed: initialClosed,
  closedAt: initialClosedAt,
  todaySales,
  todayCount,
  refundCount,
  refundTotal,
  paymentBreakdown,
  pmNameMap,
  openingCash,
}: ClosingSectionProps) {
  const [closed, setClosed] = useState(initialClosed)
  const [closedAt, setClosedAt] = useState(initialClosedAt)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [counts, setCounts] = useState<Record<number, string>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // 現金売上（payment_breakdownのcashキー）
  const cashSales = paymentBreakdown['cash'] ?? 0
  // 期待値 = 釣り銭準備金 + 現金売上
  const expectedCash = openingCash + cashSales
  // 実際のレジ現金（金種入力から計算）
  const actualCash = DENOMINATIONS.reduce((sum, d) => {
    const n = parseInt(counts[d.value] ?? '') || 0
    return sum + d.value * n
  }, 0)
  // 差分（実際 - 期待値）
  const diff = actualCash - expectedCash

  const handleCountChange = (value: number, input: string) => {
    if (input !== '' && !/^\d+$/.test(input)) return
    setCounts((prev) => ({ ...prev, [value]: input }))
  }

  const openDialog = () => {
    setStep(1)
    setCounts({})
    setNote('')
    setDialogOpen(true)
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setStep(1)
      setCounts({})
      setNote('')
    }
    setDialogOpen(open)
  }

  const handleClose = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 金種内訳（枚数が1以上のもの）
    const denominationBreakdown: Record<string, number> = {}
    for (const d of DENOMINATIONS) {
      const n = parseInt(counts[d.value] ?? '') || 0
      if (n > 0) denominationBreakdown[String(d.value)] = n
    }

    const { error } = await supabase.from('daily_closings').insert({
      date: todayDate,
      total_sales: todaySales,
      order_count: todayCount,
      refund_count: refundCount,
      refund_total: refundTotal,
      payment_breakdown: paymentBreakdown,
      closing_denomination_breakdown: denominationBreakdown,
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
          <span className="font-semibold">本日の営業は未締めです</span>
          <span className="ml-2 text-amber-500 text-xs">営業終了時に締め処理を行ってください</span>
        </div>
        <Button
          onClick={openDialog}
          className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 h-9"
        >
          営業を締める
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {step === 1 ? 'レジ内金種を入力' : '差分確認・締め実行'}
              </DialogTitle>
              <span className="text-xs text-gray-400 font-normal">{step} / 2</span>
            </div>
          </DialogHeader>

          {/* ===== Step 1: 金種入力 ===== */}
          {step === 1 && (
            <div className="space-y-4 text-sm">
              <p className="text-xs text-gray-500">締め時点のレジ内現金を金種ごとに入力してください。</p>

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
                      const subtotal = d.value * n
                      return (
                        <tr key={d.value} className="hover:bg-gray-50/50">
                          <td className="px-3 py-1.5 font-medium text-gray-700">{d.label}</td>
                          <td className="px-3 py-1.5 text-right">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={counts[d.value] ?? ''}
                              onChange={(e) => handleCountChange(d.value, e.target.value)}
                              placeholder="0"
                              className="w-16 text-right border border-input rounded-md px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring tabular-nums"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">
                            {subtotal > 0 ? `¥${subtotal.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 font-semibold text-gray-800">実際のレジ現金</td>
                      <td className="px-3 py-2 text-right font-bold text-lg tabular-nums text-amber-700">
                        ¥{actualCash.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleDialogChange(false)} className="flex-1">
                  キャンセル
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  次へ →
                </Button>
              </div>
            </div>
          )}

          {/* ===== Step 2: 差分確認 + 締め実行 ===== */}
          {step === 2 && (
            <div className="space-y-4 text-sm">

              {/* 差分ボックス */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 font-medium border-b border-gray-200">
                  レジ現金 差分確認
                </div>
                <div className="px-3 py-3 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>実際のレジ現金（金種入力）</span>
                    <span className="tabular-nums font-medium">¥{actualCash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span className="flex flex-col gap-0.5">
                      <span>期待値</span>
                      <span className="text-gray-400">
                        （釣り銭準備金 ¥{openingCash.toLocaleString()} ＋ 現金売上 ¥{cashSales.toLocaleString()}）
                      </span>
                    </span>
                    <span className="tabular-nums self-start">¥{expectedCash.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between font-semibold pt-2 border-t border-gray-200 ${
                    diff === 0 ? 'text-gray-500' : diff > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>差分</span>
                    <span className="tabular-nums">
                      {diff === 0
                        ? '差異なし'
                        : diff > 0
                        ? `+¥${diff.toLocaleString()} 過剰`
                        : `-¥${Math.abs(diff).toLocaleString()} 不足`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 売上サマリー */}
              <div className="bg-gray-50 rounded-xl px-3 py-3 space-y-1.5">
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>本日の売上</span>
                  <span className="tabular-nums">¥{todaySales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>取引件数</span>
                  <span>{todayCount}件</span>
                </div>
                {refundCount > 0 && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>返金</span>
                    <span>-¥{refundTotal.toLocaleString()}（{refundCount}件）</span>
                  </div>
                )}
                {Object.keys(paymentBreakdown).length > 0 && (
                  <>
                    <Separator className="my-1" />
                    {Object.entries(paymentBreakdown).map(([key, amount]) => (
                      <div key={key} className="flex justify-between text-xs text-gray-500">
                        <span>{pmNameMap[key] ?? key}</span>
                        <span className="tabular-nums">¥{amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

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
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1" disabled={saving}>
                  ← 戻る
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
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
