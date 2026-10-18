import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, Clock3, FileText, History, PlayCircle, Sparkles, Target } from 'lucide-react'
import { apiRequest, extractData } from '../../api/client'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import SectionHeader from '../../components/common/SectionHeader'
import StatCard from '../../components/common/StatCard'
import { useApiData } from '../../hooks/useApiData'
import { useToast } from '../../context/ToastContext'

const cardClass = 'min-w-0 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5'

export default function QuizGenerator() {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState('Medium')
  const [type, setType] = useState('MCQ')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { push } = useToast()
  const { data: skillsData, loading: skillsLoading } = useApiData('/employees/me/skills', { initialData: { skills: [] } })
  const { data: videoItems = [], loading: videosLoading } = useApiData('/youtube-learning/items', { initialData: [] })
  const { data: quizPerformance, loading: performanceLoading } = useApiData('/quiz/performance', { initialData: null })
  const { data: quizHistoryData, loading: historyLoading } = useApiData('/quiz/history?limit=5', { initialData: { items: [], data: [] } })

  const skills = skillsData?.skills || []
  const topics = useMemo(() => {
    const values = [
      ...skills.map((skill) => skill.skill || skill.name),
      ...videoItems.flatMap((item) => item.resource?.skills || []),
      ...(quizPerformance?.weakTopics || []).map((row) => row.topic || row),
      ...(quizPerformance?.strengths || []).map((row) => row.topic || row),
    ]
    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
  }, [skills, videoItems, quizPerformance])
  const effectiveTopic = topic || topics[0] || ''
  const attempts = quizPerformance?.recentAttempts || []
  const history = quizHistoryData?.items || quizHistoryData?.data || []
  const average = Number(quizPerformance?.averageScore || 0)

  async function generate() {
    if (!effectiveTopic) {
      push('Add a skill or start a learning resource before generating a personalized quiz.', 'error')
      return
    }
    setLoading(true)
    try {
      const payload = await apiRequest('/quiz/generate', {
        method: 'POST',
        body: { topic: effectiveTopic, numberOfQuestions: Number(count), difficulty, questionType: type },
      })
      localStorage.setItem('skillbridge_current_quiz', JSON.stringify(extractData(payload)))
      push(`Practice quiz ready for ${effectiveTopic}`)
      navigate('/quiz')
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const dataLoading = skillsLoading || videosLoading || performanceLoading || historyLoading
  return (
    <PageContainer title="Practice Quizzes" subtitle="Practice the skills you are building and use your results to plan what to study next.">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Target} label="Skills to practice" value={topics.length} />
        <StatCard icon={BookOpenCheck} label="Quizzes completed" value={quizPerformance?.completedQuizzes ?? history.length} />
        <StatCard icon={Sparkles} label="Average quiz score" value={`${average}%`} />
        <Link to="/study-resources" className="block"><StatCard icon={FileText} label="Study resources" value="Browse" /></Link>
      </div>

      <section className={cardClass}>
        <SectionHeader title="Build a practice quiz" />
        <p className="-mt-3 mb-4 text-sm text-muted">Choose a topic from your skills and learning activity. Questions are generated for practice and your results are added to quiz analytics.</p>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,.85fr)]">
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-navy">
              Topic from your learning
              <select className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm" value={effectiveTopic} onChange={(event) => setTopic(event.target.value)} disabled={!topics.length}>
                {!topics.length ? <option value="">No skills or learning topics yet</option> : topics.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.slice(0, 8).map((value) => <button type="button" key={value} onClick={() => setTopic(value)} className={`rounded-full border px-3 py-1.5 text-xs transition ${effectiveTopic === value ? 'border-primary bg-indigo-50 font-semibold text-primary' : 'border-line bg-white text-slate-700 hover:border-primary/40'}`}>{value}</button>)}
            </div>
            {!dataLoading && topics.length === 0 ? <EmptyState title="Build your first practice topic" description="Add a skill in My Skills or start a video lesson. Your learning topics will appear here automatically." action={<Link to="/skills" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">Go to My Skills</Link>} /> : null}
            {dataLoading ? <Loading label="Finding topics from your learning activity..." /> : null}
          </div>
          <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="text-xs font-semibold text-navy">Number of questions
              <input type="number" min="1" max="20" className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm" value={count} onChange={(event) => setCount(event.target.value)} />
            </label>
            <label className="text-xs font-semibold text-navy">Difficulty
              <select className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select>
            </label>
            <label className="text-xs font-semibold text-navy sm:col-span-2 lg:col-span-1">Question type
              <select className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm" value={type} onChange={(event) => setType(event.target.value)}><option>MCQ</option><option>True/False</option></select>
            </label>
          </div>
        </div>
        <Button className="mt-5 w-full" onClick={generate} disabled={loading || dataLoading || !effectiveTopic}>
          {loading ? 'Generating your quiz...' : <>Generate practice quiz <ArrowRight size={16} /></>}
        </Button>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
        <section className={cardClass}>
          <SectionHeader title="Your quiz insights" action={<Link to="/analytics" className="text-sm font-semibold text-primary">View analytics <ArrowRight className="inline" size={14} /></Link>} />
          {quizPerformance?.completedQuizzes ? <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-indigo-50 p-4"><p className="text-xs text-muted">Average score</p><p className="mt-1 text-2xl font-bold text-primary">{quizPerformance.averageScore}%</p><p className="text-xs text-muted">Across {quizPerformance.completedQuizzes} completed quizzes</p></div>
            <div><h3 className="text-sm font-semibold text-navy">Suggested focus</h3>{quizPerformance.weakTopics?.length ? <ul className="mt-2 space-y-2">{quizPerformance.weakTopics.slice(0, 3).map((row) => <li key={row.topic} className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm"><span className="font-medium text-navy">{row.topic}</span><span className="text-xs text-amber-800">{row.percentage}%</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">Keep practicing to discover your focus topics.</p>}</div>
          </div> : <EmptyState title="Your quiz progress starts here" description="Complete a video quiz or generate a practice quiz to see scores and suggested topics." />}
        </section>
        <section className={`${cardClass} bg-blue-50/70`}>
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary"><FileText size={19} /></span><div><h2 className="font-semibold text-navy">Study from your materials</h2><p className="text-xs text-muted">Use your existing study tools</p></div></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Open published notes in Study Resources, or ask the AI Tutor questions about your uploaded documents. Topic quizzes use your skill and learning topics.</p>
          <div className="mt-4 flex flex-wrap gap-2"><Link to="/study-resources" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-primary"><FileText size={15} /> Study Resources</Link><Link to="/assistant" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-primary"><Sparkles size={15} /> AI Tutor</Link></div>
        </section>
      </div>

      <section className={cardClass}>
        <SectionHeader title="Continue learning and practice" action={<Link to="/learning-path" className="text-sm font-semibold text-primary">Open learning path <ArrowRight className="inline" size={14} /></Link>} />
        {videoItems.length ? <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">{videoItems.slice(0, 3).map((item) => <article key={item._id} className="overflow-hidden rounded-xl border border-line"><Link to={`/youtube-learning/items/${item._id}`}><img src={item.resource?.thumbnailUrl} alt="" className="aspect-video w-full bg-slate-100 object-cover" /></Link><div className="p-3"><h3 className="line-clamp-2 text-sm font-semibold text-navy">{item.resource?.title || 'Video lesson'}</h3><p className="mt-1 text-xs text-muted">{item.status || 'Not started'}{item.resource?.skills?.length ? ` · ${item.resource.skills.slice(0, 2).join(', ')}` : ''}</p><div className="mt-3 flex flex-wrap gap-2"><Link to={`/youtube-learning/items/${item._id}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line px-3 text-xs font-semibold text-navy"><PlayCircle size={14} /> Open lesson</Link><Link to={`/youtube-learning/items/${item._id}/quiz`} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-white">Take lesson quiz <ArrowRight size={13} /></Link></div></div></article>)}</div> : <EmptyState title="No lessons in your learning path yet" description="Choose a video from the Video Library and it will be available here for lesson quizzes." action={<Link to="/youtube-learning" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">Browse Video Library</Link>} />}
      </section>

      <section className={cardClass}>
        <SectionHeader title="Recent quiz attempts" action={<Link to="/analytics" className="text-sm font-semibold text-primary">Full history <ArrowRight className="inline" size={14} /></Link>} />
        {history.length ? <div className="divide-y divide-line">{history.slice(0, 5).map((attempt, index) => <div key={attempt._id || attempt.id || index} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-primary"><History size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-navy">{attempt.quizId?.title || attempt.title || attempt.topic || 'Practice quiz'}</p><p className="mt-0.5 text-xs text-muted">{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : 'Completed'}{attempt.total ? ` · ${attempt.score ?? 0}/${attempt.total}` : ''}</p></div></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{attempt.percentage ?? (attempt.total ? Math.round((attempt.score || 0) / attempt.total * 100) : 0)}%</span></div>)}</div> : <EmptyState title="No completed quizzes yet" description="Your generated and lesson quiz attempts will appear here." />}
      </section>
    </PageContainer>
  )
}
