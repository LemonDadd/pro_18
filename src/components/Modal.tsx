import type { ReactNode } from 'react'

export default function Modal({
  title,
  onClose,
  onConfirm,
  confirmText = '确定',
  children
}: {
  title: string
  onClose: () => void
  onConfirm?: () => void
  confirmText?: string
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="space-y-4">
          {children}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
