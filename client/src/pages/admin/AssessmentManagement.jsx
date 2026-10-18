import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

const blankQuestion = () => ({ question: '', options: ['', '', '', ''], correctAnswer: '', difficulty: 'Medium' })
const blankForm = () => ({ title: '', topic: '', description: '', difficulty: 'Medium', duration: 30, passingScore: 60, allowRetakes: true, questions: [blankQuestion()] })

export default function AssessmentManagement() {
  const [form, setForm] = useState(blankForm)
  const [editing, setEditing] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState('')
  const { push } = useToast()
  const { data: assessments = [], loading, error, reload } = useApiData('/admin/assessments', { initialData: [] })

  function changeQuestion(index, key, value) {
    setForm((current) => ({ ...current, questions: current.questions.map((question, i) => i === index ? { ...question, [key]: value } : question) }))
  }

  function changeOption(questionIndex, optionIndex, value) {
    setForm((current) => ({ ...current, questions: current.questions.map((question, i) => i === questionIndex ? { ...question, options: question.options.map((option, j) => j === optionIndex ? value : option) } : question) }))
  }

  function edit(assessment) {
    setEditing(assessment._id)
    setForm({
      title: assessment.title || '', topic: assessment.category || '', description: assessment.description || '',
      difficulty: assessment.difficulty || 'Medium', duration: assessment.duration || 30,
      passingScore: assessment.passingScore ?? 60, allowRetakes: assessment.allowRetakes !== false,
      questions: (assessment.questions || []).map((question) => ({ question: question.question, options: [...question.options], correctAnswer: String(question.correctAnswer), difficulty: question.difficulty || assessment.difficulty || 'Medium' })),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() { setEditing(''); setForm(blankForm()) }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const body = { ...form, duration: Number(form.duration), passingScore: Number(form.passingScore), questions: form.questions.map((question) => ({ ...question, correctAnswer: Number(question.correctAnswer) })) }
      await apiRequest(editing ? `/admin/assessments/${editing}` : '/admin/assessments', { method: editing ? 'PUT' : 'POST', body })
      push(editing ? 'Assessment draft updated' : 'Assessment draft created')
      reset()
      await reload()
    } catch (err) { push(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function publish(assessment) {
    setBusy(assessment._id)
    try {
      await apiRequest(`/admin/assessments/${assessment._id}/publish`, { method: 'PATCH', body: { published: !assessment.isPublished } })
      push(assessment.isPublished ? 'Assessment unpublished' : 'Assessment published')
      await reload()
    } catch (err) { push(err.message, 'error') }
    finally { setBusy('') }
  }

  async function archive(assessment) {
    if (!window.confirm(`Archive “${assessment.title}”? Existing student history will be retained.`)) return
    setBusy(assessment._id)
    try {
      await apiRequest(`/admin/assessments/${assessment._id}`, { method: 'DELETE' })
      push('Assessment archived')
      await reload()
    } catch (err) { push(err.message, 'error') }
    finally { setBusy('') }
  }

  return <PageContainer title="Assessment Management" subtitle="Create multiple-choice assessments, set topics and difficulty, then publish them for students." actions={<Link to="/admin/assessments/bulk-upload"><Button variant="secondary">Bulk Upload</Button></Link>}>
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-navy">{editing ? 'Edit draft assessment' : 'Create assessment'}</h2><p className="text-sm text-muted">Correct answers stay private and are scored by the server.</p></div>{editing ? <Button type="button" variant="secondary" onClick={reset}>Cancel edit</Button> : null}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Assessment title"><input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="e.g. JavaScript Fundamentals" /></Field>
        <Field label="Topic"><input required maxLength={120} value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} className={inputClass} placeholder="e.g. JavaScript" /></Field>
        <Field label="Difficulty"><select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value, questions: form.questions.map((question) => ({ ...question, difficulty: event.target.value })) })} className={inputClass}>{['Easy', 'Medium', 'Hard'].map((level) => <option key={level}>{level}</option>)}</select></Field>
        <Field label="Duration (minutes)"><input required type="number" min="1" max="300" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} className={inputClass} /></Field>
        <Field label="Passing score (%)"><input required type="number" min="0" max="100" value={form.passingScore} onChange={(event) => setForm({ ...form, passingScore: event.target.value })} className={inputClass} /></Field>
        <label className="flex items-end gap-2 pb-2 text-sm text-navy"><input type="checkbox" checked={form.allowRetakes} onChange={(event) => setForm({ ...form, allowRetakes: event.target.checked })} />Allow students to retake</label>
        <Field label="Description"><textarea maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} min-h-20`} placeholder="Optional instructions" /></Field>
      </div>

      <div className="space-y-4">
        {form.questions.map((question, index) => <section key={index} className="space-y-3 rounded-lg border border-line bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-navy">Question {index + 1}</h3>{form.questions.length > 1 ? <Button type="button" variant="ghost" onClick={() => setForm({ ...form, questions: form.questions.filter((_, i) => i !== index) })}>Remove</Button> : null}</div>
          <textarea required value={question.question} onChange={(event) => changeQuestion(index, 'question', event.target.value)} className={`${inputClass} min-h-20`} placeholder="Write the question" />
          <div className="grid gap-3 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-center gap-2"><input type="radio" name={`correct-${index}`} checked={String(question.correctAnswer) === String(optionIndex)} onChange={() => changeQuestion(index, 'correctAnswer', String(optionIndex))} aria-label={`Mark choice ${optionIndex + 1} as correct`} /><input required value={option} onChange={(event) => changeOption(index, optionIndex, event.target.value)} className={inputClass} placeholder={`Choice ${optionIndex + 1}${String(question.correctAnswer) === String(optionIndex) ? ' (correct)' : ''}`} /></label>)}</div>
          <p className="text-xs text-muted">Select the radio button beside the correct choice.</p>
          <label className="block max-w-xs text-xs font-medium text-muted">Question difficulty<select value={question.difficulty} onChange={(event) => changeQuestion(index, 'difficulty', event.target.value)} className={`${inputClass} mt-1`}>{['Easy', 'Medium', 'Hard'].map((level) => <option key={level}>{level}</option>)}</select></label>
        </section>)}
        <Button type="button" variant="secondary" disabled={form.questions.length >= 100} onClick={() => setForm({ ...form, questions: [...form.questions, blankQuestion()] })}>Add MCQ question</Button>
      </div>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save draft' : 'Create draft'}</Button>{editing ? <Button type="button" variant="secondary" onClick={reset}>Cancel</Button> : null}</div>
    </form>

    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-navy">Assessments</h2><p className="text-sm text-muted">Student attempts are retained when an assessment is unpublished or archived.</p></div>
      {loading ? <Loading label="Loading assessments..." /> : null}
      {error ? <EmptyState title="Couldn't load assessments" description={error} action={<Button variant="secondary" onClick={reload}>Try again</Button>} /> : null}
      {!loading && !error && assessments.length ? <div className="grid gap-3 md:grid-cols-2">{assessments.map((assessment) => <article key={assessment._id} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center gap-2"><Badge>{assessment.category || 'General'}</Badge><Badge>{assessment.difficulty || 'Medium'}</Badge><Badge status={assessment.isPublished ? 'Completed' : 'Not Started'}>{assessment.isPublished ? 'Published' : 'Draft'}</Badge></div><div><h3 className="font-semibold text-navy">{assessment.title}</h3><p className="text-sm text-muted">{assessment.questions?.length || 0} questions · {assessment.duration} min · {assessment.attemptCount || 0} student attempts</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={Boolean(assessment.attemptCount) || busy === assessment._id} onClick={() => edit(assessment)}>{assessment.attemptCount ? 'Locked after attempts' : 'Edit'}</Button><Button disabled={busy === assessment._id} onClick={() => publish(assessment)}>{busy === assessment._id ? 'Saving...' : assessment.isPublished ? 'Unpublish' : 'Publish'}</Button><Button variant="ghost" disabled={busy === assessment._id} onClick={() => archive(assessment)}>Archive</Button></div></article>)}</div> : null}
      {!loading && !error && !assessments.length ? <EmptyState title="No assessments yet" description="Create an assessment above and publish it when it is ready." /> : null}
    </section>
  </PageContainer>
}

const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15'
function Field({ label, children }) { return <label className="block text-xs font-medium text-muted">{label}<span className="mt-1 block">{children}</span></label> }
