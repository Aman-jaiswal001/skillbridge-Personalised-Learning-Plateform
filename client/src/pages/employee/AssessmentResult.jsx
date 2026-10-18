import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { apiRequest, extractData } from '../../api/client'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import ProgressBar from '../../components/common/ProgressBar'

export default function AssessmentResult() {
  const { resultId } = useParams()
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const historyRequest = apiRequest('/assessments/history').then(extractData)
    const resultRequest = resultId ? apiRequest(`/assessments/results/${resultId}`).then(extractData) : historyRequest.then((rows) => rows?.[0] || null)
    Promise.all([historyRequest, resultRequest]).then(([rows, selected]) => {
      if (!mounted) return
      setHistory(rows || [])
      setResult(selected)
    }).catch((err) => { if (mounted) setError(err.message) }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [resultId])

  if (loading) return <Loading label="Loading your assessment result..." />
  if (error) return <PageContainer title="Assessment result"><p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p><Link to="/assessment"><Button className="mt-4">Back to assessments</Button></Link></PageContainer>
  if (!result) return <PageContainer title="Assessment History"><EmptyState title="No completed assessments yet" description="Start an assessment to see your score and history here." action={<Link to="/assessment"><Button>Browse Assessments</Button></Link>} /></PageContainer>

  return <PageContainer title={resultId ? 'Assessment Completed' : 'Assessment History'} subtitle={result.assessmentId?.title || result.assessment?.title || 'Your saved assessment results'}>
    {resultId ? <ResultSummary result={result} /> : null}
    <section className="rounded-xl border border-line bg-white p-4 shadow-sm"><h2 className="mb-3 text-sm font-semibold text-navy">Completed attempts</h2>{history.length ? <div className="divide-y divide-line">{history.map((attempt) => <div key={attempt._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium text-navy">{attempt.assessmentId?.title || 'Assessment'}</p><p className="text-xs text-muted">{attempt.assessmentId?.category || ''} · {attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : 'Completed'}</p></div><div className="flex items-center gap-3"><span className="font-semibold">{attempt.score}/{attempt.total} · {attempt.percentage}%</span><Link className="font-semibold text-primary" to={`/assessment/result/${attempt._id}`}>View Result</Link></div></div>)}</div> : <p className="py-3 text-sm text-muted">No assessment attempts have been completed.</p>}</section>
    <Link to="/assessment" className="inline-block text-sm font-semibold text-primary">Back to assessments →</Link>
  </PageContainer>
}

function ResultSummary({ result }) {
  const passed = result.passed ?? result.percentage >= (result.passingScore ?? result.assessmentId?.passingScore ?? 70)
  const level = result.assessmentLevel || result.assessmentId?.level || 'Beginner'
  const firstSkill = result.skillPerformance?.[0]
  return <div className="mb-5 space-y-4"><div className="rounded-xl border border-line bg-white p-6 text-center shadow-sm"><CircleCheck className={`mx-auto ${passed ? 'text-emerald-600' : 'text-amber-600'}`} size={46} /><p className="mt-3 text-sm text-muted">{passed ? `${level} level passed` : `${level} level not passed`} · {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : result.completedAt ? new Date(result.completedAt).toLocaleString() : 'Saved'}</p><p className="mt-2 text-3xl font-bold text-navy">{result.percentage}%</p><p className="mt-1 text-sm text-muted">Score {result.score} / {result.total} · {result.passingScore ?? result.assessmentId?.passingScore ?? 70}% required to pass</p><p className={`mt-2 text-sm font-semibold ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>{passed ? (level === 'Advanced' ? 'All levels passed for this skill.' : 'The next level is now unlocked.') : 'The next level remains locked. Review lessons and retry.'}</p></div><div className="grid grid-cols-3 gap-3"><Stat label="Correct" value={result.correct} /><Stat label="Incorrect" value={result.incorrect} /><Stat label="Unanswered" value={result.unattempted} /></div><section className="rounded-xl border border-line bg-white p-4 shadow-sm"><h2 className="mb-3 text-sm font-semibold text-navy">Skill performance</h2><div className="space-y-3">{(result.skillPerformance || []).map((skill) => <div key={skill.skillId || skill.name}><div className="mb-1 flex justify-between text-xs"><span>{skill.name}</span><span>{skill.correct}/{skill.total} · {skill.value}%</span></div><ProgressBar value={skill.value} />{!skill.passed && skill.name ? <Link className="mt-1 inline-block text-xs font-semibold text-primary" to={`/youtube-learning?skill=${encodeURIComponent(skill.name)}&difficulty=${encodeURIComponent(level)}`}>Review {skill.name} lessons</Link> : null}</div>)}</div>{result.weakSkills?.length ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Skills to focus on: {result.weakSkills.map((skill) => skill.name || skill).join(', ')}</p> : null}{!passed ? <Link className="mt-4 inline-block text-sm font-semibold text-primary" to={`/assessment?skillId=${encodeURIComponent(firstSkill?.skillId || '')}&level=${encodeURIComponent(level)}`}>Review and retry this level</Link> : null}</section></div>
}

function Stat({ label, value }) { return <div className="rounded-xl border border-line bg-white p-4 text-center"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-semibold">{value ?? 0}</p></div> }
