'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

// =============================================
// サンプルデータ定義
// =============================================

const SAMPLE_CATEGORIES = [
  { name: 'フード', sort_order: 1 },
  { name: 'ドリンク', sort_order: 2 },
  { name: 'デザート', sort_order: 3 },
]

const SAMPLE_PAYMENT_METHODS = [
  { name: '現金', key: 'cash', requires_amount_input: true, requires_change: true, sort_order: 1 },
  { name: 'カード', key: 'card', requires_amount_input: false, requires_change: false, sort_order: 2 },
  { name: '電子マネー', key: 'emoney', requires_amount_input: false, requires_change: false, sort_order: 3 },
  { name: 'QRコード決済', key: 'qr', requires_amount_input: false, requires_change: false, sort_order: 4 },
]

const SAMPLE_PRODUCTS = [
  { name: 'コーヒー', price: 350, categoryName: 'ドリンク' },
  { name: '紅茶', price: 300, categoryName: 'ドリンク' },
  { name: 'オレンジジュース', price: 300, categoryName: 'ドリンク' },
  { name: 'ハンバーガー', price: 650, categoryName: 'フード' },
  { name: 'フライドポテト', price: 300, categoryName: 'フード' },
  { name: 'サンドイッチ', price: 500, categoryName: 'フード' },
  { name: 'チーズケーキ', price: 400, categoryName: 'デザート' },
  { name: 'プリン', price: 350, categoryName: 'デザート' },
]

// =============================================

interface SetupClientProps {
  categoryCount: number
  productCount: number
  paymentMethodCount: number
}

