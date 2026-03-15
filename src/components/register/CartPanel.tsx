'use client'

import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface CartPanelProps {
  onCheckout: () => void
}

export function CartPanel({ onCheckout }: CartPanelProps) {
  const { items, removeItem, updateQuantity, subtotal, tax, total } = useCartStore()

  return (
    <div className="flex h-full flex-col bg-white border-l border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">注文内容</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 mt-8 text-sm">商品を選択してください</p>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                <p className="text-sm text-gray-500">¥{item.product.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-lg leading-none hover:bg-gray-100 active:scale-90 touch-manipulation"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-lg leading-none hover:bg-gray-100 active:scale-90 touch-manipulation"
                >
                  ＋
                </button>
              </div>
              <p className="w-16 text-right text-sm font-bold text-gray-800">
                ¥{(item.product.price * item.quantity).toLocaleString()}
              </p>
              <button
                onClick={() => removeItem(item.product.id)}
                className="text-gray-400 hover:text-red-500 transition-colors touch-manipulation p-1"
                aria-label="削除"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>小計（税抜）</span>
          <span>¥{subtotal().toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>消費税（10%）</span>
          <span>¥{tax().toLocaleString()}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between text-xl font-bold text-gray-900">
          <span>合計</span>
          <span>¥{total().toLocaleString()}</span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 space-y-2">
        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 touch-manipulation"
        >
          お会計
        </Button>
        <Button
          variant="outline"
          onClick={() => useCartStore.getState().clearCart()}
          disabled={items.length === 0}
          className="w-full text-sm text-gray-500 touch-manipulation"
        >
          クリア
        </Button>
      </div>
    </div>
  )
}
