import { Bell, Award, BookOpen, ClipboardList, FileText, Info } from 'lucide-react'
import { cn } from '../../utils/helpers'

const icons = {
  course: BookOpen,
  assessment: ClipboardList,
  certificate: Award,
  material: FileText,
  system: Info,
}

export default function NotificationCard({ item, onClick }) {
  const Icon = icons[item.type] || Bell
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full gap-3 rounded-xl border p-4 text-left shadow-sm',
        item.read ? 'border-line bg-white' : 'border-indigo-100 bg-indigo-50/60',
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-primary">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-navy">{item.title}</span>
          {!item.read ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-600">{item.message}</span>
        <span className="mt-2 block text-[11px] text-muted">{item.time}</span>
      </span>
    </button>
  )
}
