import { createClient } from '@/lib/supabase/server'
import { ProductsClient } from './ProductsClient'

export default async function ProductsPage() {
  const supabase = await createClient()

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories(id, name, sort_order, created_at)')
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order'),
  ])

  return (
    <ProductsClient
      products={productsResult.data ?? []}
      categories={categoriesResult.data ?? []}
    />
  )
}
