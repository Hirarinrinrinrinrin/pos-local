'use client'

import { Badge } from '@/components/ui/badge'
import type { Staff } from '@/types'

interface StaffClientProps {
  staffList: Staff[]
}

export function StaffClient({ staffList }: StaffClientProps) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">スタッフ管理</h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold">スタッフの招待方法</p>
        <ol className="mt-1 space-y-1 list-decimal list-inside text-blue-700">
          <li>Supabase Dashboard &gt; Authentication &gt; Users でユーザーを作成</li>
          <li>作成されたユーザーのIDをコピー</li>
          <li>staffテーブルに <code className="bg-blue-100 px-1 rounded">id, name, role</code> を挿入</li>
        </ol>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">名前</th>
              <th className="px-4 py-3 font-medium text-center">ロール</th>
              <th className="px-4 py-3 font-medium">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  スタッフが登録されていません
                </td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{staff.name}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                      {staff.role === 'admin' ? '管理者' : 'スタッフ'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(staff.created_at).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
