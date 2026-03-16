'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
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
// CSV パーサー
// =============================================

type CsvRow = {
  name: string
  price: number
  categoryName: string
  error?: string
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      // ダブルクォート除去・カンマ分割
      const cols = line.split(',').map((c) => c.trim().replace(/^"(.*)"$/, '$1'))
      const [name, priceStr, categoryName] = cols

      if (!name) return { name: '', price: 0, categoryName: '', error: '商品名が空です' }

      const price = parseInt((priceStr ?? '').replace(/[^0-9]/g, ''))
      if (isNaN(price) || price < 0)
        return { name, price: 0, categoryName: categoryName?.trim() ?? '', error: '価格が不正です' }

      if (!categoryName?.trim())
        return { name, price, categoryName: '', error: 'カテゴリ名が空です' }

      return { name, price, categoryName: categoryName.trim() }
    })
}

// =============================================
// 支払方法 CSV パーサー
// =============================================

const PM_TYPE_LABELS = ['確定金額', '金額入力', '現金'] as const

type PmCsvRow = {
  name: string
  key: string
  typeLabel: string
  sortOrder: number
  requires_amount_input: boolean
  requires_change: boolean
  error?: string
}

function typeToFlags(label: string): { requires_amount_input: boolean; requires_change: boolean } {
  if (label === '現金' || label === 'cash') return { requires_amount_input: true, requires_change: true }
  if (label === '金額入力' || label === 'amount') return { requires_amount_input: true, requires_change: false }
  return { requires_amount_input: false, requires_change: false }
}

