import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">注文履歴</h2>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">日時</th>
              <th className="px-4 py-3 font-medium">商品数</th>
              <th className="px-4 py-3 font-medium">支払方法</th>
              <th className="px-4 py-3 font-medium text-center">状態</th>
              <th className="px-4 py-3 font-medium text-right">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!orders || orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  注文がありません
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(order.created_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.order_items?.length ?? 0}点
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.payment_method === 'cash' ? '現金' : 'カード'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={order.status === 'completed' ? 'default' : 'destructive'}>
                      {order.status === 'completed' ? '完了' : '返金'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ¥{order.total.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
