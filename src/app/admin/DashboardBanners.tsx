'use client'

import { useState } from 'react'
import { OpeningSection } from './OpeningSection'
import { ClosingSection } from './ClosingSection'

interface DashboardBannersProps {
  todayDate: string
  // 開店
  isOpened: boolean
  openedAt: string | null
  openingCash: number
  // 営業締め
  isClosed: boolean
  closedAt: string | null
  todaySales: number
  todayCount: number
  refundCount: number
  refundTotal: number
  paymentBreakdown: Record<string, number>
  pmNameMap: Record<string, string>
}

export function DashboardBanners({
  todayDate,
  isOpened,
  openedAt,
  openingCash: initialOpeningCash,
  isClosed,
  closedAt,
  todaySales,
  todayCount,
  refundCount,
  refundTotal,
  paymentBreakdown,
  pmNameMap,
}: DashboardBannersProps) {
  // 開店処理後に ClosingSection へ釣り銭準備金を即時反映するための state
  const [openingCash, setOpeningCash] = useState(initialOpeningCash)

  return (
    <div className="space-y-3">
      <OpeningSection
        todayDate={todayDate}
        isOpened={isOpened}
        openedAt={openedAt}
        openingCash={openingCash}
        onOpeningConfirmed={setOpeningCash}
      />
      <ClosingSection
        todayDate={todayDate}
        isClosed={isClosed}
        closedAt={closedAt}
        todaySales={todaySales}
        todayCount={todayCount}
        refundCount={refundCount}
        refundTotal={refundTotal}
        paymentBreakdown={paymentBreakdown}
        pmNameMap={pmNameMap}
        openingCash={openingCash}
      />
    </div>
  )
}
