import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest, extractData } from '../../api/client'
import { normalizeQuestion } from '../../api/normalizers'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import PageContainer from '../../components/common/PageContainer'
import QuestionCard from '../../components/common/QuestionCard'
import QuizOption from '../../components/common/QuizOption'
import { cn } from '../../utils/helpers'

export default function AssessmentAttempt() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saveVersion, setSaveVersion] = useState(0)

  useEffect(() => {
    let mounted = true
    apiRequest(`/assessments/attempts/${attemptId}`).then((payload) => {
      if (!mounted) return
      const data = extractData(payload)
      if (data.status !== 'IN_PROGRESS') {
        navigate(`/assessment/result/${attemptId}`, { replace: true })
        return
      }
      setAttempt(data)
      setAnswers(Object.fromEntries((data.answers || []).map((answer) => [String(answer.questionId), answer.selected])))
    }).catch((err) => { if (mounted) setError(err.message) })
    return () => { mounted = false }
  }, [attemptId, navigate])

  useEffect(() => {
    if (!attempt || saveVersion === 0) return undefined
    const snapshot = { ...answers }
    const timer = setTimeout(async () => {
      setSaving(true)
      try {
        await apiRequest(`/assessments/attempts/${attemptId}/answers`, { method: 'PUT', body: { answers: (attempt.questions || []).map((question) => ({ questionId: String(question.id || question._id), selected: snapshot[String(question.id || question._id)] ?? null })) } })
        setError('')
      } catch (err) {
        setError(`Could not save your answers: ${err.message}`)
      } finally { setSaving(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [answers, attempt, attemptId, saveVersion])

  const questions = useMemo(() => (attempt?.questions || []).map(normalizeQuestion), [attempt])
  const current = questions[index]
  const answeredCount = questions.filter((question) => answers[String(question.id)] !== null && answers[String(question.id)] !== undefined).length

  function choose(selected) {
    const next = { ...answers, [String(current.id)]: selected }
    setAnswers(next)
    setError('')
    setSaveVersion((version) => version + 1)
  }

  async function submit() {
    setSubmitting(true)
    try {
      await apiRequest(`/assessments/attempts/${attemptId}/answers`, { method: 'PUT', body: { answers: questions.map((question) => ({ questionId: String(question.id), selected: answers[String(question.id)] ?? null })) } })
      const payload = await apiRequest(`/assessments/attempts/${attemptId}/submit`, { method: 'POST' })
      window.dispatchEvent(new Event('skillbridge:learning-updated'))
      navigate(`/assessment/result/${extractData(payload)._id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
      setConfirming(false)
    }
  }

  if (error && !attempt) return <PageContainer title="Assessment unavailable"><p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p><Button variant="secondary" onClick={() => navigate('/assessment')}>Back to assessments</Button></PageContainer>
  if (!attempt) return <Loading label="Loading your saved assessment attempt..." />
  if (!current) return <PageContainer title="Assessment unavailable"><p role="alert" className="text-sm text-muted">This assessment has no available questions.</p></PageContainer>

  return <>
    <PageContainer title={attempt.assessment.title} subtitle={`${attempt.assessment.category} · ${attempt.assessment.durationLabel || `${attempt.assessment.duration} min`}`}>
      {error ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p> : null}
      <div className="flex items-center justify-between text-sm text-muted"><span>Question {index + 1} of {questions.length}</span><span>{answeredCount} answered{saving ? ' · Saving…' : ' · Saved'}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <QuestionCard index={index + 1} total={questions.length} category={current.skill || current.category} question={current.text}>
          {current.options.map((option, optionIndex) => <QuizOption key={`${current.id}-${optionIndex}`} index={optionIndex} label={option} selected={answers[String(current.id)] === optionIndex} onSelect={() => choose(optionIndex)} />)}
          <div className="flex justify-between pt-4"><Button variant="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Previous</Button>{index === questions.length - 1 ? <Button disabled={saving} onClick={() => setConfirming(true)}>Submit Assessment</Button> : <Button onClick={() => setIndex((value) => value + 1)}>Next</Button>}</div>
        </QuestionCard>
        <aside className="h-fit rounded-xl border border-line bg-white p-4 shadow-sm"><p className="mb-3 text-sm font-semibold text-navy">Question navigator</p><div className="grid grid-cols-5 gap-2">{questions.map((question, questionIndex) => <button key={question.id} aria-label={`Go to question ${questionIndex + 1}`} onClick={() => setIndex(questionIndex)} className={cn('grid h-9 place-items-center rounded-md text-xs font-semibold', questionIndex === index ? 'bg-primary text-white' : answers[String(question.id)] !== undefined && answers[String(question.id)] !== null ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')}>{questionIndex + 1}</button>)}</div></aside>
      </div>
    </PageContainer>
    <Modal open={confirming} title="Submit assessment?" onClose={() => setConfirming(false)} footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Review answers</Button><Button disabled={submitting || saving} onClick={submit}>{submitting ? 'Submitting…' : 'Confirm Submit'}</Button></>}><p className="text-sm text-muted">You answered {answeredCount} of {questions.length} questions. Unanswered questions will count as incorrect. You cannot change answers after submission.</p></Modal>
  </>
}
