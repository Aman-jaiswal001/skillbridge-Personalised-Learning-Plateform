import { BookOpen, ClipboardList, FileText, PlayCircle, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Button from '../../components/common/Button'
import ChartCard from '../../components/common/ChartCard'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import StatCard from '../../components/common/StatCard'
import { useApiData } from '../../hooks/useApiData'

const colors = ['#DC2626', '#F97316', '#304FFE', '#16A34A', '#64748B']

export default function AdminDashboard() {
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
        <StatCard icon={UserPlus} label="Active Employees" value={data?.activeEmployees ?? 0} />
        <StatCard icon={BookOpen} label="Courses" value={data?.totalCourses ?? 0} />
        <StatCard icon={ClipboardList} label="Assessments" value={data?.totalAssessments ?? 0} />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Link to="/admin/employees" className="rounded-xl border border-line bg-white p-4 transition hover:border-primary/40 hover:bg-slate-50"><p className="text-xs text-muted">Active learner rate</p><p className="mt-1 text-2xl font-bold text-navy">{data?.activeLearners ?? 0}%</p><p className="mt-1 text-xs text-muted">Of {data?.totalEmployees ?? 0} employees</p></Link>
        <Link to="/admin/assessments" className="rounded-xl border border-line bg-white p-4 transition hover:border-primary/40 hover:bg-slate-50"><p className="text-xs text-muted">Assessment drafts</p><p className="mt-1 text-2xl font-bold text-navy">{data?.draftAssessments ?? 0}</p><p className="mt-1 text-xs text-muted">Ready for review and publishing</p></Link>
        <Link to="/admin/youtube-learning" className="rounded-xl border border-line bg-white p-4 transition hover:border-primary/40 hover:bg-slate-50"><div className="flex items-center gap-2 text-muted"><PlayCircle size={15} /><p className="text-xs">Video library</p></div><p className="mt-1 text-2xl font-bold text-navy">{data?.publishedVideoResources ?? 0}<span className="text-sm font-medium text-muted"> / {data?.videoResources ?? 0} published</span></p></Link>
        <Link to="/admin/study-resources" className="rounded-xl border border-line bg-white p-4 transition hover:border-primary/40 hover:bg-slate-50"><div className="flex items-center gap-2 text-muted"><FileText size={15} /><p className="text-xs">Study resources</p></div><p className="mt-1 text-2xl font-bold text-navy">{data?.publishedStudyResources ?? 0}<span className="text-sm font-medium text-muted"> / {data?.studyResources ?? 0} published</span></p></Link>
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
            <Link to="/admin/youtube-learning"><Button className="w-full" variant="secondary">Manage Video Library</Button></Link>
            <Link to="/admin/assessments"><Button className="w-full" variant="secondary">Manage Assessments</Button></Link>
            <Link to="/admin/study-resources"><Button className="w-full" variant="secondary">Manage Study Resources</Button></Link>
            <Link to="/admin/reports">
              <Button className="w-full" variant="secondary">
                Generate Report
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
