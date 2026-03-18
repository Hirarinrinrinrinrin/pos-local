'use client'

import { useState, useEffect } from 'react'
import { RegisterClient } from './RegisterClient'
import { productsRepo, paymentMethodsRepo } from '@/lib/db'
import type { Category, PaymentMethodConfig, Product } from '@/types'

export default function RegisterPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      productsRepo.listActive(),
      paymentMethodsRepo.listActive(),
    ]).then(([prods, methods]) => {
      const cats = Array.from(
        new Map(
          prods
            .filter((p) => p.categories)
            .map((p) => [p.categories!.id, p.categories!])
        ).values()
      ).sort((a, b) => a.sort_order - b.sort_order)

      setCategories(cats)
      setProducts(prods)
      setPaymentMethods(methods)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  return (
    <RegisterClient
      categories={categories}
      products={products}
      paymentMethods={paymentMethods}
    />
  )
}
