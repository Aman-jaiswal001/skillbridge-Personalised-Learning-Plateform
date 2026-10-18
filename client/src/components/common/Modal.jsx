export default function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-navy/40" aria-label="Close dialog" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-navy">{title}</h3>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-slate-100">
            Close
          </button>
        </div>
        {children}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
