import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import PageContainer from '../../components/common/PageContainer'

export default function QuizResult() {
  const result = readResult()
  if (!result) {
    return (
      <PageContainer title="Quiz Result">
        <EmptyState title="No quiz result yet" description="Submit a generated quiz to see your score." action={<Link to="/quiz-generator"><Button>Generate Quiz</Button></Link>} />
      </PageContainer>
    )
  }

  const percent = result.percentage ?? 0
  const donut = [
    { name: 'Score', value: percent },
    { name: 'Rest', value: 100 - percent },
  ]

  return (
    <PageContainer title="Quiz Result">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-5 text-center shadow-sm">
          <p className="text-sm text-muted">
            Score {result.score} / {result.total}
          </p>
          <div className="mx-auto h-[200px] w-[200px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} innerRadius={58} outerRadius={78} dataKey="value">
                  <Cell fill="#304FFE" />
                  <Cell fill="#E2E8F0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="-mt-4 text-2xl font-bold">{percent}%</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div>Correct {result.correct}</div>
            <div>Incorrect {result.incorrect}</div>
            <div>Unattempted {result.unattempted}</div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-[15px] font-semibold">Performance chart</h3>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={result.questionPerformance || []}>
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Bar dataKey="score" fill="#304FFE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-white p-4">
        <h3 className="text-[15px] font-semibold">Weak Topics</h3>
        {(result.weakTopics || []).length ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            {result.weakTopics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No weak topics identified.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/quiz">
          <Button variant="secondary">Review Answers</Button>
        </Link>
        <Link to="/recommendations">
          <Button>Recommended Next</Button>
        </Link>
      </div>
    </PageContainer>
  )
}

function readResult() {
  try {
    return JSON.parse(localStorage.getItem('skillbridge_last_quiz_result'))
  } catch {
    return null
  }
}
