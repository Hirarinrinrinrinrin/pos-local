import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardBanners } from './DashboardBanners'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // JST での今日の日付
  const jstOffset = 9 * 60 * 60 * 1000
  const jstNow = new Date(Date.now() + jstOffset)
  const todayJST = jstNow.toISOString().slice(0, 10) // 'YYYY-MM-DD'
  const todayISO = new Date(todayJST + 'T00:00:00+09:00').toISOString()

  const [todayOrdersResult, totalOrdersResult, paymentMethodsResult, todayClosingResult, todayOpeningResult] =
    await Promise.all([
      supabase
        .from('orders')
        .select('total, payment_method, status')
        .gte('created_at', todayISO),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase.from('payment_methods').select('key, name').order('sort_order'),
      supabase.from('daily_closings').select('*').eq('date', todayJST).maybeSingle(),
      supabase.from('daily_openings').select('*').eq('date', todayJST).maybeSingle(),
    ])

  const todayOrders = todayOrdersResult.data ?? []
  const completedToday = todayOrders.filter((o) => o.status === 'completed')
  const refundedToday = todayOrders.filter((o) => o.status === 'refunded')
  const todaySales = completedToday.reduce((sum, o) => sum + o.total, 0)
  const todayCount = completedToday.length
  const refundCount = refundedToday.length
  const refundTotal = refundedToday.reduce((sum, o) => sum + o.total, 0)
  const totalCount = totalOrdersResult.count ?? 0
  const paymentMethods = paymentMethodsResult.data ?? []
  const todayClosing = todayClosingResult.data ?? null
  const todayOpening = todayOpeningResult.data ?? null

  // 本日の支払方法別内訳
  const paymentBreakdown: Record<string, number> = {}
  for (const order of completedToday) {
    paymentBreakdown[order.payment_method] =
      (paymentBreakdown[order.payment_method] ?? 0) + order.total
  }
  const pmNameMap = Object.fromEntries(paymentMethods.map((m) => [m.key, m.name]))

  // 過去7日間 (JST 日付ベース)
  const sevenDaysAgoDate = new Date(jstNow)
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6)
  const sevenDaysAgoISO = new Date(
    sevenDaysAgoDate.toISOString().slice(0, 10) + 'T00:00:00+09:00'
  ).toISOString()

  const { data: weekOrders } = await supabase
    .from('orders')
    .select('total, created_at')
    .gte('created_at', sevenDaysAgoISO)
    .eq('status', 'completed')

  const weekMap: Record<string, { sales: number; count: number }> = {}
  for (const order of weekOrders ?? []) {
    const d = new Date(new Date(order.created_at).getTime() + jstOffset)
      .toISOString()
      .slice(0, 10)
    if (!weekMap[d]) weekMap[d] = { sales: 0, count: 0 }
    weekMap[d].sales += order.total
    weekMap[d].count++
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(jstNow)
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })

  // 最近の注文
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, total, payment_method, created_at, status')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">ダッシュボード</h2>

      {/* 開店・営業締めバナー */}
      <DashboardBanners
        todayDate={todayJST}
        isOpened={!!todayOpening}
        openedAt={todayOpening?.opened_at ?? null}
        openingCash={todayOpening?.opening_cash ?? 0}
        isClosed={!!todayClosing}
        closedAt={todayClosing?.closed_at ?? null}
        todaySales={todaySales}
        todayCount={todayCount}
        refundCount={refundCount}
        refundTotal={refundTotal}
        paymentBreakdown={paymentBreakdown}
        pmNameMap={pmNameMap}
      />

      {/* 本日サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">本日の売上</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">¥{todaySales.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{todayCount}件の取引</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">累計取引数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">完了した注文</p>
          </CardContent>
        </Card>
      </div>

      {/* 本日の支払方法別内訳 */}
      {Object.keys(paymentBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本日の支払方法別内訳</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(paymentBreakdown).map(([key, amount]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600">{pmNameMap[key] ?? key}</span>
                  <span className="font-semibold text-gray-900">¥{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 過去7日間の売上 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">過去7日間の売上</CardTitle>
        </CardHeader>
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
              {weekDays.map((d) => {
                const row = weekMap[d]
                const isToday = d === todayJST
                return (
                  <tr key={d} className={isToday ? 'bg-blue-50' : ''}>
                    <td className="py-1.5 text-gray-600">
                      {d.slice(5).replace('-', '/')}
                      {isToday && (
                        <span className="ml-1.5 text-xs text-blue-600 font-medium">今日</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-gray-500">
                      {row ? `${row.count}件` : '—'}
                    </td>
                    <td className="py-1.5 text-right font-semibold text-gray-900">
                      {row ? `¥${row.sales.toLocaleString()}` : '¥0'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 最近の注文 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近の注文</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentOrders || recentOrders.length === 0 ? (
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
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-600">
                      {new Date(order.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 text-gray-600">
                      {pmNameMap[order.payment_method] ?? order.payment_method}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900">
                      ¥{order.total.toLocaleString()}
                    </td>
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
