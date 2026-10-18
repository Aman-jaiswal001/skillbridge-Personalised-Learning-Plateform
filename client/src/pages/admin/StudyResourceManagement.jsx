import { useState } from 'react'
import { apiRequest, apiRequestBlob } from '../../api/client'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

const blank = { title: '', description: '', type: 'pdf', subject: '', course: '', year: '', semester: '', tags: '', language: 'English', url: '', source: '', isPublished: false }

export default function StudyResourceManagement() {
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState('')
  const { push } = useToast()

  const { data: items = [], loading, error, reload } = useApiData('/study-resources?admin=true&limit=50', { initialData: [] })

  function change(key, value) { setForm((current) => ({ ...current, [key]: value })) }
  function reset() { setEditing(''); setFile(null); setForm(blank) }
  function edit(resource) {
    setEditing(resource._id); setFile(null)
    setForm({ ...blank, ...resource, tags: resource.tags?.join(', ') || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit(event) {
    event.preventDefault()
    if (!editing && form.type === 'pdf' && !file) { push('Choose a PDF file to upload.', 'error'); return }
    if (form.type === 'link' && !form.url.trim()) { push('Enter an external HTTP or HTTPS link.', 'error'); return }
    setSaving(true)
    const body = new FormData()
    for (const [key, value] of Object.entries(form)) body.append(key, key === 'tags' ? value.split(',').map((tag) => tag.trim()).filter(Boolean).join(',') : String(value))
    if (file) body.append('file', file)
    try {
      await apiRequest(editing ? `/study-resources/${editing}` : '/study-resources', { method: editing ? 'PUT' : 'POST', body })
      push(editing ? 'Study resource updated' : 'Study resource created')
      reset(); await reload()
    } catch (err) { push(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function toggle(resource) {
    setBusy(resource._id)
    const body = new FormData()
    for (const [key, value] of Object.entries({ ...resource, isPublished: !resource.isPublished, tags: (resource.tags || []).join(',') })) if (value !== undefined && value !== null) body.append(key, String(value))
    try { await apiRequest(`/study-resources/${resource._id}`, { method: 'PUT', body }); push(resource.isPublished ? 'Resource unpublished' : 'Resource published'); await reload() }
    catch (err) { push(err.message, 'error') }
    finally { setBusy('') }
  }

  async function remove(resource) {
    if (!window.confirm(`Delete “${resource.title}”?`)) return
    setBusy(resource._id)
    try { await apiRequest(`/study-resources/${resource._id}`, { method: 'DELETE' }); push('Study resource deleted'); await reload() }
    catch (err) { push(err.message, 'error') }
    finally { setBusy('') }
  }

  async function preview(resource) {
    const tab = window.open('about:blank', '_blank')
    try { const blob = await apiRequestBlob(`/study-resources/${resource._id}/file`); const url = URL.createObjectURL(blob); if (tab) tab.location.href = url; else throw new Error('Allow pop-ups to preview this PDF.'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000) }
    catch (err) { tab?.close(); push(err.message, 'error') }
  }

  return <PageContainer title="Study Resource Management" subtitle="Publish PDF study materials and trusted external resources">
    <form onSubmit={submit} className="grid min-w-0 gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Resource title<input required maxLength={200} value={form.title} onChange={(e) => change('title', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium">Resource type<select value={form.type} onChange={(e) => { change('type', e.target.value); if (e.target.value !== 'pdf') setFile(null) }} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"><option value="pdf">PDF document</option><option value="link">External link</option></select></label>
      <label className="text-sm font-medium">Subject / category<input required value={form.subject} onChange={(e) => change('subject', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium">Course / program<input required placeholder="e.g. BCA" value={form.course} onChange={(e) => change('course', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium">Year<input required placeholder="e.g. 3rd Year" value={form.year} onChange={(e) => change('year', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium">Semester (optional)<input value={form.semester} onChange={(e) => change('semester', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium">Skill / topic tags (comma separated)<input value={form.tags} onChange={(e) => change('tags', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium">Language<input value={form.language} onChange={(e) => change('language', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      {form.type === 'pdf' ? <label className="text-sm font-medium sm:col-span-2">PDF file{editing ? <span className="ml-1 font-normal text-muted">(leave blank to keep current file)</span> : null}<input type="file" accept="application/pdf,.pdf" required={!editing} onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary" /></label> : <label className="text-sm font-medium sm:col-span-2">External URL<input required type="url" value={form.url} onChange={(e) => change('url', e.target.value)} placeholder="https://docs.python.org/3/" className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>}
      <label className="text-sm font-medium sm:col-span-2">Short description<textarea rows="3" maxLength={2000} value={form.description} onChange={(e) => change('description', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium sm:col-span-2">Source / author / attribution (optional)<input value={form.source} onChange={(e) => change('source', e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.isPublished} onChange={(e) => change('isPublished', e.target.checked)} />Publish for students</label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Resource'}</Button>{editing ? <Button type="button" variant="secondary" onClick={reset}>Cancel Edit</Button> : null}</div>
    </form>
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-navy">Resources</h2><Button variant="secondary" onClick={reload}>Refresh</Button></div>
    {loading ? <Loading label="Loading resources..." /> : null}
    {error ? <EmptyState title="Couldn't load resources" description={error} action={<Button variant="secondary" onClick={reload}>Try again</Button>} /> : null}
    {!loading && !error && items.length ? <div className="space-y-3">{items.map((resource) => <article key={resource._id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge>{resource.type === 'pdf' ? 'PDF' : 'External link'}</Badge><Badge status={resource.isPublished ? 'Completed' : 'Not Started'}>{resource.isPublished ? 'Published' : 'Draft'}</Badge></div><h3 className="mt-2 break-words font-semibold text-navy">{resource.title}</h3><p className="text-sm text-muted">{resource.course} · {resource.year}{resource.semester ? ` · ${resource.semester}` : ''} · {resource.subject}</p>{resource.type === 'pdf' ? <p className="text-xs text-muted">{resource.fileName} · {formatSize(resource.fileSize)}</p> : <p className="break-all text-xs text-primary">{domainOf(resource.url)}</p>}</div><div className="flex flex-wrap gap-2">{resource.type === 'pdf' ? <Button variant="secondary" onClick={() => preview(resource)}>Preview</Button> : null}<Button variant="secondary" onClick={() => edit(resource)}>Edit</Button><Button variant="secondary" disabled={busy === resource._id} onClick={() => toggle(resource)}>{resource.isPublished ? 'Unpublish' : 'Publish'}</Button><Button variant="danger" disabled={busy === resource._id} onClick={() => remove(resource)}>Delete</Button></div></article>)}</div> : null}
    {!loading && !error && !items.length ? <EmptyState title="No study resources yet" description="Add a PDF or external documentation link above." /> : null}
  </PageContainer>
}

function domainOf(value = '') { try { return new URL(value).hostname.replace(/^www\./, '') } catch { return '' } }
function formatSize(bytes = 0) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB` }
