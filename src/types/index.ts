export type Role = 'admin' | 'cashier'
export type PaymentMethod = string   // payment_methods.key の値（例: 'cash', 'card', 'paypay'）
export type OrderStatus = 'completed' | 'refunded'

export interface PaymentMethodConfig {
  id: string
  name: string
  key: string
  requires_change: boolean
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Category {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  price: number
  category_id: string
  image_url: string | null
  stock: number | null
  is_active: boolean
  created_at: string
  categories?: Category
}

export interface Staff {
  id: string
  name: string
  role: Role
  email: string
  created_at: string
}

export interface Order {
  id: string
  total: number
  payment_method: PaymentMethod
  payment_amount: number
  change_amount: number
  status: OrderStatus
  staff_id: string | null
  created_at: string
  order_items?: OrderItem[]
  staff?: Staff
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  name: string
  price: number
  quantity: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface DailySummary {
  date: string
  total: number
  order_count: number
}
