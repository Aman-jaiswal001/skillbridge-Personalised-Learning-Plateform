import { cn } from '../../utils/helpers'
import { statusColor } from '../../utils/helpers'

export default function Badge({ children, status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        status ? statusColor(status) : 'border-line bg-slate-50 text-slate-600',
        className,
      )}
    >
      {children ?? status}
    </span>
  )
}
