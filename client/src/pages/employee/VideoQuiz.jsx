import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'

export default function VideoQuiz() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { push } = useToast()
  const [quiz, setQuiz] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [unanswered, setUnanswered] = useState(false)
  const [submissionKey] = useState(() => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let active = true
    apiRequest(`/quiz/youtube-learning/${itemId}`, { method: 'POST', body: {} })
      .then((payload) => { if (active) setQuiz(payload.data) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [itemId])

  async function submit() {
    const questions = quiz?.questions || []
    const missing = questions.findIndex((_, questionIndex) => answers[questionIndex] === undefined)
    if (missing >= 0) { setIndex(missing); setUnanswered(true); return }
    setSubmitting(true)
    try {
      const payload = await apiRequest(`/quiz/${quiz._id}/submit`, { method: 'POST', body: { answers: questions.map((question, questionIndex) => ({ questionId: question.id, selected: answers[questionIndex] })), submissionKey } })
      push('Quiz submitted and scored')
      navigate(`/youtube-learning/quiz/${quiz._id}/result`, { state: { result: payload.data } })
    } catch (err) { push(err.message, 'error') }
    finally { setSubmitting(false) }
  }

  if (loading) return <Loading label="Preparing lesson quiz..." />
  if (error || !quiz?.questions?.length) return <PageContainer title="Lesson Quiz"><EmptyState title="Quiz unavailable" description={error || 'A valid quiz could not be prepared. Please retry.'} action={<div className="flex justify-center gap-2"><Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button><Link to={`/youtube-learning/items/${itemId}`}><Button>Back to Lesson</Button></Link></div>} /></PageContainer>

  const question = quiz.questions[index]
  const answeredCount = Object.keys(answers).length
  return <PageContainer title={quiz.title} subtitle={`Question ${index + 1} of ${quiz.questions.length}`} actions={<Link to={`/youtube-learning/items/${itemId}`}><Button variant="secondary">Back to Lesson</Button></Link>}>
    {quiz.contentSource === 'metadata' ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This quiz uses the saved lesson description, objectives, subtopics, and skills. A video transcript was not available, so questions are not claimed to come from the watched video.</p> : null}
    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / quiz.questions.length) * 100}%` }} /></div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <section className="min-w-0 rounded-xl border border-line bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-primary">{question.difficulty || quiz.difficulty}</span>{(question.tags || [question.topic]).filter(Boolean).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{tag}</span>)}</div>
        <h2 className="mt-4 text-lg font-semibold text-navy">{question.question}</h2>
        <div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <button key={`${question.id}-${optionIndex}`} type="button" aria-pressed={answers[index] === optionIndex} onClick={() => { setAnswers((current) => ({ ...current, [index]: optionIndex })); setUnanswered(false) }} className={`w-full rounded-lg border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${answers[index] === optionIndex ? 'border-primary bg-indigo-50 text-navy' : 'border-line hover:bg-slate-50'}`}><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs font-semibold">{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div>
        {unanswered ? <p role="alert" className="mt-3 text-sm text-red-700">Answer this question before submitting. {quiz.questions.length - answeredCount} unanswered.</p> : null}
        <div className="mt-5 flex flex-wrap justify-between gap-2"><Button variant="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Previous</Button>{index < quiz.questions.length - 1 ? <Button onClick={() => setIndex((value) => value + 1)}>Next</Button> : <Button disabled={submitting} onClick={submit}>{submitting ? 'Submitting...' : 'Submit Quiz'}</Button>}</div>
      </section>
      <aside className="h-fit rounded-xl border border-line bg-white p-4"><p className="mb-3 text-sm font-semibold">Question navigation</p><div className="grid grid-cols-5 gap-2">{quiz.questions.map((_, questionIndex) => <button key={questionIndex} type="button" aria-label={`Go to question ${questionIndex + 1}`} aria-current={index === questionIndex ? 'step' : undefined} onClick={() => setIndex(questionIndex)} className={`h-9 rounded-md text-xs font-semibold ${index === questionIndex ? 'bg-primary text-white' : answers[questionIndex] !== undefined ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{questionIndex + 1}</button>)}</div><p className="mt-3 text-xs text-muted">{answeredCount} of {quiz.questions.length} answered</p></aside>
    </div>
  </PageContainer>
}
