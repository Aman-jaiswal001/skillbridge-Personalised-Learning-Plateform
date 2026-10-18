import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { apiRequest } from '../../api/client'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

export default function LearningPath() {
  const { push } = useToast()
  const { data: learningPath, loading, reload } = useApiData('/learning-path', { initialData: { stages: [], overallProgress: 0 } })
  const progress = learningPath?.overallProgress ?? 0
  const donut = [
    { name: 'Done', value: progress },
    { name: 'Left', value: 100 - progress },
  ]

  async function refresh() {
    try {
      await apiRequest('/learning-path/refresh', { method: 'POST' })
      await reload()
      push('Learning path refreshed')
    } catch (err) {
      push(err.message, 'error')
    }
  }

  return (
    <PageContainer title="My Learning Path" subtitle={learningPath?.learningGoal || 'A personalized roadmap for your growth'} actions={<Button onClick={refresh}>Refresh</Button>}>
      {loading ? <Loading label="Loading learning path..." /> : null}
      {learningPath?.skillGaps?.length ? <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Focus skills: {learningPath.skillGaps.map((skill) => skill.name || skill).join(', ')}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {(learningPath?.stages || []).map((stage) => (
            <div key={stage.stageNumber} className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {stage.stageNumber}. {stage.level}
              </p>
              <div className="mt-3 space-y-2">
                {(stage.courses || []).map((item) => (
                  <div key={item.courseId || item.title} className="flex items-center justify-between rounded-lg border border-line px-3 py-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <Badge status={item.status} />
                  </div>
                ))}
                {(stage.resources || []).map((resource) => (
                  <a key={resource.resourceId || resource.url} href={resource.url || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-3 text-sm hover:bg-indigo-50">
                    <span><span className="font-medium">{resource.title}</span><span className="ml-2 text-xs text-muted">{resource.provider}</span></span>
                    <span className="text-xs font-semibold text-primary">Open resource ↗</span>
                  </a>
                ))}
                {!stage.courses?.length ? <p className="text-sm text-muted">No courses selected for this stage yet.</p> : null}
              </div>
            </div>
          ))}
        </div>
        <aside className="h-fit rounded-xl border border-line bg-white p-4 text-center shadow-sm">
          <div className="mx-auto h-[180px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} innerRadius={52} outerRadius={72} dataKey="value">
                  <Cell fill="#304FFE" />
                  <Cell fill="#E2E8F0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="-mt-4 text-2xl font-bold">{progress}%</p>
          <p className="mt-2 text-xs text-muted">Estimated Completion</p>
          <p className="text-sm font-semibold">{learningPath?.estimatedCompletion || '3 months'}</p>
          <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-navy">{learningPath?.message || 'Start learning to build momentum.'}</p>
        </aside>
      </div>
    </PageContainer>
  )
}
