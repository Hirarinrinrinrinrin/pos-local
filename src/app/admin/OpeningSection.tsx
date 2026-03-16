'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Numpad } from '@/components/register/Numpad'
import { toast } from 'sonner'

interface OpeningSectionProps {
  todayDate: string
  isOpened: boolean
  openedAt: string | null
  openingCash: number
  onOpeningConfirmed: (cash: number) => void
}

export function OpeningSection({
  todayDate,
  isOpened: initialOpened,
  openedAt: initialOpenedAt,
  openingCash: initialOpeningCash,
  onOpeningConfirmed,
}: OpeningSectionProps) {
  const [opened, setOpened] = useState(initialOpened)
  const [openedAt, setOpenedAt] = useState(initialOpenedAt)
  const [openingCash, setOpeningCash] = useState(initialOpeningCash)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cashInput, setCashInput] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpen = async () => {
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const cash = parseInt(cashInput) || 0

    const { error } = await supabase.from('daily_openings').insert({
      date: todayDate,
      opening_cash: cash,
      opened_by: user?.id ?? null,
      note: note.trim() || null,
    })

    setSaving(false)
    if (error) {
      toast.error('開店処理に失敗しました')
    } else {
      setOpened(true)
      setOpenedAt(new Date().toISOString())
      setOpeningCash(cash)
      setDialogOpen(false)
      setCashInput('')
      setNote('')
      onOpeningConfirmed(cash)
      toast.success('開店しました')
    }
  }

  if (opened) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <span className="font-medium">本日の営業は開店済みです</span>
        <span className="text-blue-500 text-xs">
          釣り銭準備金 ¥{openingCash.toLocaleString()}
        </span>
        {openedAt && (
          <span className="text-blue-400 text-xs ml-auto">
            {new Date(openedAt).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            開店
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
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 h-9"
        >
          開店する
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>開店処理</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">釣り銭準備金</p>
              <div className="flex items-baseline justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-500">金額</span>
                <span
                  className={`text-3xl font-bold tabular-nums ${
                    cashInput ? 'text-gray-900' : 'text-gray-300'
                  }`}
                >
                  ¥{cashInput ? parseInt(cashInput).toLocaleString() : '0'}
                </span>
              </div>
              <Numpad value={cashInput} onChange={setCashInput} />
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
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleOpen}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? '処理中...' : '開店する'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
