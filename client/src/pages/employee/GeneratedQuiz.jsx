import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest, extractData } from '../../api/client'
import { normalizeQuestion } from '../../api/normalizers'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import PageContainer from '../../components/common/PageContainer'
import QuestionCard from '../../components/common/QuestionCard'
import QuizOption from '../../components/common/QuizOption'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../utils/helpers'

export default function GeneratedQuiz() {
  const [quiz] = useState(readQuiz)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { push } = useToast()
  const questions = useMemo(() => (quiz?.questions || []).map(normalizeQuestion), [quiz])
  const q = questions[index]
  const answered = useMemo(() => Object.keys(answers).map(Number), [answers])

  async function submit() {
    setSubmitting(true)
    try {
      const payload = await apiRequest(`/quiz/${quiz._id || quiz.id}/submit`, {
        method: 'POST',
        body: { answers: questions.map((_, i) => answers[i] ?? null) },
      })
      localStorage.setItem('skillbridge_last_quiz_result', JSON.stringify(extractData(payload)))
      push('Quiz submitted')
      navigate('/quiz/result')
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!quiz || !questions.length) {
    return (
      <PageContainer title="Generated Quiz">
        <EmptyState title="No quiz generated" description="Generate a quiz first to begin." action={<Link to="/quiz-generator"><Button>Generate Quiz</Button></Link>} />
      </PageContainer>
    )
  }

  return (
    <PageContainer title={`${quiz.title || 'Quiz'} - Question ${index + 1} of ${questions.length}`}>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-primary" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <QuestionCard index={index + 1} total={questions.length} question={q.text}>
          {q.options.map((opt, i) => (
            <QuizOption
              key={opt}
              index={i}
              label={opt}
              selected={answers[index] === i}
              onSelect={() => setAnswers((prev) => ({ ...prev, [index]: i }))}
            />
          ))}
          <div className="flex justify-between pt-4">
            <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              Previous
            </Button>
            {index === questions.length - 1 ? (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            ) : (
              <Button onClick={() => setIndex((i) => i + 1)}>Next</Button>
            )}
          </div>
        </QuestionCard>
        <aside className="h-fit rounded-xl border border-line bg-white p-4">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn(
                  'grid h-8 place-items-center rounded-md text-xs font-semibold',
                  i === index ? 'bg-primary text-white' : answered.includes(i) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </PageContainer>
  )
}

function readQuiz() {
  try {
    return JSON.parse(localStorage.getItem('skillbridge_current_quiz'))
  } catch {
    return null
  }
}
