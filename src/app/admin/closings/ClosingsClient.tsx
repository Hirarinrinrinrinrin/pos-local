'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { DailyClosing } from '@/types'

interface ClosingsClientProps {
  closings: DailyClosing[]
  pmNameMap: Record<string, string>
}

export function ClosingsClient({ closings, pmNameMap }: ClosingsClientProps) {
  const [selected, setSelected] = useState<DailyClosing | null>(null)

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">営業締め履歴</h2>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">日付</th>
              <th className="px-4 py-3 font-medium text-right">取引件数</th>
              <th className="px-4 py-3 font-medium text-right">売上合計</th>
              <th className="px-4 py-3 font-medium text-right">返金</th>
              <th className="px-4 py-3 font-medium">締め時刻</th>
              <th className="px-4 py-3 font-medium">メモ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {closings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  締め履歴がありません
                </td>
              </tr>
            ) : (
              closings.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelected(c)}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{c.date}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{c.order_count}件</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ¥{c.total_sales.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {c.refund_count > 0 ? (
                      <span className="text-red-500">
                        -{c.refund_count}件
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(c.closed_at).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[120px]">
                    {c.note ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 詳細ダイアログ */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selected?.date} の締め詳細</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between font-semibold text-base">
                  <span>売上合計</span>
                  <span>¥{selected.total_sales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>取引件数</span>
                  <span>{selected.order_count}件</span>
                </div>
                {selected.refund_count > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>返金</span>
                    <span>
                      -¥{selected.refund_total.toLocaleString()}（{selected.refund_count}件）
                    </span>
                  </div>
                )}
              </div>

              {Object.keys(selected.payment_breakdown).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium">支払方法別</p>
                  {Object.entries(selected.payment_breakdown).map(([key, amount]) => (
                    <div key={key} className="flex justify-between text-gray-600">
                      <span>{pmNameMap[key] ?? key}</span>
                      <span>¥{(amount as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.note && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">メモ</p>
                    <p className="text-gray-700">{selected.note}</p>
                  </div>
                </>
              )}

              <p className="text-xs text-gray-400 text-right">
                {new Date(selected.closed_at).toLocaleString('ja-JP')} 締め
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
