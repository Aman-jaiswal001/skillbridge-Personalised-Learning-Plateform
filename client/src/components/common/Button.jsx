import { cn } from '../../utils/helpers'

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-white text-navy border border-line hover:bg-slate-50',
  ghost: 'bg-transparent text-navy hover:bg-slate-100',
  danger: 'bg-danger text-white hover:bg-red-700',
}

export default function Button({
  children,
  variant = 'primary',
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
