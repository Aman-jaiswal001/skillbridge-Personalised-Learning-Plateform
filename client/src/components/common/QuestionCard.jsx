export default function QuestionCard({ index, total, category, question, children }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          Question {index} of {total}
        </span>
        {category ? (
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-primary">{category}</span>
        ) : null}
      </div>
      <h2 className="text-[16px] font-semibold leading-snug text-navy">{question}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  )
}
