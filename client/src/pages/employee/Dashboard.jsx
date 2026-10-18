import { useEffect } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, FileText, Flame, PlayCircle, Sparkles, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { normalizeCourse, normalizeNotification } from '../../api/normalizers'
import CourseCard from '../../components/common/CourseCard'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import SectionHeader from '../../components/common/SectionHeader'
import StatCard from '../../components/common/StatCard'
import { useAuth } from '../../context/AuthContext'
import { useApiData } from '../../hooks/useApiData'

const cardClass = 'min-w-0 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5'
const mapStudyResources = (items, payload) => ({ items, pagination: payload?.pagination })

export default function Dashboard() {
  const { user } = useAuth()
  const { data: bundle, loading, error, reload: reloadBundle } = useApiData('/employees/me')
  const { data: recommendationData = [] } = useApiData('/recommendations', { initialData: [] })
  const { data: skillsData } = useApiData('/employees/me/skills', { initialData: { skills: [] } })
  const { data: enrolledData = [] } = useApiData('/courses/my-courses', { initialData: [] })
  const { data: learningPath } = useApiData('/learning-path', { initialData: { stages: [] } })
  const { data: notificationData = [] } = useApiData('/notifications', { initialData: [] })
  const { data: quizPerformance } = useApiData('/quiz/performance', { initialData: null })
  const { data: assessmentHistory = [] } = useApiData('/assessments/history', { initialData: [] })
  const { data: videoItems = [] } = useApiData('/youtube-learning/items', { initialData: [] })
  const { data: studyResources = { items: [], pagination: {} } } = useApiData('/study-resources?limit=1', { initialData: { items: [], pagination: {} }, map: mapStudyResources })

  useEffect(() => {
    const onFocus = () => reloadBundle()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reloadBundle])

  const stats = bundle?.stats || {}
  const skills = skillsData?.skills || []
  const skillsInProgress = skills.filter((skill) => (skill.currentPercent ?? 0) < (skill.targetPercent ?? 100)).length
  const courses = enrolledData.map((row) => ({ ...normalizeCourse(row.courseId || {}), progress: row.progressPercentage || 0 }))
  const continueCourse = courses.find((course) => course.progress > 0 && course.progress < 100)
  const nextRoadmapStage = (learningPath?.stages || []).find((stage) => stage.progress < 100) || learningPath?.stages?.[0]
  const recommended = recommendationData.map(normalizeCourse).slice(0, 3)
  const activity = notificationData.map(normalizeNotification).slice(0, 4)
  const goal = bundle?.profile?.careerGoal || bundle?.profile?.jobRole || user?.designation || 'Choose a career goal in your profile'
  const completedVideoItems = videoItems.filter((item) => item.status === 'Completed').length
  const totalStudyResources = Number(studyResources?.pagination?.total ?? studyResources?.items?.length ?? 0)

  return (
    <PageContainer title={`Good to see you, ${bundle?.user?.name || user?.name?.split(' ')[0] || 'learner'}`} subtitle="Your next step toward the career you want starts here.">
      {loading ? <Loading label="Loading your learning dashboard..." /> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">We couldn’t load your latest learning data. {error}</p> : null}

      <section className="relative overflow-hidden rounded-2xl bg-navy px-5 py-6 text-white sm:px-7 sm:py-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Your career focus</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{goal}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Build job-ready skills with a learning plan shaped around your strengths and goals.</p>
          <Link to="/learning-path" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            View my learning path <ArrowRight size={16} />
          </Link>
        </div>
        <div aria-hidden="true" className="absolute -right-10 -top-14 h-64 w-64 rounded-full border border-white/10 sm:right-12 sm:top-[-6rem] sm:h-80 sm:w-80" />
        <div aria-hidden="true" className="absolute -right-2 -top-6 h-48 w-48 rounded-full border border-white/10 sm:right-24 sm:top-[-4rem] sm:h-64 sm:w-64" />
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Sparkles} label="Skills assessed" value={stats.skillsAnalysed ?? skills.length} />
        <StatCard icon={Target} label="Skills to grow" value={skillsInProgress} />
        <StatCard icon={BookOpen} label="Courses completed" value={stats.coursesCompleted ?? 0} />
        <StatCard icon={Flame} label="Learning streak" value={`${stats.streak ?? 0} days`} />
      </div>

      <section className={cardClass}>
        <SectionHeader title="Your learning at a glance" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/learning-path" className="flex min-h-20 items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/40 hover:bg-slate-50">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><BookOpen size={18} /></span>
            <span><span className="block text-lg font-bold text-navy">{courses.length}</span><span className="text-xs text-muted">Enrolled courses · {courses.filter((course) => course.progress >= 100).length} completed</span></span>
          </Link>
          <Link to="/youtube-learning" className="flex min-h-20 items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/40 hover:bg-slate-50">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><PlayCircle size={18} /></span>
            <span><span className="block text-lg font-bold text-navy">{videoItems.length}</span><span className="text-xs text-muted">Video lessons · {completedVideoItems} completed</span></span>
          </Link>
          <Link to="/study-resources" className="flex min-h-20 items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/40 hover:bg-slate-50">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><FileText size={18} /></span>
            <span><span className="block text-lg font-bold text-navy">{totalStudyResources}</span><span className="text-xs text-muted">Study resources available</span></span>
          </Link>
          <Link to="/assessment" className="flex min-h-20 items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/40 hover:bg-slate-50">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><ClipboardCheck size={18} /></span>
            <span><span className="block text-lg font-bold text-navy">{assessmentHistory.length}</span><span className="text-xs text-muted">Completed assessment attempts</span></span>
          </Link>
        </div>
      </section>

      <section className={cardClass}>
        <SectionHeader title="Quiz performance" action={<Link to="/analytics" className="text-sm font-semibold text-primary">View analytics</Link>} />
        {quizPerformance?.completedQuizzes ? <div className="grid gap-4 md:grid-cols-[160px_1fr_1fr]">
          <div className="rounded-xl bg-indigo-50 p-4"><p className="text-xs text-muted">Average score</p><p className="mt-1 text-2xl font-bold text-primary">{quizPerformance.averageScore}%</p><p className="text-xs text-muted">{quizPerformance.completedQuizzes} quizzes completed</p></div>
          <div><h3 className="text-sm font-semibold text-navy">Strengths</h3>{quizPerformance.strengths?.length ? <ul className="mt-2 space-y-1 text-sm text-slate-600">{quizPerformance.strengths.map((row) => <li key={row.topic}>{row.topic} · {row.percentage}%</li>)}</ul> : <p className="mt-2 text-sm text-muted">Take more quizzes to identify strengths.</p>}</div>
          <div><h3 className="text-sm font-semibold text-navy">Topics to practice</h3>{quizPerformance.weakTopics?.length ? <ul className="mt-2 space-y-1 text-sm text-slate-600">{quizPerformance.weakTopics.map((row) => <li key={row.topic}>{row.topic} · {row.percentage}%</li>)}</ul> : <p className="mt-2 text-sm text-muted">No weak topics found in recorded quizzes.</p>}</div>
        </div> : <EmptyState title="No quiz results yet" description="Take a quiz from a video in your Learning Path to start tracking your performance." />}
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <section className={cardClass}>
          <SectionHeader title="Pick up where you left off" />
          {continueCourse ? (
            <div className="rounded-xl border border-line bg-slate-50 p-4">
              <p className="text-xs font-medium text-muted">Continue learning</p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-navy">{continueCourse.title}</h3>
                  <p className="mt-1 text-sm text-muted">{continueCourse.progress}% complete</p>
                </div>
                <Link to={`/courses/${continueCourse.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-dark">Resume <ArrowRight size={15} /></Link>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-primary" style={{ width: `${continueCourse.progress}%` }} /></div>
            </div>
          ) : (
            <EmptyState title="Your next course starts here" description="Explore recommended courses and enroll to see your progress here." />
          )}
        </section>
        <section className={`${cardClass} bg-blue-50/70`}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary"><Sparkles size={19} /></span>
            <div><h2 className="font-semibold text-navy">Your AI Tutor</h2><p className="text-xs text-muted">Get help from your study materials</p></div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Upload your notes or ask a question. Answers can include references to your learning documents.</p>
          <Link to="/assistant" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-primary hover:bg-blue-100">Ask the AI Tutor <ArrowRight size={15} /></Link>
        </section>
      </div>

      <section>
        <SectionHeader title="Recommended for your growth" action={<Link to="/recommendations" className="text-sm font-semibold text-primary">Explore all</Link>} />
        {recommended.length ? <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">{recommended.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <div className={cardClass}><EmptyState title="Recommendations are on the way" description="Complete a skill assessment to personalize your course suggestions." /></div>}
      </section>

      {nextRoadmapStage ? <section className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your personalized roadmap</p>
          <h2 className="mt-1 text-base font-semibold text-navy">Next up: {nextRoadmapStage.level}</h2>
          <p className="mt-1 text-sm text-muted">{nextRoadmapStage.courses?.length ? `${nextRoadmapStage.courses.length} learning resources in this stage` : 'Your learning path updates as you build your skills.'}</p>
        </div>
        <Link to="/learning-path" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-navy hover:bg-slate-50">View roadmap <ArrowRight size={15} /></Link>
      </section> : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section className={cardClass}>
          <SectionHeader title="Skills you’re building" action={<Link to="/skills" className="text-sm font-semibold text-primary">See all</Link>} />
          {skills.length ? <div className="space-y-4">{skills.slice(0, 5).map((skill) => {
            const current = skill.currentPercent ?? skill.currentLevel ?? 0
            const target = skill.targetPercent ?? skill.targetLevel ?? 100
            return <div key={skill.id || skill.name} className="min-w-0"><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium text-navy">{skill.skill || skill.name}</span><span className="shrink-0 text-muted">{current}% / {target}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, current)}%` }} /></div></div>
          })}</div> : <EmptyState title="Start with a skill assessment" description="Your proficiency snapshot will appear here when skills are assessed." />}
        </section>
        <section className={cardClass}>
          <SectionHeader title="Recent learning activity" action={<Link to="/notifications" className="text-sm font-semibold text-primary">View all</Link>} />
          {activity.length ? <ul className="space-y-3">{activity.map((item) => <li key={item.id} className="flex min-w-0 items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"><CheckCircle2 size={16} /></span><div className="min-w-0"><p className="text-sm font-medium text-navy">{item.title || item.message}</p><p className="mt-1 text-xs text-muted">{item.time}</p></div></li>)}</ul> : <EmptyState title="Your learning activity will show here" description="Course progress and assessments add to your recent activity." />}
          <Link to="/assessment" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ClipboardCheck size={16} /> Take a skill assessment <ArrowRight size={15} /></Link>
        </section>
      </div>
    </PageContainer>
  )
}
