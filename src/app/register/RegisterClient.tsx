'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProductCard } from '@/components/register/ProductCard'
import { CartPanel } from '@/components/register/CartPanel'
import { PaymentDialog } from '@/components/register/PaymentDialog'
import { ReceiptDialog } from '@/components/register/ReceiptDialog'
import { CustomItemDialog } from '@/components/register/CustomItemDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCartStore } from '@/store/cartStore'
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
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  const { items, total } = useCartStore()
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  const handleOrderComplete = (order: Order) => {
    setCompletedOrder(order)
    setPaymentOpen(false)
    setCartDrawerOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* 商品エリア */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
          <h1 className="text-lg font-bold text-gray-800">POSレジ</h1>
          <Link
            href="/admin"
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            管理画面
          </Link>
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
              {/* lg未満はボトムバー分の余白 */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 lg:pb-4 pb-24">
                <TabsContent value="all" className="mt-0">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {products.map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                </TabsContent>
                {categories.map((cat) => (
                  <TabsContent key={cat.id} value={cat.id} className="mt-0">
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {products.filter((p) => p.category_id === cat.id).map((p) => <ProductCard key={p.id} product={p} />)}
                    </div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          )}
        </div>
      </div>

      {/* カートパネル：lg以上は右サイドバー */}
      <div className="hidden lg:flex w-80 shrink-0 flex-col overflow-hidden">
        <CartPanel onCheckout={() => setPaymentOpen(true)} />
      </div>

      {/* lg未満：ボトムカートバー */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30">
        <button
          onClick={() => setCartDrawerOpen(true)}
          className="w-full bg-blue-600 text-white flex items-center justify-between px-5 py-4 shadow-lg active:bg-blue-700 transition-colors touch-manipulation"
        >
          <div className="flex items-center gap-2">
            <span className="bg-white text-blue-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {itemCount}
            </span>
            <span className="text-sm font-semibold">注文内容を確認</span>
          </div>
          <span className="text-lg font-bold">¥{total().toLocaleString()}</span>
        </button>
      </div>

      {/* lg未満：カートドロワー */}
      {cartDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCartDrawerOpen(false)}
          />
          {/* ドロワー本体 */}
          <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 shrink-0">
              <h2 className="text-base font-bold text-gray-800">注文内容</h2>
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartPanel
                onCheckout={() => { setCartDrawerOpen(false); setPaymentOpen(true) }}
                hideHeader
              />
            </div>
          </div>
        </div>
      )}

      <CustomItemDialog open={customItemOpen} onClose={() => setCustomItemOpen(false)} />
      <PaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} onComplete={handleOrderComplete} paymentMethods={paymentMethods} />
      <ReceiptDialog open={!!completedOrder} order={completedOrder} onClose={() => setCompletedOrder(null)} paymentMethods={paymentMethods} />
    </div>
  )
}
