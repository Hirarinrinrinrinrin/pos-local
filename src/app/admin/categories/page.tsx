'use client'
import { useState, useEffect } from 'react'
import { CategoriesClient } from './CategoriesClient'
import { categoriesRepo } from '@/lib/db'
import type { Category } from '@/types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const reload = () => categoriesRepo.list().then(setCategories)
  useEffect(() => { reload().finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-6 text-gray-400 text-sm">読み込み中...</div>
  return <CategoriesClient categories={categories} onReload={reload} />
}