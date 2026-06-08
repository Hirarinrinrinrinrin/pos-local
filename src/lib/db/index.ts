import Dexie, { type Table } from 'dexie'
import type {
  Category,
  Product,
  PaymentMethodConfig,
  Order,
  OrderItem,
  DailyOpening,
  DailyClosing,
  BusinessSession,
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
  dailyOpenings!: Table<DailyOpening>   // v1 レガシー（v2 で sessions へ移行）
  dailyClosings!: Table<DailyClosing>   // v1 レガシー（v2 で sessions へ移行）
  sessions!: Table<BusinessSession>
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

    // v2: 営業セッション化。orders に session_id を追加し、
    // 既存の dailyOpenings / dailyClosings を sessions へ移行する。
    this.version(2)
      .stores({
        orders:   'id, created_at, status, payment_method, session_id',
        sessions: 'id, date, status',
      })
      .upgrade(async (tx) => {
        const jstDate = (iso: string) =>
          new Date(new Date(iso).getTime() + JST_OFFSET).toISOString().slice(0, 10)

        const openings = await tx.table('dailyOpenings').toArray()
        const closings = await tx.table('dailyClosings').toArray()
        const closingByDate: Record<string, DailyClosing> = Object.fromEntries(
          closings.map((c) => [c.date, c])
        )
        const sessionByDate: Record<string, string> = {}

        for (const op of openings) {
          const c = closingByDate[op.date]
          const id = newId()
          sessionByDate[op.date] = id
          await tx.table('sessions').add({
            id,
            date: op.date,
            name: op.date,
            status: c ? 'closed' : 'open',
            opening_cash: op.opening_cash,
            opening_denomination_breakdown: op.denomination_breakdown ?? {},
            opened_by: op.opened_by ?? null,
            opening_note: op.note ?? null,
            opened_at: op.opened_at,
            total_sales: c?.total_sales ?? null,
            order_count: c?.order_count ?? null,
            refund_count: c?.refund_count ?? null,
            refund_total: c?.refund_total ?? null,
            payment_breakdown: c?.payment_breakdown ?? null,
            closing_denomination_breakdown: c?.closing_denomination_breakdown ?? null,
            closed_by: c?.closed_by ?? null,
            closing_note: c?.note ?? null,
            closed_at: c?.closed_at ?? null,
          })
        }

        // 開店記録のない締めも取りこぼさない
        for (const c of closings) {
          if (sessionByDate[c.date]) continue
          const id = newId()
          sessionByDate[c.date] = id
          await tx.table('sessions').add({
            id,
            date: c.date,
            name: c.date,
            status: 'closed',
            opening_cash: 0,
            opening_denomination_breakdown: {},
            opened_by: null,
            opening_note: null,
            opened_at: c.closed_at,
            total_sales: c.total_sales,
            order_count: c.order_count,
            refund_count: c.refund_count,
            refund_total: c.refund_total,
            payment_breakdown: c.payment_breakdown,
            closing_denomination_breakdown: c.closing_denomination_breakdown,
            closed_by: c.closed_by,
            closing_note: c.note,
            closed_at: c.closed_at,
          })
        }

        // 既存注文を JST 日付でセッションに割り当て
        const orders = await tx.table('orders').toArray()
        for (const o of orders) {
          await tx.table('orders').update(o.id, {
            session_id: sessionByDate[jstDate(o.created_at)] ?? null,
          })
        }
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
  forSession: (sessionId: string) =>
    db.orders.where('session_id').equals(sessionId).toArray(),
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
// Business Sessions（営業セッション：1日に複数の開店→締めサイクル）
// ──────────────────────────────────────────────
type SessionOpenInput = {
  date: string
  name: string
  opening_cash: number
  opening_denomination_breakdown: Record<string, number>
  opened_by: string | null
  opening_note: string | null
}

type SessionCloseInput = {
  total_sales: number
  order_count: number
  refund_count: number
  refund_total: number
  payment_breakdown: Record<string, number>
  closing_denomination_breakdown: Record<string, number>
  closed_by: string | null
  closing_note: string | null
}

export const sessionsRepo = {
  // 営業中（開いている）セッション。同時に開けるのは1つだけ。
  active: () => db.sessions.where('status').equals('open').first(),
  // 新しい順（開店時刻の降順）
  list: async (): Promise<BusinessSession[]> => {
    const all = await db.sessions.toArray()
    return all.sort((a, b) => b.opened_at.localeCompare(a.opened_at))
  },
  forDate: (date: string) => db.sessions.where('date').equals(date).toArray(),
  open: async (payload: SessionOpenInput): Promise<BusinessSession> => {
    const session: BusinessSession = {
      id: newId(),
      status: 'open',
      opened_at: new Date().toISOString(),
      total_sales: null,
      order_count: null,
      refund_count: null,
      refund_total: null,
      payment_breakdown: null,
      closing_denomination_breakdown: null,
      closed_by: null,
      closing_note: null,
      closed_at: null,
      ...payload,
    }
    await db.sessions.add(session)
    return session
  },
  close: (id: string, payload: SessionCloseInput) =>
    db.sessions.update(id, { status: 'closed', closed_at: new Date().toISOString(), ...payload }),
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
      db.sessions.clear(),
    ])
  },
  all: async () => {
    await Promise.all([
      db.orders.clear(),
      db.orderItems.clear(),
      db.dailyOpenings.clear(),
      db.dailyClosings.clear(),
      db.sessions.clear(),
      db.products.clear(),
      db.categories.clear(),
      db.paymentMethods.clear(),
    ])
  },
}
