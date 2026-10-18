import { useMemo, useState } from 'react'
import { apiRequest } from '../../api/client'
import { normalizeCourse } from '../../api/normalizers'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import RecommendationCard from '../../components/common/RecommendationCard'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

const tabs = ['All', 'High Priority', 'Medium Priority', 'Low Priority']

export default function Recommendations() {
  const [tab, setTab] = useState('All')
  const { push } = useToast()
  const { data = [], loading, reload } = useApiData('/recommendations', { initialData: [] })

  const list = useMemo(() => {
    const courses = data.map(normalizeCourse)
    if (tab === 'All') return courses
    const priority = tab.split(' ')[0].toLowerCase()
    return courses.filter((c) => String(c.priority || '').toLowerCase() === priority)
  }, [data, tab])

  async function refresh() {
    try {
      await apiRequest('/recommendations/refresh', { method: 'POST' })
      await reload()
      push('Recommendations refreshed')
    } catch (err) {
      push(err.message, 'error')
    }
  }

  return (
    <PageContainer
      title="Recommended Learning for You"
      subtitle="Based on your skill gaps, role and career goals"
      actions={<Button onClick={refresh}>Refresh</Button>}
    >
      {loading ? <Loading label="Loading recommendations..." /> : null}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
              tab === t ? 'border-primary bg-indigo-50 text-primary' : 'border-line bg-white text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((c) => (
            <RecommendationCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <EmptyState title="No recommendations found" description="Refresh recommendations after adding skills or completing an assessment." />
      )}
    </PageContainer>
  )
}
