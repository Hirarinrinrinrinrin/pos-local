'use client'

import { useState } from 'react'
import { ProductCard } from '@/components/register/ProductCard'
import { CartPanel } from '@/components/register/CartPanel'
import { PaymentDialog } from '@/components/register/PaymentDialog'
import { ReceiptDialog } from '@/components/register/ReceiptDialog'
import { CustomItemDialog } from '@/components/register/CustomItemDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Category, Order, PaymentMethodConfig, Product } from '@/types'

interface RegisterClientProps {
  categories: Category[]
  products: Product[]
  paymentMethods: PaymentMethodConfig[]
}

export function RegisterClient({ categories, products, paymentMethods }: RegisterClientProps) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [customItemOpen, setCustomItemOpen] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)

  const handleOrderComplete = (order: Order) => {
    setCompletedOrder(order)
    setPaymentOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
          <h1 className="text-lg font-bold text-gray-800">POSレジ</h1>
          <a
            href="/admin"
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            管理画面
          </a>
        </header>

        <div className="px-4 pt-3 shrink-0">
          <button
            onClick={() => setCustomItemOpen(true)}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-semibold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 active:scale-[0.99] transition-colors touch-manipulation"
          >
            ＋ その他（金額入力）
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {categories.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg">商品がありません</p>
                <p className="text-sm mt-1">管理画面から商品を追加してください</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue={categories[0]?.id ?? 'all'} className="h-full flex flex-col">
              <div className="px-4 pt-3 shrink-0">
                <TabsList className="flex w-full gap-1 h-auto bg-transparent p-0 flex-wrap">
                  <TabsTrigger value="all" className="rounded-full border data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 px-4 py-1.5 text-sm">
                    すべて
                  </TabsTrigger>
                  {categories.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.id} className="rounded-full border data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 px-4 py-1.5 text-sm">
                      {cat.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
                <TabsContent value="all" className="mt-0">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                    {products.map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                </TabsContent>
                {categories.map((cat) => (
                  <TabsContent key={cat.id} value={cat.id} className="mt-0">
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                      {products.filter((p) => p.category_id === cat.id).map((p) => <ProductCard key={p.id} product={p} />)}
                    </div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          )}
        </div>
      </div>

      <div className="w-80 shrink-0 flex flex-col overflow-hidden">
        <CartPanel onCheckout={() => setPaymentOpen(true)} />
      </div>

      <CustomItemDialog open={customItemOpen} onClose={() => setCustomItemOpen(false)} />
      <PaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} onComplete={handleOrderComplete} paymentMethods={paymentMethods} />
      <ReceiptDialog open={!!completedOrder} order={completedOrder} onClose={() => setCompletedOrder(null)} paymentMethods={paymentMethods} />
    </div>
  )
}
