'use client'
import { useState, useEffect } from 'react'
import { ClosingsClient } from './ClosingsClient'
import { closingsRepo, paymentMethodsRepo } from '@/lib/db'
import type { DailyClosing, PaymentMethodConfig } from '@/types'

export default function ClosingsPage() {
  const [closings, setClosings] = useState<DailyClosing[]>([])
  const [pmNameMap, setPmNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([closingsRepo.list(), paymentMethodsRepo.list()])
      .then(([c, m]) => { setClosings(c); setPmNameMap(Object.fromEntries(m.map((x) => [x.key, x.name]))) })
      .finally(() => setLoading(false))
  }, [])
  if (loading) return <div className="p-6 text-gray-400 text-sm">読み込み中...</div>
  return <ClosingsClient closings={closings} pmNameMap={pmNameMap} />
}