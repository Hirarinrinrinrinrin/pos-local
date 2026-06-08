'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardBanners } from './DashboardBanners'
import { ordersRepo, paymentMethodsRepo, sessionsRepo, todayJST, jstDayRange } from '@/lib/db'
import type { BusinessSession, PaymentMethodConfig } from '@/types'

const JST_OFFSET = 9 * 60 * 60 * 1000

// 営業セッションの売上サマリー（締め処理・案件別表示で使用）
export interface SessionSummary {
  sales: number
  count: number
  refundCount: number
  refundTotal: number
  paymentBreakdown: Record<string, number>
}

async function summarizeSession(sessionId: string): Promise<SessionSummary> {
  const orders = await ordersRepo.forSession(sessionId)
  const completed = orders.filter((o) => o.status === 'completed')
  const refunded  = orders.filter((o) => o.status === 'refunded')
  const paymentBreakdown: Record<string, number> = {}
  for (const o of completed) {
    paymentBreakdown[o.payment_method] = (paymentBreakdown[o.payment_method] ?? 0) + o.total
  }
  return {
    sales: completed.reduce((s, o) => s + o.total, 0),
    count: completed.length,
    refundCount: refunded.length,
    refundTotal: refunded.reduce((s, o) => s + o.total, 0),
    paymentBreakdown,
  }
}

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
  activeSession: BusinessSession | null
  activeSummary: SessionSummary | null
  todaySessions: BusinessSession[]
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const reload = useCallback(() => setRefreshKey((k) => k + 1), [])
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
      activeSession, todaySessions, weekOrders, recentOrders,
    ] = await Promise.all([
      ordersRepo.forDateRange(todayStart, todayEnd),
      ordersRepo.count(),
      paymentMethodsRepo.list(),
      sessionsRepo.active(),
      sessionsRepo.forDate(todayDate),
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

    const activeSummary = activeSession ? await summarizeSession(activeSession.id) : null

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
      activeSession: activeSession ?? null, activeSummary,
      todaySessions: todaySessions.sort((a, b) => b.opened_at.localeCompare(a.opened_at)),
    })
    }
    load()
  }, [todayDate, refreshKey])

  if (!data) return <div className="p-6 flex items-center justify-center h-64 text-gray-400 text-sm">読み込み中...</div>

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">ダッシュボード</h2>

      <DashboardBanners
        todayDate={todayDate}
        activeSession={data.activeSession}
        activeSummary={data.activeSummary}
        pmNameMap={data.pmNameMap}
        onChanged={reload}
      />

      {data.todaySessions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">本日の営業（案件別）</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {data.todaySessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === 'open' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="font-medium text-gray-800 truncate">{s.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {s.status === 'open' ? '営業中' : '締め済'}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 tabular-nums shrink-0">
                    ¥{(s.total_sales ?? data.activeSummary?.sales ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
