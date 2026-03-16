'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { DailyClosing } from '@/types'

interface ProductRow {
  name: string
  quantity: number
  total: number
}

interface ClosingsClientProps {
  closings: DailyClosing[]
  pmNameMap: Record<string, string>
}

export function ClosingsClient({ closings, pmNameMap }: ClosingsClientProps) {
  const [selected, setSelected] = useState<DailyClosing | null>(null)
  const [productBreakdown, setProductBreakdown] = useState<ProductRow[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const handleRowClick = async (closing: DailyClosing) => {
    setSelected(closing)
    setProductBreakdown([])
    setLoadingProducts(true)

    const supabase = createClient()
    const start = new Date(closing.date + 'T00:00:00+09:00').toISOString()
    const end = new Date(
      new Date(closing.date + 'T00:00:00+09:00').getTime() + 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', start)
      .lt('created_at', end)
      .eq('status', 'completed')

    if (orders && orders.length > 0) {
      const orderIds = orders.map((o) => o.id)
      const { data: items } = await supabase
        .from('order_items')
        .select('name, price, quantity')
        .in('order_id', orderIds)

      if (items) {
        const map: Record<string, { quantity: number; total: number }> = {}
        for (const item of items) {
          if (!map[item.name]) map[item.name] = { quantity: 0, total: 0 }
          map[item.name].quantity += item.quantity
          map[item.name].total += item.price * item.quantity
        }
        setProductBreakdown(
          Object.entries(map)
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.total - a.total)
        )
      }
    }

    setLoadingProducts(false)
  }

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
                  onClick={() => handleRowClick(c)}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{c.date}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{c.order_count}件</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ¥{c.total_sales.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {c.refund_count > 0 ? (
                      <span className="text-red-500">-{c.refund_count}件</span>
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
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.date} の締め詳細</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {/* 売上サマリー */}
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

              {/* 支払方法別 */}
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

              <Separator />

              {/* 商品別販売点数 */}
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 font-medium">商品別販売点数</p>
                {loadingProducts ? (
                  <p className="text-xs text-gray-400 py-2 text-center">読み込み中...</p>
                ) : productBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">データなし</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 border-b">
                        <th className="pb-1 font-medium">商品名</th>
                        <th className="pb-1 font-medium text-right">数量</th>
                        <th className="pb-1 font-medium text-right">売上</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {productBreakdown.map((row) => (
                        <tr key={row.name}>
                          <td className="py-1 text-gray-700 truncate max-w-[120px]">{row.name}</td>
                          <td className="py-1 text-right text-gray-500">{row.quantity}点</td>
                          <td className="py-1 text-right font-medium text-gray-800">
                            ¥{row.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

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
