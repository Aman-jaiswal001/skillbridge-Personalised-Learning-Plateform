import { useCallback, useState } from 'react'
import { apiRequestBlob } from '../../api/client'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useApiData } from '../../hooks/useApiData'
import { useToast } from '../../context/ToastContext'

const emptyFilters = { search: '', course: '', year: '', semester: '', subject: '', type: '', skill: '', language: '' }

export default function StudyResources() {
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState('')
  const { push } = useToast()
  const params = new URLSearchParams({ page: String(page), limit: '12', sort: 'newest' })
  Object.entries(applied).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()) })
  const path = `/study-resources?${params}`
  const map = useCallback((data, payload) => ({ items: data || [], pagination: payload.pagination || { page: 1, pages: 1, total: 0 } }), [])
  const { data: result, loading, error, reload } = useApiData(path, { initialData: { items: [], pagination: { page: 1, pages: 1, total: 0 } }, map })
  const items = result?.items || []
  const pagination = result?.pagination || { page: 1, pages: 1, total: 0 }

  function applyFilters(event) { event.preventDefault(); setPage(1); setApplied({ ...filters }) }

  async function openPdf(resource, download = false) {
    setBusy(`${resource._id}-${download ? 'download' : 'open'}`)
    const tab = download ? null : window.open('about:blank', '_blank')
    try {
      const blob = await apiRequestBlob(`/study-resources/${resource._id}/file${download ? '?download=true' : ''}`)
      const objectUrl = URL.createObjectURL(blob)
      if (download) {
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = resource.fileName || 'study-resource.pdf'
        anchor.click()
      } else if (tab) tab.location.href = objectUrl
      else throw new Error('Allow pop-ups to preview the PDF, or use Download PDF.')
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (err) { tab?.close(); push(err.message, 'error') }
    finally { setBusy('') }
  }

  return <PageContainer title="Documentation & Study Resources" subtitle="Study notes, practical files, references, and external learning materials">
    <form onSubmit={applyFilters} className="grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      <input aria-label="Search resources" placeholder="Search resources" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm" />
      <input aria-label="Filter by course" placeholder="Course / program" value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })} className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm" />
      <input aria-label="Filter by year" placeholder="Academic year" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm" />
      <input aria-label="Filter by semester" placeholder="Semester" value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })} className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm" />
      <input aria-label="Filter by subject" placeholder="Subject" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm" />
      <select aria-label="Filter by type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm"><option value="">All resource types</option><option value="pdf">PDF</option><option value="link">External link</option></select>
      <input aria-label="Filter by skill" placeholder="Skill / topic" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })} className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm" />
      <input aria-label="Filter by language" placeholder="Language" value={filters.language} onChange={(e) => setFilters({ ...filters, language: e.target.value })} className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm" />
      <div className="flex gap-2 lg:col-span-4"><Button type="submit">Apply Filters</Button><Button type="button" variant="secondary" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(1) }}>Clear</Button></div>
    </form>
    {loading ? <Loading label="Loading study resources..." /> : null}
    {error ? <EmptyState title="Couldn't load study resources" description={error} action={<Button variant="secondary" onClick={reload}>Try again</Button>} /> : null}
    {!loading && !error && items.length ? <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((resource) => {
      let domain = ''
      if (resource.type === 'link') { try { domain = new URL(resource.url).hostname.replace(/^www\./, '') } catch { domain = '' } }
      return <article key={resource._id} className="flex min-w-0 flex-col rounded-xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2"><Badge>{resource.type === 'pdf' ? 'PDF' : 'External link'}</Badge><Badge>{resource.language}</Badge></div>
        <h2 className="mt-3 break-words font-semibold text-navy">{resource.title}</h2>
        <p className="mt-1 line-clamp-3 text-sm text-muted">{resource.description || 'No description provided.'}</p>
        <p className="mt-3 text-sm font-medium text-slate-700">{resource.course} · {resource.year}{resource.semester ? ` · ${resource.semester}` : ''}</p>
        <p className="text-sm text-slate-600">{resource.subject}</p>
        {resource.source ? <p className="mt-1 break-words text-xs text-muted">Source: {resource.source}</p> : null}
        {domain ? <p className="mt-1 break-all text-xs text-primary">{domain}</p> : null}
        <div className="mt-3 flex flex-wrap gap-1.5">{(resource.tags || []).map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">{resource.type === 'pdf' ? <><Button disabled={busy === `${resource._id}-open`} onClick={() => openPdf(resource)}>{busy === `${resource._id}-open` ? 'Opening...' : 'Preview PDF'}</Button><Button variant="secondary" disabled={busy === `${resource._id}-download`} onClick={() => openPdf(resource, true)}>{busy === `${resource._id}-download` ? 'Downloading...' : 'Download PDF'}</Button><span className="self-center text-xs text-muted">{resource.fileName} · {formatSize(resource.fileSize)}</span></> : <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">Open Resource</a>}</div>
      </article>
    })}</div> : null}
    {!loading && !error && !items.length ? <EmptyState title="No study resources found" description={pagination.total ? 'Try a different page or change your filters.' : 'Published study materials and links will appear here.'} /> : null}
    {pagination.pages > 1 ? <div className="flex items-center justify-center gap-3"><Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-muted">Page {page} of {pagination.pages}</span><Button variant="secondary" disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div> : null}
  </PageContainer>
}

function formatSize(bytes = 0) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB` }
