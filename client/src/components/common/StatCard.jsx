export default function StatCard({ icon: Icon, label, value, hint, accent = 'text-primary' }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-[22px] font-semibold text-navy">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={`grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 ${accent}`}>
            <Icon size={18} />
          </span>
        ) : null}
      </div>
    </div>
  )
}
