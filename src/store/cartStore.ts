import { create } from 'zustand'
import type { CartItem, Product } from '@/types'

const TAX_RATE = 0.10

interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  subtotal: () => number
  tax: () => number
  total: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }
      return { items: [...state.items, { product, quantity: 1 }] }
    })
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }))
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    }))
  },

  clearCart: () => set({ items: [] }),

  subtotal: () => {
    const items = get().items
    const raw = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    // 税込価格から税抜を逆算
    return Math.floor(raw / (1 + TAX_RATE))
  },

  tax: () => {
    const items = get().items
    const raw = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    return raw - Math.floor(raw / (1 + TAX_RATE))
  },

  total: () => {
    return get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  },
}))
