'use client'
import { useState, useEffect } from 'react'
import { OrdersClient } from './OrdersClient'
import { ordersRepo, paymentMethodsRepo } from '@/lib/db'
import type { Order, PaymentMethodConfig } from '@/types'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([ordersRepo.listWithItems(), paymentMethodsRepo.list()])
      .then(([o, p]) => { setOrders(o); setPaymentMethods(p) })
      .finally(() => setLoading(false))
  }, [])
  if (loading) return <div className="p-6 text-gray-400 text-sm">読み込み中...</div>
  return <OrdersClient orders={orders} paymentMethods={paymentMethods} onReload={() => ordersRepo.listWithItems().then(setOrders)} />
}