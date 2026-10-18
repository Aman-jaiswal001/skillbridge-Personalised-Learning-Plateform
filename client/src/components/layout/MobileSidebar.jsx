import Sidebar from './Sidebar'

export default function MobileSidebar({ open, onClose, variant }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button className="absolute inset-0 bg-navy/40" aria-label="Close menu" onClick={onClose} />
      <div className="relative h-full w-[248px] shadow-2xl">
        <Sidebar variant={variant} onNavigate={onClose} />
      </div>
    </div>
  )
}
