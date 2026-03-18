'use client'

import { useRef, useState } from 'react'
import { categoriesRepo, productsRepo, paymentMethodsRepo, resetRepo } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// =============================================
// CSV パーサー（商品）
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
// CSV パーサー（支払方法）
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

export function SetupClient() {
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

  // =============================================
  // CSV ファイル選択（商品）
  // =============================================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      let text = ''
      try {
        const decoded = new TextDecoder('shift-jis').decode(buffer)
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
  // テンプレートダウンロード（商品）
  // =============================================

  const downloadTemplate = () => {
    const content = '商品名,価格,カテゴリ名\nコーヒー,350,ドリンク\nハンバーガー,650,フード\nチーズケーキ,400,デザート'
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '商品インポートテンプレート.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // =============================================
  // CSV インポート実行（商品）
  // =============================================

  const handleImport = async () => {
    const validRows = csvRows.filter((r) => !r.error)
    if (validRows.length === 0) return

    setImporting(true)
    try {
      const existingCats = await categoriesRepo.list()
      const catMap = Object.fromEntries(existingCats.map((c) => [c.name, c.id]))

      const uniqueCategories = [...new Set(validRows.map((r) => r.categoryName))]
      const missingCats = uniqueCategories.filter((name) => !catMap[name])

      for (let i = 0; i < missingCats.length; i++) {
        const id = await categoriesRepo.add({ name: missingCats[i], sort_order: 100 + i }) as string
        catMap[missingCats[i]] = id
      }

      const existingProds = await productsRepo.list()
      const existingProdNames = new Set(existingProds.map((p) => p.name))

      const toInsert = validRows.filter((r) => !existingProdNames.has(r.name))
      const skipped = validRows.length - toInsert.length

      if (toInsert.length === 0) {
        toast.info(`すべての商品が登録済みです（${skipped}件スキップ）`)
        return
      }

      for (const r of toInsert) {
        await productsRepo.add({
          name: r.name,
          price: r.price,
          category_id: catMap[r.categoryName],
          is_active: true,
          image_url: null,
          stock: null,
        })
      }

      const msg = skipped > 0
        ? `${toInsert.length}件を追加しました（${skipped}件は重複スキップ）`
        : `${toInsert.length}件を追加しました`
      if (missingCats.length > 0) toast.success(`カテゴリ「${missingCats.join('・')}」を自動作成しました`)
      toast.success(msg)
      handleClearCSV()
    } catch {
      toast.error('商品の投入に失敗しました')
    } finally {
      setImporting(false)
    }
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
    try {
      for (const r of validRows) {
        await paymentMethodsRepo.upsertByKey({
          name: r.name,
          key: r.key,
          requires_amount_input: r.requires_amount_input,
          requires_change: r.requires_change,
          sort_order: r.sortOrder,
          is_active: true,
        })
      }
      toast.success(`${validRows.length}件の支払方法を設定しました（既存は上書き）`)
      handleClearPmCSV()
    } catch {
      toast.error('支払方法の投入に失敗しました')
    } finally {
      setPmImporting(false)
    }
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
    try {
      if (resetType === 'all') {
        await resetRepo.all()
      } else {
        await resetRepo.orders()
      }
      const msg = resetType === 'all' ? '全データをリセットしました' : '注文データをリセットしました'
      toast.success(msg)
      setResetDialogOpen(false)
    } catch {
      toast.error('リセットに失敗しました')
    } finally {
      setResetting(false)
    }
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
        <p className="text-sm text-gray-500 mt-1">商品・支払方法のCSV一括インポートとデータリセットができます。</p>
      </div>

      {/* ===== 商品CSVインポート ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">商品CSVインポート</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">CSVフォーマット（1行目はヘッダー）</p>
            <pre className="font-mono">商品名,価格,カテゴリ名{'\n'}コーヒー,350,ドリンク{'\n'}ハンバーガー,650,フード</pre>
            <p>・ExcelのCSV（Shift-JIS）・UTF-8 どちらも対応</p>
            <p>・カテゴリが未登録の場合は自動で作成します</p>
            <p>・既存の商品名と重複する行はスキップされます</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              テンプレートをダウンロード
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              CSVファイルを選択
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>

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
                        {row.error ? <span className="text-red-500">{row.error}</span> : <span className="text-green-600">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {validCount > 0 && (
            <Button onClick={handleImport} disabled={importing} className="bg-blue-600 hover:bg-blue-700">
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
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">CSVフォーマット（1行目はヘッダー）</p>
            <pre className="font-mono">{'支払方法名,識別子,タイプ,表示順\n現金,cash,現金,1\nカード,card,確定金額,2'}</pre>
            <p>・タイプ：<strong className="text-gray-700">確定金額</strong>（カード等）／<strong className="text-gray-700">金額入力</strong>（お釣りなし）／<strong className="text-gray-700">現金</strong>（お釣りあり）</p>
            <p>・識別子は英数字・アンダースコアのみ（例: cash, card, paypay）</p>
            <p>・識別子が一致する既存データは<strong className="text-gray-700">上書き更新</strong>されます</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadPmTemplate}>
              テンプレートをダウンロード
            </Button>
            <Button variant="outline" size="sm" onClick={() => pmFileInputRef.current?.click()}>
              CSVファイルを選択
            </Button>
            <input ref={pmFileInputRef} type="file" accept=".csv" className="hidden" onChange={handlePmFileChange} />
          </div>

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
                        {row.error ? <span className="text-red-500">{row.error}</span> : <span className="text-green-600">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pmValidCount > 0 && (
            <Button onClick={handlePmImport} disabled={pmImporting} className="bg-blue-600 hover:bg-blue-700">
              {pmImporting ? '投入中...' : `${pmValidCount}件をインポートする`}
            </Button>
          )}
        </CardContent>
      </Card>

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
