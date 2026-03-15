import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const [todayOrdersResult, totalOrdersResult, productsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('total')
      .gte('created_at', todayISO)
      .eq('status', 'completed'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  const todayOrders = todayOrdersResult.data ?? []
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const todayCount = todayOrders.length
  const totalCount = totalOrdersResult.count ?? 0
  const productCount = productsResult.count ?? 0

  // Recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, total, payment_method, created_at, status')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">ダッシュボード</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">アクティブ商品数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{productCount}</p>
            <p className="text-xs text-gray-400 mt-1">販売中の商品</p>
          </CardContent>
        </Card>
      </div>

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
                      {order.payment_method === 'cash' ? '現金' : 'カード'}
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
