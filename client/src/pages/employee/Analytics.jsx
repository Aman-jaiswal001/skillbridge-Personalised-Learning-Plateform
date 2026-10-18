import { Award, BookOpen, ClipboardList, Clock, Flame, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../../components/common/ChartCard'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import StatCard from '../../components/common/StatCard'
import { useApiData } from '../../hooks/useApiData'

const icons = [TrendingUp, Clock, BookOpen, ClipboardList, Award, Flame]
const colors = ['#304FFE', '#7C3AED', '#16A34A']

export default function Analytics() {
  const { data, loading } = useApiData('/analytics/employee', { initialData: null })
  const cards = data?.cards || {}
  const analyticsCards = [
    { id: 'growth', label: 'Competency Growth', value: cards.competencyGrowth || '+0%', hint: 'Since baseline' },
    { id: 'hours', label: 'Learning Hours', value: cards.learningHours || 0, hint: 'Total tracked' },
    { id: 'courses', label: 'Courses Completed', value: cards.coursesCompleted || 0 },
    { id: 'assessments', label: 'Assessments Taken', value: cards.assessmentsTaken || 0 },
    { id: 'certificates', label: 'Certificates Earned', value: cards.certificatesEarned || 0 },
    { id: 'streak', label: 'Learning Streak', value: `${cards.learningStreak || 0} days` },
  ]
  const competencyGrowth = data?.competencyGrowth || []
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
        <ChartCard title="Competency Growth">
          <ResponsiveContainer>
            <LineChart data={competencyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#304FFE" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Learning Hours">
          <ResponsiveContainer>
            <BarChart data={learningHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#304FFE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
    </PageContainer>
  )
}
