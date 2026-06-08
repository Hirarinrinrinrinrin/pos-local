'use client'
import { useState, useEffect } from 'react'
import { ClosingsClient } from './ClosingsClient'
import { sessionsRepo, paymentMethodsRepo } from '@/lib/db'
import type { BusinessSession, PaymentMethodConfig } from '@/types'

export default function ClosingsPage() {
  const [sessions, setSessions] = useState<BusinessSession[]>([])
  const [pmNameMap, setPmNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([sessionsRepo.list(), paymentMethodsRepo.list()])
      .then(([s, m]) => {
        setSessions(s.filter((x) => x.status === 'closed'))
        setPmNameMap(Object.fromEntries(m.map((x: PaymentMethodConfig) => [x.key, x.name])))
      })
      .finally(() => setLoading(false))
  }, [])
  if (loading) return <div className="p-6 text-gray-400 text-sm">読み込み中...</div>
  return <ClosingsClient sessions={sessions} pmNameMap={pmNameMap} />
}
