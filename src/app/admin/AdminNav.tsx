'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/products', label: '商品管理' },
  { href: '/admin/categories', label: 'カテゴリ' },
  { href: '/admin/payment-methods', label: '支払方法' },
  { href: '/admin/orders', label: '注文履歴' },
  { href: '/admin/closings', label: '営業締め履歴' },
  { href: '/admin/staff', label: 'スタッフ' },
  { href: '/admin/setup', label: '初期設定' },
]

export function AdminNav() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/'
    return pathname.startsWith(href)
  }

  const currentLabel = navItems.find((item) => isActive(item.href))?.label ?? '管理画面'

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <>
      <nav className="flex-1 px-3 py-3 space-y-px">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`
                flex items-center px-3 py-[9px] rounded-[8px] text-[14px] transition-colors duration-100
                ${active
                  ? 'bg-[#007AFF]/10 text-[#007AFF] font-medium'
                  : 'text-[#3C3C43] hover:bg-black/[0.04] font-normal'
                }
              `}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t border-black/[0.06]">
        <Link
          href="/register"
          onClick={onClose}
          className="flex items-center justify-center gap-1 w-full px-3 py-2 rounded-[8px] text-[13px] text-[#007AFF] hover:bg-[#007AFF]/[0.08] transition-colors duration-100 font-medium"
        >
          レジ画面へ
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* lg以上：固定サイドバー */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-white border-r border-black/[0.08] flex-col select-none">
        <div className="px-5 pt-6 pb-4 border-b border-black/[0.06]">
          <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-0.5">
            POSレジ
          </p>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E] tracking-tight">
            管理画面
          </h1>
        </div>
        <NavLinks />
      </aside>

      {/* lg未満：トップバー */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-black/[0.08] flex items-center px-4 h-12 select-none">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 text-[#1C1C1E] touch-manipulation"
          aria-label="メニューを開く"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <span className="ml-3 text-[15px] font-semibold text-[#1C1C1E]">{currentLabel}</span>
      </div>

      {/* lg未満：ドロワー */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* ドロワー本体 */}
          <aside className="relative w-64 bg-white flex flex-col select-none shadow-2xl">
            <div className="px-5 pt-6 pb-4 border-b border-black/[0.06] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-0.5">
                  POSレジ
                </p>
                <h1 className="text-[17px] font-semibold text-[#1C1C1E] tracking-tight">
                  管理画面
                </h1>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-[#8E8E93] hover:text-[#1C1C1E] p-1 touch-manipulation"
                aria-label="閉じる"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <NavLinks onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
