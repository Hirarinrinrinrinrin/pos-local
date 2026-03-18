'use client'
import { useState, useEffect } from 'react'
import { ProductsClient } from './ProductsClient'
import { productsRepo, categoriesRepo } from '@/lib/db'
import type { Category, Product } from '@/types'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const reload = () => Promise.all([productsRepo.list(), categoriesRepo.list()]).then(([p, c]) => { setProducts(p); setCategories(c) })
  useEffect(() => { reload().finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-6 text-gray-400 text-sm">読み込み中...</div>
  return <ProductsClient products={products} categories={categories} onReload={reload} />
}