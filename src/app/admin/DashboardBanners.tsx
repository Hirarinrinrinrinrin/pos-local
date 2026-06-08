'use client'

import { OpeningSection } from './OpeningSection'
import { ClosingSection } from './ClosingSection'
import type { BusinessSession } from '@/types'
import type { SessionSummary } from './page'

interface DashboardBannersProps {
  todayDate: string
  activeSession: BusinessSession | null
  activeSummary: SessionSummary | null
  pmNameMap: Record<string, string>
  onChanged: () => void
}

export function DashboardBanners({
  todayDate,
  activeSession,
  activeSummary,
  pmNameMap,
  onChanged,
}: DashboardBannersProps) {
  return (
    <div className="space-y-3">
      {activeSession && activeSummary ? (
        // 営業中：締め処理を表示
        <ClosingSection
          session={activeSession}
          summary={activeSummary}
          pmNameMap={pmNameMap}
          onClosed={onChanged}
        />
      ) : (
        // 未開始：新しい営業を開始
        <OpeningSection todayDate={todayDate} onOpened={onChanged} />
      )}
    </div>
  )
}
