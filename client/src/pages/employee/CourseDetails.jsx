import { Award, Clock, Layers, Star, Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import { normalizeCourse } from '../../api/normalizers'
import courseImg from '../../assets/images/course-placeholder.png'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

export default function CourseDetails() {
  const { id } = useParams()
  const { push } = useToast()
  const { data, loading, reload } = useApiData(`/courses/${id}`)
  const course = data ? normalizeCourse(data) : null

  async function enroll() {
    try {
      await apiRequest(`/courses/${id}/enroll`, { method: 'POST' })
      await reload()
      push('Course added to your learning path')
    } catch (err) {
      push(err.message, 'error')
    }
  }

  async function markProgress() {
    try {
      await apiRequest(`/courses/${id}/progress`, {
        method: 'PUT',
        body: {
          progressPercentage: Math.min(100, Number(course.progress?.progressPercentage || course.progress || 0) + 20),
          learningHours: Number(course.progress?.learningHours || 0) + 1,
        },
      })
      await reload()
      push('Progress saved')
    } catch (err) {
      push(err.message, 'error')
    }
  }

  if (loading) return <Loading label="Loading course..." />
  if (!course) return <EmptyState title="Course not found" description="The selected course is not available." />

  const progress = course.progress?.progressPercentage ?? course.progress ?? 0

  return (
    <PageContainer title={course.title} subtitle={course.provider}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Star size={12} className="text-amber-500" /> {course.rating} rating
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {course.learners} learners
            </span>
            <Badge>{course.level}</Badge>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {course.duration}
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers size={12} /> {course.modules} Modules
            </span>
            {course.certificate ? (
              <span className="inline-flex items-center gap-1">
                <Award size={12} /> Certificate
              </span>
            ) : null}
          </div>
          <div className="rounded-xl border border-line bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">{course.description}</div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <h3 className="text-[15px] font-semibold">What you will learn</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {course.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-[15px] font-semibold">Modules</h3>
            <div className="space-y-2">
              {course.moduleList.map((m, index) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {index + 1}. {m.title}
                    </p>
                    <p className="text-xs text-muted">{m.duration}</p>
                  </div>
                  <Badge status={m.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="h-fit space-y-3 rounded-xl border border-line bg-white p-4 shadow-sm">
          <img src={courseImg} alt="" className="w-full rounded-lg object-cover" />
          <p className="text-xs text-muted">{progress}% complete</p>
          {progress > 0 ? (
            <Button className="w-full" onClick={markProgress}>
              Save More Progress
            </Button>
          ) : (
            <Button className="w-full" onClick={enroll}>
              Start Learning
            </Button>
          )}
        </aside>
      </div>
    </PageContainer>
  )
}
