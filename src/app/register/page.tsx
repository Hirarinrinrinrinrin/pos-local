import { createClient } from '@/lib/supabase/server'
import { RegisterClient } from './RegisterClient'
import type { Category, Product } from '@/types'

export default async function RegisterPage() {
  const supabase = await createClient()

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .order('sort_order'),
    supabase
      .from('products')
      .select('*, categories(id, name, sort_order, created_at)')
      .eq('is_active', true)
      .order('name'),
  ])

  const categories: Category[] = categoriesResult.data ?? []
  const products: Product[] = productsResult.data ?? []

  return <RegisterClient categories={categories} products={products} />
}
