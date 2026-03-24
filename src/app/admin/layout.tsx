import { AdminNav } from './AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex" style={{ fontFamily: "system-ui, -apple-system, 'Helvetica Neue', sans-serif" }}>
      <AdminNav />
      {/* lg未満はトップバー(h-12)分のパディング */}
      <main className="flex-1 overflow-auto pt-12 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
