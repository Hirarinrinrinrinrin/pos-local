import Dexie, { type Table } from 'dexie'
import type {
  Category,
  Product,
  PaymentMethodConfig,
  Order,
  OrderItem,
  DailyOpening,
  DailyClosing,
  Staff,
} from '@/types'

// Product を DB 保存用に調整（categories は join して取得するため除外）
export type ProductRow = Omit<Product, 'categories'>

export class PosDatabase extends Dexie {
  categories!: Table<Category>
  products!: Table<ProductRow>
  paymentMethods!: Table<PaymentMethodConfig>
  orders!: Table<Order>
  orderItems!: Table<OrderItem>
  dailyOpenings!: Table<DailyOpening>
  dailyClosings!: Table<DailyClosing>
  staff!: Table<Staff>

  constructor() {
    super('pos-local-db')
    this.version(1).stores({
      categories:    'id, sort_order',
      products:      'id, category_id, name',
      paymentMethods:'id, &key, sort_order',
      orders:        'id, created_at, status, payment_method',
      orderItems:    'id, order_id',
      dailyOpenings: 'id, &date',
      dailyClosings: 'id, &date',
      staff:         'id, name, role',
    })
  }
}

export const db = new PosDatabase()

// ──────────────────────────────────────────────
// ヘルパー：UUID 生成
// ──────────────────────────────────────────────
export function newId(): string {
  return crypto.randomUUID()
}

// ──────────────────────────────────────────────
// JST 日付ユーティリティ
// ──────────────────────────────────────────────
const JST_OFFSET = 9 * 60 * 60 * 1000

export function todayJST(): string {
  return new Date(Date.now() + JST_OFFSET).toISOString().slice(0, 10)
}

export function jstDayRange(date: string): { start: string; end: string } {
  const start = new Date(date + 'T00:00:00+09:00').toISOString()
  const end   = new Date(date + 'T23:59:59+09:00').toISOString()
  return { start, end }
}

// ──────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────
export const categoriesRepo = {
  list: () => db.categories.orderBy('sort_order').toArray(),
  add:  (payload: { name: string; sort_order: number }) =>
    db.categories.add({ id: newId(), created_at: new Date().toISOString(), ...payload }),
  update: (id: string, payload: Partial<Category>) => db.categories.update(id, payload),
  delete: (id: string) => db.categories.delete(id),
}

// ──────────────────────────────────────────────
// Products（categories を join して返す）
// ──────────────────────────────────────────────
export const productsRepo = {
  list: async (): Promise<Product[]> => {
    const [rows, cats] = await Promise.all([
      db.products.orderBy('name').toArray(),
      db.categories.toArray(),
    ])
    const catMap = Object.fromEntries(cats.map((c) => [c.id, c]))
    return rows.map((p) => ({ ...p, categories: p.category_id ? catMap[p.category_id] : undefined }))
  },
  listActive: async (): Promise<Product[]> => {
    const [rows, cats] = await Promise.all([
      db.products.orderBy('name').toArray(),
      db.categories.toArray(),
    ])
    const catMap = Object.fromEntries(cats.map((c) => [c.id, c]))
    return rows
      .filter((p) => p.is_active)
      .map((p) => ({ ...p, categories: p.category_id ? catMap[p.category_id] : undefined }))
  },
  add: (payload: Omit<ProductRow, 'id' | 'created_at'>) =>
    db.products.add({
      id: newId(),
      created_at: new Date().toISOString(),
      ...payload,
    }),
  update: (id: string, payload: Partial<ProductRow>) => db.products.update(id, payload),
  delete: (id: string) => db.products.delete(id),
}

// ──────────────────────────────────────────────
// PaymentMethods
// ──────────────────────────────────────────────
export const paymentMethodsRepo = {
  list:       () => db.paymentMethods.orderBy('sort_order').toArray(),
  listActive: () => db.paymentMethods.orderBy('sort_order').filter((m) => m.is_active).toArray(),
  add:  (payload: Omit<PaymentMethodConfig, 'id' | 'created_at'>) =>
    db.paymentMethods.add({ id: newId(), created_at: new Date().toISOString(), ...payload }),
  update: (id: string, payload: Partial<PaymentMethodConfig>) => db.paymentMethods.update(id, payload),
  delete: (id: string) => db.paymentMethods.delete(id),
  upsertByKey: async (payload: Omit<PaymentMethodConfig, 'id' | 'created_at'>) => {
    const existing = await db.paymentMethods.where('key').equals(payload.key).first()
    if (existing) {
      await db.paymentMethods.update(existing.id, payload)
    } else {
      await db.paymentMethods.add({ id: newId(), created_at: new Date().toISOString(), ...payload })
    }
  },
}

