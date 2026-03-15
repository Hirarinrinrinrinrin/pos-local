export type Role = 'admin' | 'cashier'
export type PaymentMethod = string   // payment_methods.key の値（例: 'cash', 'card', 'paypay'）
export type OrderStatus = 'completed' | 'refunded'

export interface PaymentMethodConfig {
  id: string
  name: string
  key: string
  requires_amount_input: boolean   // テンキーで金額入力が必要か
  requires_change: boolean         // お釣り計算が必要か（requires_amount_input=true が前提）
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

export interface DailyClosing {
  id: string
  date: string  // 'YYYY-MM-DD'
  total_sales: number
  order_count: number
  refund_count: number
  refund_total: number
  payment_breakdown: Record<string, number>
  closed_by: string | null
  note: string | null
  closed_at: string
}
