import { AlertTriangle, Percent, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { normalizeSkill } from '../../api/normalizers'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import ProgressBar from '../../components/common/ProgressBar'
import StatCard from '../../components/common/StatCard'
import { useApiData } from '../../hooks/useApiData'

export default function SkillGap() {
  const { data, loading } = useApiData('/employees/me/skill-gaps', { initialData: null })
  const skills = (data?.skillWise || []).map(normalizeSkill)
  const bars = (data?.categoryWise?.length ? data.categoryWise : skills).map((c) => ({
    name: c.category || c.name,
    gap: c.gap,
  }))
  const actionPlan = data?.actionPlan || []

  return (
    <PageContainer title="Skill Gap Analysis" subtitle="Priority gaps against your competency framework.">
      {loading ? <Loading label="Loading skill gaps..." /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Percent} label="Overall Skill Gap" value={`${data?.overallGap ?? 0}%`} />
        <StatCard icon={AlertTriangle} label="Critical Skill Gaps" value={data?.criticalGaps ?? 0} accent="text-danger" />
        <StatCard icon={TrendingDown} label="Improvement Needed" value={`${data?.highGaps ?? 0} high`} accent="text-warning" />
      </div>
      <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[15px] font-semibold">Skill Gap by Competency</h3>
        {bars.length ? (
          <>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} layout="vertical" margin={{ left: 24 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="gap" fill="#304FFE" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {skills.slice(0, 4).map((c) => (
                <div key={c.id} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <Badge status={c.status} />
                  </div>
                  <p className="text-xs text-muted">
                    Current {c.currentLevel}% - Required {c.targetLevel}% - Gap {c.gap}%
                  </p>
                  <ProgressBar className="mt-2" value={c.currentLevel} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="No skill gaps yet" description="Add skills or complete an assessment to generate analysis." />
        )}
      </div>
      <div>
        <h3 className="mb-3 text-[15px] font-semibold">Why these skills are important?</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {skills.slice(0, 3).map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{c.reason}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[15px] font-semibold">Recommended Action Plan</h3>
        {actionPlan.length ? (
          <ol className="space-y-3">
            {actionPlan.map((a) => (
              <li key={a.step} className="flex gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-primary">{a.step}</span>
                <div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-muted">{a.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">No action plan available yet.</p>
        )}
        <Link to="/learning-path" className="mt-4 inline-block">
          <Button>View Learning Path</Button>
        </Link>
      </div>
    </PageContainer>
  )
}
