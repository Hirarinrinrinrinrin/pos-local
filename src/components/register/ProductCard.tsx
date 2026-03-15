'use client'

import { useCartStore } from '@/store/cartStore'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)

  return (
    <button
      onClick={() => addItem(product)}
      className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:scale-95 transition-transform touch-manipulation select-none hover:bg-gray-50 min-h-[100px]"
    >
      <span className="text-sm font-semibold text-gray-800 text-center leading-tight">
        {product.name}
      </span>
      <span className="mt-1.5 text-base font-bold text-blue-600">
        ¥{product.price.toLocaleString()}
      </span>
    </button>
  )
}
