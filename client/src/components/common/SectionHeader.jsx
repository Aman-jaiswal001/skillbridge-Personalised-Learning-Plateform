export default function SectionHeader({ title, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-semibold text-navy">{title}</h2>
      {action}
    </div>
  )
}