function parsePmCSV(text: string): PmCsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"(.*)"$/, '$1'))
      const [name, key, typeLabel, sortOrderStr] = cols

      if (!name) return { name: '', key: '', typeLabel: '', sortOrder: 0, requires_amount_input: false, requires_change: false, error: '支払方法名が空です' }
      if (!key) return { name, key: '', typeLabel: '', sortOrder: 0, requires_amount_input: false, requires_change: false, error: '識別子が空です' }
      if (!/^[a-zA-Z0-9_]+$/.test(key)) return { name, key, typeLabel: '', sortOrder: 0, requires_amount_input: false, requires_change: false, error: '識別子は英数字・アンダースコアのみ' }
      if (!typeLabel || !(['確定金額', '金額入力', '現金', 'exact', 'amount', 'cash'].includes(typeLabel)))
        return { name, key, typeLabel: typeLabel ?? '', sortOrder: 0, requires_amount_input: false, requires_change: false, error: `タイプが不正です（${PM_TYPE_LABELS.join('/')}）` }

      const sortOrder = parseInt(sortOrderStr ?? '0') || 0
      return { name, key, typeLabel, sortOrder, ...typeToFlags(typeLabel) }
    })
}

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

  // データリセット用 state
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetType, setResetType] = useState<'orders' | 'all' | null>(null)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)

  // 商品 CSV インポート用 state
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 支払方法 CSV インポート用 state
  const [pmCsvRows, setPmCsvRows] = useState<PmCsvRow[]>([])
  const [pmCsvFileName, setPmCsvFileName] = useState('')
  const [pmImporting, setPmImporting] = useState(false)
  const pmFileInputRef = useRef<HTMLInputElement>(null)

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

  // =============================================
  // CSV ファイル選択
  // =============================================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      // Shift-JIS（Excel日本語デフォルト）を先に試みる
      let text = ''
      try {
        const decoded = new TextDecoder('shift-jis').decode(buffer)
        // 文字化け検出（置換文字が多い場合はUTF-8へフォールバック）
        text = decoded.includes('\uFFFD')
          ? new TextDecoder('utf-8').decode(buffer)
          : decoded
      } catch {
        text = new TextDecoder('utf-8').decode(buffer)
      }
      setCsvRows(parseCSV(text))
    }
    reader.readAsArrayBuffer(file)
  }

  const handleClearCSV = () => {
    setCsvRows([])
    setCsvFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // =============================================
  // テンプレートダウンロード
  // =============================================

  const downloadTemplate = () => {
    const content = '商品名,価格,カテゴリ名\nコーヒー,350,ドリンク\nハンバーガー,650,フード\nチーズケーキ,400,デザート'
    // BOM付きUTF-8でExcelでも文字化けしない
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '商品インポートテンプレート.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // =============================================
  // CSV インポート実行
  // =============================================

  const handleImport = async () => {
    const validRows = csvRows.filter((r) => !r.error)
    if (validRows.length === 0) return

    setImporting(true)
    const supabase = createClient()

    // 1. 不足カテゴリを自動作成
    const uniqueCategories = [...new Set(validRows.map((r) => r.categoryName))]
    const { data: existingCats } = await supabase.from('categories').select('id, name')
    const catMap = Object.fromEntries((existingCats ?? []).map((c) => [c.name, c.id]))

    const missingCats = uniqueCategories.filter((name) => !catMap[name])
    if (missingCats.length > 0) {
      const { data: newCats, error } = await supabase
        .from('categories')
        .insert(missingCats.map((name, i) => ({ name, sort_order: 100 + i })))
        .select('id, name')
      if (error) {
        toast.error('カテゴリの作成に失敗しました')
        setImporting(false)
        return
      }
      for (const cat of newCats ?? []) catMap[cat.name] = cat.id
    }

    // 2. 既存商品名を取得（重複スキップ用）
    const { data: existingProds } = await supabase.from('products').select('name')
    const existingProdNames = new Set((existingProds ?? []).map((p) => p.name))

    // 3. 商品を投入
    const toInsert = validRows
      .filter((r) => !existingProdNames.has(r.name))
      .map((r) => ({ name: r.name, price: r.price, category_id: catMap[r.categoryName], is_active: true }))

    const skipped = validRows.length - toInsert.length

    if (toInsert.length === 0) {
      toast.info(`すべての商品が登録済みです（${skipped}件スキップ）`)
      setImporting(false)
      return
    }

    const { error } = await supabase.from('products').insert(toInsert)
    if (error) {
      toast.error('商品の投入に失敗しました')
    } else {
      const msg = skipped > 0
        ? `${toInsert.length}件を追加しました（${skipped}件は重複スキップ）`
        : `${toInsert.length}件を追加しました`
      if (missingCats.length > 0) toast.success(`カテゴリ「${missingCats.join('・')}」を自動作成しました`)
      toast.success(msg)
      handleClearCSV()
      await refreshCounts(supabase)
    }
    setImporting(false)
  }

  // =============================================
  // 支払方法 CSV ファイル選択・テンプレート・インポート
  // =============================================

  const handlePmFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPmCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      let text = ''
      try {
        const decoded = new TextDecoder('shift-jis').decode(buffer)
        text = decoded.includes('\uFFFD') ? new TextDecoder('utf-8').decode(buffer) : decoded
      } catch {
        text = new TextDecoder('utf-8').decode(buffer)
      }
      setPmCsvRows(parsePmCSV(text))
    }
    reader.readAsArrayBuffer(file)
  }

  const handleClearPmCSV = () => {
    setPmCsvRows([])
    setPmCsvFileName('')
    if (pmFileInputRef.current) pmFileInputRef.current.value = ''
  }

  const downloadPmTemplate = () => {
    const content = [
      '支払方法名,識別子,タイプ,表示順',
      '現金,cash,現金,1',
      'カード,card,確定金額,2',
      '電子マネー,emoney,確定金額,3',
      'QRコード決済,qr,確定金額,4',
      '後払い,deferred,金額入力,5',
    ].join('\n')
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '支払方法インポートテンプレート.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePmImport = async () => {
    const validRows = pmCsvRows.filter((r) => !r.error)
    if (validRows.length === 0) return

    setPmImporting(true)
    const supabase = createClient()

    const toUpsert = validRows.map((r) => ({
      name: r.name,
      key: r.key,
      requires_amount_input: r.requires_amount_input,
      requires_change: r.requires_change,
      sort_order: r.sortOrder,
      is_active: true,
    }))

    const { error } = await supabase
      .from('payment_methods')
      .upsert(toUpsert, { onConflict: 'key' })

    if (error) {
      toast.error('支払方法の投入に失敗しました')
    } else {
      toast.success(`${toUpsert.length}件の支払方法を設定しました（既存は上書き）`)
      handleClearPmCSV()
      await refreshCounts(supabase)
    }
    setPmImporting(false)
  }

  // =============================================
  // サンプルデータ投入（個別）
  // =============================================

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
      error ? toast.error('失敗しました') : toast.success(`${toInsert.length}件追加しました`)
      if (!error) await refreshCounts(supabase)
    }
    setLoading(false)
  }

  const seedProducts = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: categories } = await supabase.from('categories').select('id, name')
    const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.name, c.id]))
    const missingCats = [...new Set(SAMPLE_PRODUCTS.map((p) => p.categoryName))].filter(
      (name) => !categoryMap[name]
    )
    if (missingCats.length > 0) {
      toast.error(`カテゴリが不足しています: ${missingCats.join(', ')}`)
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
      error ? toast.error('失敗しました') : toast.success(`${toInsert.length}件追加しました`)
      if (!error) await refreshCounts(supabase)
    }
    setLoading(false)
  }

  const seedPaymentMethods = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('payment_methods')
      .upsert(SAMPLE_PAYMENT_METHODS, { onConflict: 'key' })
    error ? toast.error('失敗しました') : toast.success('支払方法を設定しました')
    if (!error) await refreshCounts(supabase)
    setLoading(false)
  }

  // =============================================
  // データリセット
  // =============================================

  const openResetDialog = (type: 'orders' | 'all') => {
    setResetType(type)
    setResetConfirmText('')
    setResetDialogOpen(true)
  }

  const handleReset = async () => {
    if (resetConfirmText !== 'リセット') return
    setResetting(true)
    const supabase = createClient()
    const fnName = resetType === 'all' ? 'reset_all_data' : 'reset_order_data'
    const { error } = await supabase.rpc(fnName)
    setResetting(false)
    if (error) {
      toast.error('リセットに失敗しました: ' + error.message)
    } else {
      const msg = resetType === 'all' ? '全データをリセットしました' : '注文データをリセットしました'
      toast.success(msg)
      setResetDialogOpen(false)
      if (resetType === 'all') await refreshCounts(supabase)
    }
  }

  const seedAll = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: existingCats } = await supabase.from('categories').select('name')
    const existingCatNames = new Set((existingCats ?? []).map((c) => c.name))
    const catsToInsert = SAMPLE_CATEGORIES.filter((c) => !existingCatNames.has(c.name))
    if (catsToInsert.length > 0) await supabase.from('categories').insert(catsToInsert)

    const { data: categories } = await supabase.from('categories').select('id, name')
    const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.name, c.id]))
    const { data: existingProds } = await supabase.from('products').select('name')
    const existingProdNames = new Set((existingProds ?? []).map((p) => p.name))
    const prodsToInsert = SAMPLE_PRODUCTS.filter(
      (p) => !existingProdNames.has(p.name) && categoryMap[p.categoryName]
    ).map((p) => ({ name: p.name, price: p.price, category_id: categoryMap[p.categoryName], is_active: true }))
    if (prodsToInsert.length > 0) await supabase.from('products').insert(prodsToInsert)

    await supabase.from('payment_methods').upsert(SAMPLE_PAYMENT_METHODS, { onConflict: 'key' })
    toast.success('サンプルデータを一括投入しました')
    await refreshCounts(supabase)
    setLoading(false)
  }

  // =============================================
  // レンダリング
  // =============================================

  const validCount = csvRows.filter((r) => !r.error).length
  const errorCount = csvRows.filter((r) => r.error).length
  const pmValidCount = pmCsvRows.filter((r) => !r.error).length
  const pmErrorCount = pmCsvRows.filter((r) => r.error).length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">初期設定</h2>
        <p className="text-sm text-gray-500 mt-1">商品CSVの一括インポートとサンプルデータの投入ができます。</p>
      </div>

      {/* ===== CSVインポート ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">商品CSVインポート</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* フォーマット説明 */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">CSVフォーマット（1行目はヘッダー）</p>
            <pre className="font-mono">商品名,価格,カテゴリ名{'\n'}コーヒー,350,ドリンク{'\n'}ハンバーガー,650,フード</pre>
            <p>・ExcelのCSV（Shift-JIS）・UTF-8 どちらも対応</p>
            <p>・カテゴリが未登録の場合は自動で作成します</p>
            <p>・既存の商品名と重複する行はスキップされます</p>
          </div>

          {/* テンプレートDL + ファイル選択 */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              テンプレートをダウンロード
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              CSVファイルを選択
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* ファイル名 + クリア */}
          {csvFileName && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{csvFileName}</span>
              <span className="text-gray-400">
                （有効 {validCount}件{errorCount > 0 ? `・エラー ${errorCount}件` : ''}）
              </span>
              <button onClick={handleClearCSV} className="text-xs text-gray-400 hover:text-gray-600 underline">
                クリア
              </button>
            </div>
          )}

          {/* プレビューテーブル */}
          {csvRows.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">商品名</th>
                    <th className="px-3 py-2 font-medium text-right">価格</th>
                    <th className="px-3 py-2 font-medium">カテゴリ</th>
                    <th className="px-3 py-2 font-medium">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {csvRows.map((row, i) => (
                    <tr key={i} className={row.error ? 'bg-red-50' : ''}>
                      <td className="px-3 py-1.5 text-gray-800">{row.name || '—'}</td>
                      <td className="px-3 py-1.5 text-right text-gray-600">
                        {row.error ? '—' : `¥${row.price.toLocaleString()}`}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">{row.categoryName || '—'}</td>
                      <td className="px-3 py-1.5">
                        {row.error ? (
                          <span className="text-red-500">{row.error}</span>
                        ) : (
                          <span className="text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* インポートボタン */}
          {validCount > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {importing ? '投入中...' : `${validCount}件をインポートする`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ===== 支払方法CSVインポート ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">支払方法CSVインポート</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* フォーマット説明 */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">CSVフォーマット（1行目はヘッダー）</p>
            <pre className="font-mono">{'支払方法名,識別子,タイプ,表示順\n現金,cash,現金,1\nカード,card,確定金額,2'}</pre>
            <p>・タイプ：<strong className="text-gray-700">確定金額</strong>（カード等）／<strong className="text-gray-700">金額入力</strong>（お釣りなし）／<strong className="text-gray-700">現金</strong>（お釣りあり）</p>
            <p>・識別子は英数字・アンダースコアのみ（例: cash, card, paypay）</p>
            <p>・識別子が一致する既存データは<strong className="text-gray-700">上書き更新</strong>されます</p>
          </div>

          {/* テンプレートDL + ファイル選択 */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadPmTemplate}>
              テンプレートをダウンロード
            </Button>
            <Button variant="outline" size="sm" onClick={() => pmFileInputRef.current?.click()}>
              CSVファイルを選択
            </Button>
            <input
              ref={pmFileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handlePmFileChange}
            />
          </div>

          {/* ファイル名 + クリア */}
          {pmCsvFileName && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{pmCsvFileName}</span>
              <span className="text-gray-400">
                （有効 {pmValidCount}件{pmErrorCount > 0 ? `・エラー ${pmErrorCount}件` : ''}）
              </span>
              <button onClick={handleClearPmCSV} className="text-xs text-gray-400 hover:text-gray-600 underline">
                クリア
              </button>
            </div>
          )}

          {/* プレビューテーブル */}
          {pmCsvRows.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">支払方法名</th>
                    <th className="px-3 py-2 font-medium">識別子</th>
                    <th className="px-3 py-2 font-medium">タイプ</th>
                    <th className="px-3 py-2 font-medium text-right">表示順</th>
                    <th className="px-3 py-2 font-medium">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pmCsvRows.map((row, i) => (
                    <tr key={i} className={row.error ? 'bg-red-50' : ''}>
                      <td className="px-3 py-1.5 text-gray-800">{row.name || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500 font-mono">{row.key || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-600">{row.error ? '—' : row.typeLabel}</td>
                      <td className="px-3 py-1.5 text-right text-gray-500">{row.error ? '—' : row.sortOrder}</td>
                      <td className="px-3 py-1.5">
                        {row.error ? (
                          <span className="text-red-500">{row.error}</span>
                        ) : (
                          <span className="text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* インポートボタン */}
          {pmValidCount > 0 && (
            <Button onClick={handlePmImport} disabled={pmImporting} className="bg-blue-600 hover:bg-blue-700">
              {pmImporting ? '投入中...' : `${pmValidCount}件をインポートする`}
            </Button>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ===== サンプルデータ ===== */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3">サンプルデータ投入（テスト・デモ用）</h3>
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
                  <span key={c.name} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{c.name}</span>
                ))}
              </div>
              <Button onClick={seedCategories} disabled={loading} variant="outline" size="sm">サンプルを投入</Button>
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
              <Button onClick={seedProducts} disabled={loading} variant="outline" size="sm">サンプルを投入</Button>
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
                  <span key={m.key} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{m.name}</span>
                ))}
              </div>
              <p className="text-xs text-gray-400">※ 既存の支払方法はkeyが一致する場合上書きされます</p>
              <Button onClick={seedPaymentMethods} disabled={loading} variant="outline" size="sm">サンプルを投入</Button>
            </CardContent>
          </Card>
        </div>

        <div className="pt-4 space-y-2">
          <Button onClick={seedAll} disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-semibold">
            {loading ? '投入中...' : '全サンプルデータを一括投入'}
          </Button>
          <p className="text-xs text-gray-400 text-center">重複はスキップされます</p>
        </div>
      </div>

      <Separator />

      {/* ===== データリセット ===== */}
      <div>
        <h3 className="text-sm font-semibold text-red-500 mb-1">データリセット</h3>
        <p className="text-xs text-gray-400 mb-4">削除したデータは復元できません。必ずバックアップを取ってから実行してください。</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-red-200">
            <CardContent className="pt-5 space-y-3">
              <div>
                <p className="font-semibold text-sm text-gray-800">注文データをリセット</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  注文履歴・開店履歴・締め履歴を削除します。<br />
                  商品・カテゴリ・支払方法は残ります。
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 w-full"
                onClick={() => openResetDialog('orders')}
              >
                注文データを削除する
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-300 bg-red-50/30">
            <CardContent className="pt-5 space-y-3">
              <div>
                <p className="font-semibold text-sm text-red-700">全データをリセット</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  注文履歴に加え、商品・カテゴリ・<br />
                  支払方法もすべて削除します。
                </p>
              </div>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white w-full"
                onClick={() => openResetDialog('all')}
              >
                全データを削除する
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== リセット確認ダイアログ ===== */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {resetType === 'all' ? '全データをリセット' : '注文データをリセット'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1">
              <p className="font-semibold">削除対象</p>
              <ul className="space-y-0.5 list-disc list-inside text-red-600">
                <li>注文履歴（order_items / orders）</li>
                <li>開店履歴（daily_openings）</li>
                <li>営業締め履歴（daily_closings）</li>
                {resetType === 'all' && (
                  <>
                    <li>商品（products）</li>
                    <li>カテゴリ（categories）</li>
                    <li>支払方法（payment_methods）</li>
                  </>
                )}
              </ul>
              <p className="pt-1 font-semibold text-red-700">この操作は取り消せません。</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">
                確認のため <span className="font-bold text-gray-800">リセット</span> と入力してください
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="リセット"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setResetDialogOpen(false)}
                className="flex-1"
                disabled={resetting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleReset}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={resetting || resetConfirmText !== 'リセット'}
              >
                {resetting ? '削除中...' : '実行する'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