// ──────────────────────────────────────────────
// Orders
// ──────────────────────────────────────────────
export const ordersRepo = {
  list: () => db.orders.orderBy('created_at').reverse().toArray(),
  listWithItems: async (): Promise<Order[]> => {
    const orders = await db.orders.orderBy('created_at').reverse().toArray()
    const items  = await db.orderItems.toArray()
    return orders.map((o) => ({
      ...o,
      order_items: items.filter((i) => i.order_id === o.id),
    }))
  },
  recent: (limit = 10) => db.orders.orderBy('created_at').reverse().limit(limit).toArray(),
  forDay: (date: string) => {
    const { start, end } = jstDayRange(date)
    return db.orders.where('created_at').between(start, end, true, true).toArray()
  },
  forDateRange: (startISO: string, endISO: string) =>
    db.orders.where('created_at').between(startISO, endISO, true, true).toArray(),
  count: () => db.orders.where('status').equals('completed').count(),
  add: async (
    payload: Omit<Order, 'id' | 'created_at' | 'order_items' | 'staff' | 'staff_id'>,
    items: Omit<OrderItem, 'id' | 'order_id'>[]
  ): Promise<Order> => {
    const id = newId()
    const created_at = new Date().toISOString()
    const order: Order = { id, created_at, staff_id: null, ...payload }
    await db.orders.add(order)
    await db.orderItems.bulkAdd(
      items.map((item) => ({ id: newId(), order_id: id, ...item }))
    )
    return order
  },
  update: (id: string, payload: Partial<Order>) => db.orders.update(id, payload),
}

// ──────────────────────────────────────────────
// OrderItems
// ──────────────────────────────────────────────
export const orderItemsRepo = {
  forOrder:  (orderId: string) => db.orderItems.where('order_id').equals(orderId).toArray(),
  forOrders: (orderIds: string[]) => db.orderItems.where('order_id').anyOf(orderIds).toArray(),
}

// ──────────────────────────────────────────────
// Daily Openings
// ──────────────────────────────────────────────
export const openingsRepo = {
  forDate: (date: string) => db.dailyOpenings.where('date').equals(date).first(),
  add: (payload: Omit<DailyOpening, 'id' | 'opened_at'>) =>
    db.dailyOpenings.add({ id: newId(), opened_at: new Date().toISOString(), ...payload }),
}

// ──────────────────────────────────────────────
// Daily Closings
// ──────────────────────────────────────────────
export const closingsRepo = {
  list:    () => db.dailyClosings.orderBy('date').reverse().toArray(),
  forDate: (date: string) => db.dailyClosings.where('date').equals(date).first(),
  add: (payload: Omit<DailyClosing, 'id' | 'closed_at'>) =>
    db.dailyClosings.add({ id: newId(), closed_at: new Date().toISOString(), ...payload }),
}

// ──────────────────────────────────────────────
// Staff
// ──────────────────────────────────────────────
export const staffRepo = {
  list:   () => db.staff.orderBy('name').toArray(),
  add:    (payload: { name: string; role: 'admin' | 'cashier'; email?: string }) =>
    db.staff.add({
      id: newId(),
      created_at: new Date().toISOString(),
      email: payload.email ?? null,
      ...payload,
    }),
  update: (id: string, payload: Partial<Staff>) => db.staff.update(id, payload),
  delete: (id: string) => db.staff.delete(id),
}

// ──────────────────────────────────────────────
// Setup: 全データリセット
// ──────────────────────────────────────────────
export const resetRepo = {
  orders: async () => {
    await Promise.all([
      db.orders.clear(),
      db.orderItems.clear(),
      db.dailyOpenings.clear(),
      db.dailyClosings.clear(),
    ])
  },
  all: async () => {
    await Promise.all([
      db.orders.clear(),
      db.orderItems.clear(),
      db.dailyOpenings.clear(),
      db.dailyClosings.clear(),
      db.products.clear(),
      db.categories.clear(),
      db.paymentMethods.clear(),
    ])
  },
}
