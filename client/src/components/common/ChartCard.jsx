export default function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-line bg-white p-4 shadow-sm ${className}`}>
      {title ? <h3 className="mb-3 text-[15px] font-semibold text-navy">{title}</h3> : null}
      <div className="h-[240px] w-full">{children}</div>
    </div>
  )
}
