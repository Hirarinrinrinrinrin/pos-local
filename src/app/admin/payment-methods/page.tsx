'use client'
import { useState, useEffect } from 'react'
import { PaymentMethodsClient } from './PaymentMethodsClient'
import { paymentMethodsRepo } from '@/lib/db'
import type { PaymentMethodConfig } from '@/types'

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([])
  const [loading, setLoading] = useState(true)
  const reload = () => paymentMethodsRepo.list().then(setMethods)
  useEffect(() => { reload().finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-6 text-gray-400 text-sm">読み込み中...</div>
  return <PaymentMethodsClient paymentMethods={methods} onReload={reload} />
}