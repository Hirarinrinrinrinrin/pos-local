'use client'

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

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-black/[0.08] flex flex-col select-none">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-black/[0.06]">
        <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-0.5">
          POSレジ
        </p>
        <h1 className="text-[17px] font-semibold text-[#1C1C1E] tracking-tight">
          管理画面
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-px">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center px-3 py-[7px] rounded-[8px] text-[14px] transition-colors duration-100
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-black/[0.06]">
        <Link
          href="/register"
          className="flex items-center justify-center gap-1 w-full px-3 py-2 rounded-[8px] text-[13px] text-[#007AFF] hover:bg-[#007AFF]/[0.08] transition-colors duration-100 font-medium"
        >
          レジ画面へ
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </aside>
  )
}
