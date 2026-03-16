import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (staff?.role !== 'admin') {
    redirect('/register')
  }

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-gray-900 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-700">
          <h1 className="font-bold text-lg">管理画面</h1>
          {staff?.name && (
            <p className="text-xs text-gray-400 mt-0.5">{staff.name}</p>
          )}
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-700 space-y-2">
          <Link
            href="/register"
            className="block text-center text-xs text-gray-400 hover:text-white transition-colors py-1"
          >
            レジ画面へ
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="w-full text-xs text-gray-400 hover:text-white transition-colors py-1"
            >
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
