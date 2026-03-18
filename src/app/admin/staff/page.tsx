'use client'
import { useState, useEffect } from 'react'
import { StaffClient } from './StaffClient'
import { staffRepo } from '@/lib/db'
import type { Staff } from '@/types'

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const reload = () => staffRepo.list().then(setStaffList)
  useEffect(() => { reload().finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-6 text-gray-400 text-sm">読み込み中...</div>
  return <StaffClient staffList={staffList} onReload={reload} />
}