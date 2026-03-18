'use client'

import { useState } from 'react'
import { openingsRepo } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface OpeningSectionProps {
  todayDate: string
  isOpened: boolean
  openedAt: string | null
  openingCash: number
  onOpeningConfirmed: (cash: number) => void
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

export function OpeningSection({
  todayDate, isOpened: initialOpened, openedAt: initialOpenedAt,
  openingCash: initialOpeningCash, onOpeningConfirmed,
}: OpeningSectionProps) {
  const [opened, setOpened] = useState(initialOpened)
  const [openedAt, setOpenedAt] = useState(initialOpenedAt)
  const [openingCash, setOpeningCash] = useState(initialOpeningCash)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [counts, setCounts] = useState<Record<number, string>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const total = DENOMINATIONS.reduce((sum, d) => {
    return sum + d.value * (parseInt(counts[d.value] ?? '') || 0)
  }, 0)

  const handleCountChange = (value: number, input: string) => {
    if (input !== '' && !/^d+$/.test(input)) return
    setCounts((prev) => ({ ...prev, [value]: input }))
  }

  const handleOpen = async () => {
    setSaving(true)
    const denominationBreakdown: Record<string, number> = {}
    for (const d of DENOMINATIONS) {
      const n = parseInt(counts[d.value] ?? '') || 0
      if (n > 0) denominationBreakdown[String(d.value)] = n
    }
    try {
      await openingsRepo.add({
        date: todayDate,
        opening_cash: total,
        denomination_breakdown: denominationBreakdown,
        opened_by: null,
        note: note.trim() || null,
      })
      setOpened(true)
      setOpenedAt(new Date().toISOString())
      setOpeningCash(total)
      setDialogOpen(false)
      setCounts({})
      setNote('')
      onOpeningConfirmed(total)
      toast.success('開店しました')
    } catch {
      toast.error('開店処理に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (opened) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <span className="font-medium">本日の営業は開店済みです</span>
        <span className="text-blue-500 text-xs">釣り銭準備金 ¥{openingCash.toLocaleString()}</span>
        {openedAt && (
          <span className="text-blue-400 text-xs ml-auto">
            {new Date(openedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 開店
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="text-sm text-blue-700">
          <span className="font-semibold">本日の開店処理が未完了です</span>
          <span className="ml-2 text-blue-400 text-xs">釣り銭準備金を登録してください</span>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 h-9">
          開店する
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>開店処理 — 釣り銭準備金</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
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
                    <td colSpan={2} className="px-3 py-2 font-semibold text-gray-800">合計</td>
                    <td className="px-3 py-2 text-right font-bold text-lg tabular-nums text-blue-700">¥{total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <Separator />
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">メモ（任意）</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="特記事項があれば入力..." rows={2}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1" disabled={saving}>キャンセル</Button>
              <Button onClick={handleOpen} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving || total === 0}>
                {saving ? '処理中...' : '開店する'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
