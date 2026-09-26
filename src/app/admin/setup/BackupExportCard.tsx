'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// 新POS（サーバー版）へ移行するための全データ書き出し（JSON）
export function BackupExportCard() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const [categories, products, paymentMethods, sessions, orders, orderItems, staff] = await Promise.all([
        db.categories.toArray(),
        db.products.toArray(),
        db.paymentMethods.toArray(),
        db.sessions.toArray(),
        db.orders.toArray(),
        db.orderItems.toArray(),
        db.staff.toArray(),
      ])
      const backup = {
        format: 'pos-local-backup',
        version: 1,
        exported_at: new Date().toISOString(),
        tables: { categories, products, paymentMethods, sessions, orders, orderItems, staff },
      }
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`書き出しました（注文 ${orders.length} 件）`)
    } catch {
      toast.error('書き出しに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">データ書き出し（移行用）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">商品・支払方法・注文・営業履歴・スタッフをすべて JSON ファイルに保存します。新POSの「旧PWAデータの取り込み」で読み込めます。</p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? '書き出し中...' : 'JSONを書き出す'}
        </Button>
      </CardContent>
    </Card>
  )
}
