'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardBanners } from './DashboardBanners'
import { ordersRepo, paymentMethodsRepo, openingsRepo, closingsRepo, todayJST, jstDayRange } from '@/lib/db'
import type { PaymentMethodConfig } from '@/types'

const JST_OFFSET = 9 * 60 * 60 * 1000

interface DashboardData {
  todaySales: number
  todayCount: number
  refundCount: number
  refundTotal: number
  totalCount: number
  paymentMethods: PaymentMethodConfig[]
  paymentBreakdown: Record<string, number>
  pmNameMap: Record<string, string>
  weekDays: string[]
  weekMap: Record<string, { sales: number; count: number }>
  recentOrders: Array<{ id: string; total: number; payment_method: string; created_at: string; status: string }>
  isOpened: boolean
  openedAt: string | null
  openingCash: number
  isClosed: boolean
  closedAt: string | null
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const todayDate = todayJST()

  useEffect(() => {
    async function load() {
      const jstNow = new Date(Date.now() + JST_OFFSET)
      const { start: todayStart, end: todayEnd } = jstDayRange(todayDate)

      const sevenDaysAgo = new Date(jstNow)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const sevenDaysAgoDate = sevenDaysAgo.toISOString().slice(0, 10)
      const { start: weekStart } = jstDayRange(sevenDaysAgoDate)

      const [
        todayOrders, allCompletedCount, paymentMethods,
        todayClosing, todayOpening, weekOrders, recentOrders,
      ] = await Promise.all([
        ordersRepo.forDateRange(todayStart, todayEnd),
        ordersRepo.count(),
        paymentMethodsRepo.list(),
        closingsRepo.forDate(todayDate),
        openingsRepo.forDate(todayDate),
        ordersRepo.forDateRange(weekStart, todayEnd),
        ordersRepo.recent(10),
      ])

      const completedToday = todayOrders.filter((o) => o.status === 'completed')
      const refundedToday  = todayOrders.filter((o) => o.status === 'refunded')
      const todaySales     = completedToday.reduce((s, o) => s + o.total, 0)
      const refundTotal    = refundedToday.reduce((s, o) => s + o.total, 0)

      const paymentBreakdown: Record<string, number> = {}
      for (const o of completedToday) {
        paymentBreakdown[o.payment_method] = (paymentBreakdown[o.payment_method] ?? 0) + o.total
      }
      const pmNameMap = Object.fromEntries(paymentMethods.map((m) => [m.key, m.name]))

      const completedWeek = weekOrders.filter((o) => o.status === 'completed')
      const weekMap: Record<string, { sales: number; count: number }> = {}
      for (const o of completedWeek) {
        const d = new Date(new Date(o.created_at).getTime() + JST_OFFSET).toISOString().slice(0, 10)
        if (!weekMap[d]) weekMap[d] = { sales: 0, count: 0 }
        weekMap[d].sales += o.total
        weekMap[d].count++
      }
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(jstNow)
        d.setDate(d.getDate() - (6 - i))
        return d.toISOString().slice(0, 10)
      })

      setData({
        todaySales, todayCount: completedToday.length,
        refundCount: refundedToday.length, refundTotal,
        totalCount: allCompletedCount, paymentMethods,
        paymentBreakdown, pmNameMap, weekDays, weekMap, recentOrders,
        isOpened: !!todayOpening, openedAt: todayOpening?.opened_at ?? null,
        openingCash: todayOpening?.opening_cash ?? 0,
        isClosed: !!todayClosing, closedAt: todayClosing?.closed_at ?? null,
      })
    }
    load()
  }, [todayDate])

  if (!data) return <div className="p-6 flex items-center justify-center h-64 text-gray-400 text-sm">読み込み中...</div>

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">ダッシュボード</h2>

      <DashboardBanners
        todayDate={todayDate}
        isOpened={data.isOpened} openedAt={data.openedAt} openingCash={data.openingCash}
        isClosed={data.isClosed} closedAt={data.closedAt}
        todaySales={data.todaySales} todayCount={data.todayCount}
        refundCount={data.refundCount} refundTotal={data.refundTotal}
        paymentBreakdown={data.paymentBreakdown} pmNameMap={data.pmNameMap}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">本日の売上</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">¥{data.todaySales.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{data.todayCount}件の取引</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">累計取引数</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{data.totalCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">完了した注文</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(data.paymentBreakdown).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">本日の支払方法別内訳</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.paymentBreakdown).map(([key, amount]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600">{data.pmNameMap[key] ?? key}</span>
                  <span className="font-semibold text-gray-900">¥{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">過去7日間の売上</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="pb-2 font-medium">日付</th>
                <th className="pb-2 font-medium text-right">件数</th>
                <th className="pb-2 font-medium text-right">売上</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.weekDays.map((d) => {
                const row = data.weekMap[d]
                const isToday = d === todayDate
                return (
                  <tr key={d} className={isToday ? 'bg-blue-50' : ''}>
                    <td className="py-1.5 text-gray-600">
                      {d.slice(5).replace('-', '/')}
                      {isToday && <span className="ml-1.5 text-xs text-blue-600 font-medium">今日</span>}
                    </td>
                    <td className="py-1.5 text-right text-gray-500">{row ? `${row.count}件` : '—'}</td>
                    <td className="py-1.5 text-right font-semibold text-gray-900">{row ? `¥${row.sales.toLocaleString()}` : '¥0'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">最近の注文</CardTitle></CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">注文がありません</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 font-medium">日時</th>
                  <th className="pb-2 font-medium">支払</th>
                  <th className="pb-2 font-medium text-right">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-600">
                      {new Date(order.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 text-gray-600">{data.pmNameMap[order.payment_method] ?? order.payment_method}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">¥{order.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
