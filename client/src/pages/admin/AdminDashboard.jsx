import { BookOpen, ClipboardList, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Button from '../../components/common/Button'
import ChartCard from '../../components/common/ChartCard'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import StatCard from '../../components/common/StatCard'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

const colors = ['#DC2626', '#F97316', '#304FFE', '#16A34A', '#64748B']

export default function AdminDashboard() {
  const { push } = useToast()
  const { data, loading } = useApiData('/admin/dashboard', { initialData: null })
  const departmentCompetency = (data?.departmentCompetency || []).map((d) => ({
    dept: d.department,
    score: d.competency,
  }))
  const skillGapDistribution = data?.skillGapDistribution || []
  const adminActivities = data?.recentActivities || []

  return (
    <PageContainer title="Admin Dashboard" subtitle="Overview of learning and competency across your organization">
      {loading ? <Loading label="Loading admin dashboard..." /> : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Employees" value={data?.totalEmployees ?? 0} />
        <StatCard icon={UserPlus} label="Active Learners" value={`${data?.activeLearners ?? 0}%`} />
        <StatCard icon={BookOpen} label="Courses" value={data?.totalCourses ?? 0} />
        <StatCard icon={ClipboardList} label="Assessments" value={data?.totalAssessments ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Department-wise Competency">
          <ResponsiveContainer>
            <BarChart data={departmentCompetency}>
              <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#304FFE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Skill Gap Distribution">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={skillGapDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                {skillGapDistribution.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-line bg-white p-4">
          <h3 className="mb-3 text-[15px] font-semibold">Recent Activities</h3>
          {adminActivities.length ? (
            <ul className="space-y-3 text-sm">
              {adminActivities.map((a, index) => (
                <li key={`${a.timestamp}-${index}`} className="flex justify-between gap-3 border-b border-line pb-3 last:border-0">
                  <span>{a.action} {a.resource ? `on ${a.resource}` : ''}</span>
                  <span className="shrink-0 text-xs text-muted">{a.timestamp ? new Date(a.timestamp).toLocaleDateString() : ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No recent activity.</p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <h3 className="mb-3 text-[15px] font-semibold">Quick Actions</h3>
          <div className="grid gap-2">
            <Link to="/admin/employees">
              <Button className="w-full" variant="secondary">
                Add Employee
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => push('Course creation is available through the backend API.')}>
              Upload Course
            </Button>
            <Link to="/admin/reports">
              <Button className="w-full" variant="secondary">
                Generate Report
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => push('Use Employee Management to broadcast notifications next.')}>
              Send Notification
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
