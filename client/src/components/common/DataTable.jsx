export default function DataTable({ columns, rows, rowKey = 'id' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-semibold">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]} className="border-t border-line">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-[13px] text-navy">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
