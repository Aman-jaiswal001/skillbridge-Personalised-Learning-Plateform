import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'

export default function VideoQuizResult() {
  const { quizId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { push } = useToast()
  const [result, setResult] = useState(location.state?.result || null)
  const [loading, setLoading] = useState(!location.state?.result)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (result) return
    let active = true
    apiRequest(`/quiz/${quizId}/result`).then((payload) => { if (active) setResult(payload.data) }).catch((err) => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [quizId, result])

  async function startRecommended(resource) {
    setStarting(true)
    try {
      const payload = await apiRequest(`/youtube-learning/items/${resource._id || resource.id}`, { method: 'POST' })
      push(payload.existing ? 'Opening the lesson already in your path' : 'Added to your learning path')
      navigate(`/youtube-learning/items/${payload.data._id}`)
    } catch (err) { push(err.message, 'error') }
    finally { setStarting(false) }
  }

  if (loading) return <Loading label="Loading quiz result..." />
  if (error || !result) return <PageContainer title="Quiz Results"><EmptyState title="Result unavailable" description={error || 'No submitted attempt was found.'} action={<Link to="/learning-path"><Button>Back to Learning Path</Button></Link>} /></PageContainer>
  const recommendation = result.recommendation
  const reviewThreshold = recommendation?.thresholds?.review ?? 50
  const advanceThreshold = recommendation?.thresholds?.advance ?? 80
  return <PageContainer title="Quiz Results" subtitle={result.quiz?.title || 'Lesson quiz'}>
    <div className="grid gap-3 sm:grid-cols-4"><Stat label="Score" value={`${result.score}/${result.total}`} /><Stat label="Percentage" value={`${result.percentage}%`} /><Stat label="Correct" value={result.correct} /><Stat label="Incorrect / unanswered" value={`${result.incorrect} / ${result.unattempted}`} /></div>
    {result.contentSource === 'metadata' || result.quiz?.contentSource === 'metadata' ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{result.sourceLabel || result.quiz?.sourceLabel || 'This quiz was generated from lesson metadata because a transcript was unavailable.'}</p> : null}
    {recommendation ? <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-primary">Rule-based next step</p><h2 className="mt-1 font-semibold text-navy">{recommendation.resource?.title || recommendation.title || 'Review this lesson'}</h2><p className="mt-1 text-sm text-slate-700">{recommendation.reason}</p></div><Badge>{result.percentage < reviewThreshold ? 'Review' : result.percentage < advanceThreshold ? 'Practice' : 'Next lesson'}</Badge></div>{recommendation.learningItemId ? <div className="mt-3"><Link to={`/youtube-learning/items/${recommendation.learningItemId}`}><Button>Review Lesson</Button></Link></div> : recommendation.resource?._id || recommendation.resource?.id ? <div className="mt-3"><Button disabled={starting} onClick={() => startRecommended(recommendation.resource)}>{starting ? 'Opening...' : 'Start Learning'}</Button></div> : null}</section> : null}
    <section className="rounded-xl border border-line bg-white p-4"><h2 className="font-semibold text-navy">Topic performance</h2>{result.topicPerformance?.length ? <div className="mt-3 space-y-3">{result.topicPerformance.map((topic) => <div key={topic.topic}><div className="flex justify-between gap-2 text-sm"><span>{topic.topic}</span><span>{topic.correct}/{topic.total} · {topic.percentage}%</span></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-primary" style={{ width: `${topic.percentage}%` }} /></div></div>)}</div> : <p className="mt-2 text-sm text-muted">Topic results are not available for this attempt.</p>}</section>
    <section className="space-y-3"><h2 className="text-lg font-semibold text-navy">Answer review</h2>{(result.review || []).map((row, index) => <article key={`${index}-${row.question}`} className="rounded-xl border border-line bg-white p-4"><p className="font-medium text-navy">{index + 1}. {row.question}</p><div className="mt-2 space-y-1 text-sm">{row.options.map((option, optionIndex) => <p key={optionIndex} className={optionIndex === row.correctAnswer ? 'font-semibold text-emerald-700' : optionIndex === row.selected ? 'text-red-700' : 'text-slate-600'}>{String.fromCharCode(65 + optionIndex)}. {option}{optionIndex === row.correctAnswer ? ' · Correct answer' : optionIndex === row.selected ? ' · Your answer' : ''}</p>)}</div><p className="mt-2 text-sm text-slate-600">{row.explanation}</p></article>)}</section>
    <div className="flex flex-wrap gap-2"><Link to="/learning-path"><Button variant="secondary">My Learning Path</Button></Link><Link to="/youtube-learning"><Button>Browse Videos</Button></Link></div>
  </PageContainer>
}

function Stat({ label, value }) { return <div className="rounded-xl border border-line bg-white p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-bold text-navy">{value}</p></div> }
