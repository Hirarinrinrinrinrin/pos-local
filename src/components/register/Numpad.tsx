'use client'

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', '⌫'] as const

interface NumpadProps {
  value: string
  onChange: (v: string) => void
}

export function Numpad({ value, onChange }: NumpadProps) {
  const handleKey = (key: string) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    const next = value + key
    // 先頭ゼロ防止
    if (/^0+$/.test(next)) { onChange('0'); return }
    if (next.startsWith('0') && next.length > 1) { onChange(next.replace(/^0+/, '')); return }
    // 9桁上限
    if (next.length > 9) return
    onChange(next)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKey(key)}
          className={`py-4 rounded-xl border text-xl font-semibold transition-colors active:scale-95 touch-manipulation select-none
            ${key === '⌫'
              ? 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
            }`}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