export function SetupClient({
  categoryCount: initCatCount,
  productCount: initProdCount,
  paymentMethodCount: initPmCount,
}: SetupClientProps) {
  const [counts, setCounts] = useState({
    categories: initCatCount,
    products: initProdCount,
    paymentMethods: initPmCount,
  })
  const [loading, setLoading] = useState(false)

  const refreshCounts = async (supabase: ReturnType<typeof createClient>) => {
    const [catRes, prodRes, pmRes] = await Promise.all([
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('payment_methods').select('id', { count: 'exact', head: true }),
    ])
    setCounts({
      categories: catRes.count ?? 0,
      products: prodRes.count ?? 0,
      paymentMethods: pmRes.count ?? 0,
    })
  }

  // カテゴリ投入（名前が重複するものはスキップ）
  const seedCategories = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: existing } = await supabase.from('categories').select('name')
    const existingNames = new Set((existing ?? []).map((c) => c.name))
    const toInsert = SAMPLE_CATEGORIES.filter((c) => !existingNames.has(c.name))

    if (toInsert.length === 0) {
      toast.info('サンプルカテゴリはすべて登録済みです')
    } else {
      const { error } = await supabase.from('categories').insert(toInsert)
      if (error) {
        toast.error('カテゴリの投入に失敗しました')
      } else {
        toast.success(`${toInsert.length}件のカテゴリを追加しました`)
        await refreshCounts(supabase)
      }
    }
    setLoading(false)
  }

  // 商品投入（名前が重複するものはスキップ）
  const seedProducts = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: categories } = await supabase.from('categories').select('id, name')
    const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.name, c.id]))

    const missingCategories = [...new Set(SAMPLE_PRODUCTS.map((p) => p.categoryName))].filter(
      (name) => !categoryMap[name]
    )
    if (missingCategories.length > 0) {
      toast.error(
        `カテゴリが不足しています: ${missingCategories.join(', ')}。先にカテゴリを投入してください`
      )
      setLoading(false)
      return
    }

    const { data: existing } = await supabase.from('products').select('name')
    const existingNames = new Set((existing ?? []).map((p) => p.name))
    const toInsert = SAMPLE_PRODUCTS.filter((p) => !existingNames.has(p.name)).map((p) => ({
      name: p.name,
      price: p.price,
      category_id: categoryMap[p.categoryName],
      is_active: true,
    }))

    if (toInsert.length === 0) {
      toast.info('サンプル商品はすべて登録済みです')
    } else {
      const { error } = await supabase.from('products').insert(toInsert)
      if (error) {
        toast.error('商品の投入に失敗しました')
      } else {
        toast.success(`${toInsert.length}件の商品を追加しました`)
        await refreshCounts(supabase)
      }
    }
    setLoading(false)
  }

  // 支払方法投入（key で upsert）
  const seedPaymentMethods = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('payment_methods')
      .upsert(SAMPLE_PAYMENT_METHODS, { onConflict: 'key' })

    if (error) {
      toast.error('支払方法の投入に失敗しました')
    } else {
      toast.success('支払方法を設定しました')
      await refreshCounts(supabase)
    }
    setLoading(false)
  }

  // 全て一括投入
  const seedAll = async () => {
    setLoading(true)
    const supabase = createClient()

    // 1. カテゴリ
    const { data: existingCats } = await supabase.from('categories').select('name')
    const existingCatNames = new Set((existingCats ?? []).map((c) => c.name))
    const catsToInsert = SAMPLE_CATEGORIES.filter((c) => !existingCatNames.has(c.name))
    if (catsToInsert.length > 0) {
      await supabase.from('categories').insert(catsToInsert)
    }

    // 2. 商品
    const { data: categories } = await supabase.from('categories').select('id, name')
    const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.name, c.id]))
    const { data: existingProds } = await supabase.from('products').select('name')
    const existingProdNames = new Set((existingProds ?? []).map((p) => p.name))
    const prodsToInsert = SAMPLE_PRODUCTS.filter(
      (p) => !existingProdNames.has(p.name) && categoryMap[p.categoryName]
    ).map((p) => ({
      name: p.name,
      price: p.price,
      category_id: categoryMap[p.categoryName],
      is_active: true,
    }))
    if (prodsToInsert.length > 0) {
      await supabase.from('products').insert(prodsToInsert)
    }

    // 3. 支払方法（upsert）
    await supabase.from('payment_methods').upsert(SAMPLE_PAYMENT_METHODS, { onConflict: 'key' })

    toast.success('サンプルデータを一括投入しました')
    await refreshCounts(supabase)
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">マスタデータ初期化</h2>
        <p className="text-sm text-gray-500 mt-1">
          初期セットアップ用のサンプルデータを投入します。既存データと重複する名前は自動的にスキップされます。
        </p>
      </div>

      <div className="grid gap-4">
        {/* カテゴリ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">カテゴリ</CardTitle>
              <span className="text-sm text-gray-500">現在 {counts.categories}件</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {SAMPLE_CATEGORIES.map((c) => (
                <span key={c.name} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                  {c.name}
                </span>
              ))}
            </div>
            <Button onClick={seedCategories} disabled={loading} variant="outline" size="sm">
              サンプルを投入
            </Button>
          </CardContent>
        </Card>

        {/* 商品 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">商品</CardTitle>
              <span className="text-sm text-gray-500">現在 {counts.products}件</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PRODUCTS.map((p) => (
                <span key={p.name} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                  {p.name}　¥{p.price.toLocaleString()}
                </span>
              ))}
            </div>
            <p className="text-xs text-amber-600">※ カテゴリが先に登録されている必要があります</p>
            <Button onClick={seedProducts} disabled={loading} variant="outline" size="sm">
              サンプルを投入
            </Button>
          </CardContent>
        </Card>

        {/* 支払方法 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">支払方法</CardTitle>
              <span className="text-sm text-gray-500">現在 {counts.paymentMethods}件</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PAYMENT_METHODS.map((m) => (
                <span key={m.key} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                  {m.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              ※ 既存の支払方法は名称・設定が上書きされます（key一致時）
            </p>
            <Button onClick={seedPaymentMethods} disabled={loading} variant="outline" size="sm">
              サンプルを投入
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 全て一括投入 */}
      <div className="pt-2 space-y-2">
        <Button
          onClick={seedAll}
          disabled={loading}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-semibold"
        >
          {loading ? '投入中...' : '全サンプルデータを一括投入'}
        </Button>
        <p className="text-xs text-gray-400 text-center">
          カテゴリ・商品・支払方法をまとめて投入します。重複はスキップされます。
        </p>
      </div>
    </div>
  )
}
