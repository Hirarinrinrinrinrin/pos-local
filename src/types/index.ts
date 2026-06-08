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
  category_id: string | null
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
  email: string | null
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
  session_id: string | null   // 所属する営業セッション
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

export interface DailyOpening {
  id: string
  date: string  // 'YYYY-MM-DD'
  opening_cash: number
  denomination_breakdown: Record<string, number>  // 金種内訳 {"10000": 3, "1000": 5, ...}
  opened_by: string | null
  note: string | null
  opened_at: string
}

export interface DailyClosing {
  id: string
  date: string  // 'YYYY-MM-DD'
  total_sales: number
  order_count: number
  refund_count: number
  refund_total: number
  payment_breakdown: Record<string, number>
  closing_denomination_breakdown: Record<string, number>  // 締め時の金種内訳
  closed_by: string | null
  note: string | null
  closed_at: string
}

// 営業セッション：1回の「開店→締め」サイクル。1日に複数持てる。
// キッチンカーの午前/午後など、案件ごとに独立した準備金・現金精算・売上を扱う。
export interface BusinessSession {
  id: string
  date: string                   // 開店日（JST 'YYYY-MM-DD'）。集計・並び替え用
  name: string                   // 案件名/ロケ地（例：朝/〇〇マルシェ）
  status: 'open' | 'closed'
  // 開店時
  opening_cash: number
  opening_denomination_breakdown: Record<string, number>
  opened_by: string | null
  opening_note: string | null
  opened_at: string
  // 締め時に確定（それまで null）
  total_sales: number | null
  order_count: number | null
  refund_count: number | null
  refund_total: number | null
  payment_breakdown: Record<string, number> | null
  closing_denomination_breakdown: Record<string, number> | null
  closed_by: string | null
  closing_note: string | null
  closed_at: string | null
}
