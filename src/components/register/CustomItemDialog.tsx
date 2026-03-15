'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Numpad } from './Numpad'

interface CustomItemDialogProps {
  open: boolean
  onClose: () => void
}

export function CustomItemDialog({ open, onClose }: CustomItemDialogProps) {
  const addCustomItem = useCartStore((s) => s.addCustomItem)
  const [name, setName] = useState('')
  const [amountInput, setAmountInput] = useState('')

  // ダイアログが開くたびにリセット
  useEffect(() => {
    if (open) {
      setName('')
      setAmountInput('')
    }
  }, [open])

  const amount = parseInt(amountInput) || 0

  const handleAdd = () => {
    if (amount <= 0) return
    addCustomItem(name.trim() || 'その他', amount)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">その他（金額入力）</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 品名（任意） */}
          <div className="space-y-1">
            <Label htmlFor="custom-name" className="text-sm font-semibold">
              品名（省略可）
            </Label>
            <Input
              id="custom-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="その他"
              className="h-10"
            />
          </div>

          {/* 金額表示 */}
          <div className="flex items-baseline justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-500">金額（税込）</span>
            <span className={`text-3xl font-bold tabular-nums ${
              amountInput ? 'text-gray-900' : 'text-gray-300'
            }`}>
              ¥{amount > 0 ? amount.toLocaleString() : '0'}
            </span>
          </div>

          {/* テンキー */}
          <Numpad value={amountInput} onChange={setAmountInput} />

          {/* ボタン */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 touch-manipulation"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAdd}
              disabled={amount <= 0}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 font-bold touch-manipulation"
            >
              カートに追加
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
