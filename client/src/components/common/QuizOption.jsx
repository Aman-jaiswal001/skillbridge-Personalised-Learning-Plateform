import { cn } from '../../utils/helpers'

const letters = ['A', 'B', 'C', 'D']

export default function QuizOption({ index, label, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm',
        selected ? 'border-primary bg-indigo-50 text-navy' : 'border-line bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      <span
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-bold',
          selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600',
        )}
      >
        {letters[index]}
      </span>
      <span className="pt-0.5">{label}</span>
    </button>
  )
}
