import { Award, BookOpen, ClipboardList, Clock, Flame, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../../components/common/ChartCard'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import StatCard from '../../components/common/StatCard'
import { useApiData } from '../../hooks/useApiData'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState'

const icons = [TrendingUp, Clock, BookOpen, ClipboardList, ClipboardList, TrendingUp, Award, Flame]
const colors = ['#304FFE', '#7C3AED', '#16A34A']

export default function Analytics() {
  const { data, loading } = useApiData('/analytics/employee', { initialData: null })
  const { data: quizPerformance } = useApiData('/quiz/performance', { initialData: null })
  const cards = data?.cards || {}
  const assessmentAnalytics = data?.assessmentAnalytics || {}
  const analyticsCards = [
    { id: 'growth', label: 'Assessment Score Change', value: cards.competencyGrowth || '0%', hint: 'Across completed attempts' },
    { id: 'hours', label: 'Learning Hours', value: cards.learningHours || 0, hint: 'Total tracked' },
    { id: 'courses', label: 'Courses Completed', value: cards.coursesCompleted || 0 },
    { id: 'assessments', label: 'Skill Assessments', value: cards.assessmentsTaken || 0 },
    { id: 'quizzes', label: 'Learning Quizzes', value: cards.learningQuizzesTaken || 0 },
    { id: 'pass-rate', label: 'Overall Pass Rate', value: `${cards.assessmentPassRate || 0}%` },
    { id: 'certificates', label: 'Certificates Earned', value: cards.certificatesEarned || 0 },
    { id: 'streak', label: 'Learning Streak', value: cards.learningStreak ? `${cards.learningStreak} days` : '—' },
  ]
  const assessmentScoreTrend = data?.assessmentScoreTrend || []
  const learningHours = data?.learningHoursChart || []
  const courseCompletionStats = data?.courseCompletionStats || []

  return (
    <PageContainer title="Progress & Analytics">
      {loading ? <Loading label="Loading analytics..." /> : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {analyticsCards.map((c, i) => (
          <StatCard key={c.id} icon={icons[i]} label={c.label} value={c.value} hint={c.hint} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Completed Assessment Score Trend">
          {assessmentScoreTrend.length ? <ResponsiveContainer>
            <LineChart data={assessmentScoreTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#304FFE" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer> : <EmptyState title="No completed assessments yet" description="Complete a skill assessment or learning quiz to see your score trend." />}
        </ChartCard>
        <ChartCard title="Learning Hours">
          {learningHours.length ? <ResponsiveContainer>
            <BarChart data={learningHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#304FFE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer> : <EmptyState title="No learning-hour history yet" description="Tracked course learning hours will appear here." />}
        </ChartCard>
      </div>
      <ChartCard title="Course completion statistics">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={courseCompletionStats} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
              {courseCompletionStats.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Assessment outcomes by type and level">
        {assessmentAnalytics.byType?.length ? <ResponsiveContainer>
          <BarChart data={assessmentAnalytics.byType}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="passed" name="Passed" stackId="outcome" fill="#16A34A" />
            <Bar dataKey="failed" name="Not passed" stackId="outcome" fill="#F97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer> : <EmptyState title="No assessment results yet" description="Completed skill assessments and learning quizzes will be grouped here." />}
      </ChartCard>
      <ChartCard title="Recent completed assessments">
        {assessmentAnalytics.recentAttempts?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs text-muted"><tr><th className="px-3 py-2">Assessment</th><th className="px-3 py-2">Type / level</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Completed</th></tr></thead><tbody>{assessmentAnalytics.recentAttempts.map((attempt) => <tr key={attempt.id} className="border-t border-line"><td className="px-3 py-3"><p className="font-medium text-navy">{attempt.title}</p><p className="text-xs text-muted">{attempt.category}</p></td><td className="px-3 py-3">{attempt.type} · {attempt.level}</td><td className="px-3 py-3">{attempt.score}/{attempt.total} · {attempt.percentage}%</td><td className={`px-3 py-3 font-medium ${attempt.passed ? 'text-emerald-700' : 'text-amber-700'}`}>{attempt.passed ? 'Passed' : 'Not passed'}</td><td className="px-3 py-3 text-muted">{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div> : <EmptyState title="No completed assessment attempts" description="Your completed assessments and quiz attempts will appear here." />}
      </ChartCard>
      <ChartCard title="Quiz performance and topics">
        {quizPerformance?.completedQuizzes ? <div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs text-muted">Average quiz score</p><p className="text-2xl font-bold text-primary">{quizPerformance.averageScore}%</p><p className="text-sm text-muted">{quizPerformance.completedQuizzes} completed quizzes</p></div><div><h3 className="text-sm font-semibold">Strengths</h3>{quizPerformance.strengths?.length ? quizPerformance.strengths.map((topic) => <p key={topic.topic} className="mt-1 text-sm">{topic.topic} · {topic.percentage}%</p>) : <p className="mt-1 text-sm text-muted">No strengths recorded yet.</p>}</div><div><h3 className="text-sm font-semibold">Needs practice</h3>{quizPerformance.weakTopics?.length ? quizPerformance.weakTopics.map((topic) => <p key={topic.topic} className="mt-1 text-sm">{topic.topic} · {topic.percentage}%</p>) : <p className="mt-1 text-sm text-muted">No weak topics recorded.</p>}</div><div className="md:col-span-3"><h3 className="text-sm font-semibold">Recent attempts</h3><div className="mt-2 space-y-2">{quizPerformance.recentAttempts?.slice(0, 5).map((attempt) => <div key={attempt._id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-2 text-sm"><span>{attempt.quizId?.title || 'Quiz'}</span><span>{attempt.percentage}% · {new Date(attempt.completedAt).toLocaleDateString()}</span></div>)}</div></div></div> : <EmptyState title="No quiz results yet" description="Complete a lesson quiz to see your performance here." action={<Link to="/learning-path" className="text-sm font-semibold text-primary">Open Learning Path</Link>} />}
      </ChartCard>
    </PageContainer>
  )
}
