import { AdminNav } from './AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex" style={{ fontFamily: "system-ui, -apple-system, 'Helvetica Neue', sans-serif" }}>
      <AdminNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
