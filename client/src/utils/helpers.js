export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function statusColor(status) {
  const map = {
    Critical: 'bg-red-50 text-red-700 border-red-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Moderate: 'bg-amber-50 text-amber-800 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
    'Not Started': 'bg-slate-50 text-slate-600 border-slate-200',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'On Leave': 'bg-orange-50 text-orange-700 border-orange-200',
    Upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
    Scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200'
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function formatPercent(n) {
  return `${Math.round(n)}%`
}
