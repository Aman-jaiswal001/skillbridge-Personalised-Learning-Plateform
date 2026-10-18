import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../../api/client'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

export default function YouTubeLesson() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { push } = useToast()
  const { data: item, loading, error, reload } = useApiData(`/youtube-learning/items/${itemId}`)
  const video = item?.resource

  async function complete() {
    try { await apiRequest(`/youtube-learning/items/${itemId}`, { method: 'PATCH', body: { status: 'Completed' } }); await reload(); push('Marked as completed') }
    catch (err) { push(err.message, 'error') }
  }
  async function remove() {
    if (!window.confirm('Remove this video from your learning path?')) return
    try { await apiRequest(`/youtube-learning/items/${itemId}`, { method: 'DELETE' }); push('Removed from your learning path'); navigate('/learning-path') }
    catch (err) { push(err.message, 'error') }
  }

  if (loading) return <Loading label="Loading lesson..." />
  if (error || !video) return <EmptyState title="Lesson unavailable" description={error || 'This learning item could not be found.'} action={<Link to="/learning-path"><Button variant="secondary">Back to Learning Path</Button></Link>} />
  return <PageContainer title={video.title} subtitle={`${video.category}${video.instructor ? ` · ${video.instructor}` : ''}`} actions={<Link to="/learning-path"><Button variant="secondary">My Learning Path</Button></Link>}>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 space-y-4">
        <div className="aspect-video overflow-hidden rounded-xl bg-black"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${encodeURIComponent(video.videoId)}?rel=0`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
        <p className="text-sm leading-6 text-slate-700">{video.description || 'No description provided.'}</p>
        <div className="flex flex-wrap gap-2"><Badge>{video.difficulty}</Badge><Badge>{video.duration || 'Video lesson'}</Badge><Badge>{video.language}</Badge><Badge status={item.status} /></div>
        <div className="flex flex-wrap gap-2"><Button onClick={complete} disabled={item.status === 'Completed'}>{item.status === 'Completed' ? 'Completed' : 'Mark as Completed'}</Button><Button variant="secondary" onClick={remove}>Remove from Path</Button></div>
        <Link to={`/youtube-learning/items/${itemId}/quiz`}><Button variant="secondary">Take Quiz</Button></Link>
      </section>
      <aside className="h-fit space-y-4 rounded-xl border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">Learning details</h2>
        {video.objectives?.length ? <div><h3 className="text-sm font-semibold">Learning objectives</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{video.objectives.map((value) => <li key={value}>{value}</li>)}</ul></div> : null}
        {video.subtopics?.length ? <div><h3 className="text-sm font-semibold">Subtopics</h3><p className="mt-1 text-sm text-slate-600">{video.subtopics.join(', ')}</p></div> : null}
        {video.prerequisites?.length ? <div><h3 className="text-sm font-semibold">Prerequisites</h3><p className="mt-1 text-sm text-slate-600">{video.prerequisites.join(', ')}</p></div> : null}
        <p className="text-xs text-muted">Last accessed: {item.lastAccessedAt ? new Date(item.lastAccessedAt).toLocaleString() : 'Just now'}</p>
        <p className="text-xs text-muted">If this video is private, unavailable, or embedding is disabled, YouTube will show that on the player.</p>
      </aside>
    </div>
  </PageContainer>
}
