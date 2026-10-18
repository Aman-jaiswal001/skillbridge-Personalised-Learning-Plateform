import { Link, useNavigate } from 'react-router-dom'
import { ClipboardCheck, Clock3, RotateCcw } from 'lucide-react'
import { normalizeAssessment } from '../../api/normalizers'
import { apiRequest, extractData } from '../../api/client'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useApiData } from '../../hooks/useApiData'

export default function Assessment() {
  const { data = [], loading, error, reload } = useApiData('/assessments', { initialData: [] })
  const navigate = useNavigate()
  const assessments = data.map(normalizeAssessment)

  async function begin(id) {
    try {
      const payload = await apiRequest(`/assessments/${id}/start`, { method: 'POST' })
      const attempt = extractData(payload)
      if (attempt.attemptId) navigate(`/assessment/attempt/${attempt.attemptId}`)
      else if (attempt.status === 'COMPLETED') navigate(`/assessment/result/${attempt._id}`)
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <PageContainer title="Skill Assessments" subtitle="Choose an assessment, continue an attempt, or review your results." actions={<Button variant="secondary" onClick={reload}>Refresh</Button>}>
      {loading ? <Loading label="Loading assessments..." /> : null}
      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {!loading && !error && assessments.length === 0 ? <EmptyState title="No assessments available" description="Available assessments will appear here when they are published." /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assessments.map((assessment) => (
          <article key={assessment.id} className="flex flex-col rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{assessment.category || 'General'}</p><h2 className="mt-1 text-lg font-semibold text-navy">{assessment.title}</h2></div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><ClipboardCheck size={20} /></span>
            </div>
            {assessment.description ? <p className="mt-3 line-clamp-3 text-sm text-muted">{assessment.description}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted"><span>{assessment.questionCount} questions</span><span className="inline-flex items-center gap-1"><Clock3 size={13} />{assessment.duration}</span><span>{assessment.attemptCount} completed attempts</span></div>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {assessment.attemptStatus === 'IN_PROGRESS' ? <Button onClick={() => navigate(`/assessment/attempt/${assessment.activeAttemptId}`)}>Continue Assessment</Button> : assessment.canRetake === false && assessment.myResult ? <span className="self-center text-xs text-muted">Retakes unavailable</span> : <Button onClick={() => begin(assessment.id)}>{assessment.attemptCount ? <><RotateCcw size={15} /> Retake Assessment</> : 'Start Assessment'}</Button>}
              {assessment.myResult ? <Link to={`/assessment/result/${assessment.myResult.id}`}><Button variant="secondary">View Result</Button></Link> : null}
            </div>
          </article>
        ))}
      </div>
      <Link to="/assessment/history" className="inline-block text-sm font-semibold text-primary">View assessment history →</Link>
    </PageContainer>
  )
}
