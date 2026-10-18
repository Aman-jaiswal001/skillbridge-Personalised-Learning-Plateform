import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, apiRequestBlob } from '../../api/client'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const levels = ['Beginner', 'Intermediate', 'Advanced']

export default function BulkAssessmentUpload() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [targetId, setTargetId] = useState('')
  const [settings, setSettings] = useState({ title: '', category: '', level: 'Intermediate', duration: 30, description: '', allowRetakes: true, published: false })
  const [requestId, setRequestId] = useState(makeRequestId())
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState('')
  const [confirming, setConfirming] = useState(false)
  const { push } = useToast()
  const { data: assessments = [], loading: assessmentsLoading, error: assessmentsError, reload } = useApiData('/admin/assessments', { initialData: [] })
  const activeAssessments = assessments.filter((assessment) => assessment.isActive)

  function chooseFile(nextFile) {
    setPreview(null)
    setResult(null)
    if (!nextFile) return setFile(null)
    if (!nextFile.name.toLowerCase().endsWith('.xlsx')) { setFile(null); push('Only .xlsx files are supported.', 'error'); return }
    if (nextFile.size > MAX_FILE_SIZE) { setFile(null); push('Spreadsheet must be 5 MB or smaller.', 'error'); return }
    setFile(nextFile)
    setRequestId(makeRequestId())
  }

  function changeTarget(value) {
    setTargetId(value)
    setPreview(null)
    setResult(null)
    setRequestId(makeRequestId())
  }

  function changeSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }))
    setPreview(null)
    setResult(null)
    setRequestId(makeRequestId())
  }

  async function downloadTemplate() {
    setBusy('template')
    try {
      const blob = await apiRequestBlob('/admin/assessments/import/template')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'skillbridge-assessment-template.xlsx'
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) { push(err.message, 'error') }
    finally { setBusy('') }
  }

  async function parseFile() {
    if (!file) return push('Choose a spreadsheet first.', 'error')
    setBusy('preview')
    const body = new FormData()
    body.append('file', file)
    try {
      const payload = await apiRequest('/admin/assessments/import/preview', { method: 'POST', body })
      setPreview(payload.data)
      push(payload.data.validQuestions ? 'Spreadsheet preview is ready.' : 'No valid questions found; review the row errors.', payload.data.validQuestions ? 'success' : 'error')
    } catch (err) { push(err.message, 'error') }
    finally { setBusy('') }
  }

  async function importFile() {
    setBusy('import')
    const body = new FormData()
    body.append('file', file)
    body.append('requestId', requestId)
    if (targetId) {
      body.append('assessmentId', targetId)
      body.append('level', activeAssessments.find((assessment) => assessment._id === targetId)?.level || 'Intermediate')
    }
    else {
      body.append('title', settings.title)
      body.append('category', settings.category)
      body.append('level', settings.level)
      body.append('duration', String(settings.duration))
      body.append('description', settings.description)
      body.append('allowRetakes', String(settings.allowRetakes))
      body.append('published', String(settings.published))
    }
    try {
      const payload = await apiRequest('/admin/assessments/import', { method: 'POST', body })
      setResult(payload.data)
      setPreview(null)
      setConfirming(false)
      push(payload.data.duplicateRequest ? 'This import was already completed; no duplicate questions were added.' : `Imported ${payload.data.importedQuestions} questions.`)
      await reload()
    } catch (err) { push(err.message, 'error'); setConfirming(false) }
    finally { setBusy('') }
  }

  function downloadErrorReport() {
    const errors = result?.errors || preview?.errors || []
    if (!errors.length) return
    const csv = ['row,column,message', ...errors.map((item) => [item.row, item.column, item.message].map(csvCell).join(','))].join('\r\n')
    downloadText(csv, 'assessment-import-errors.csv', 'text/csv;charset=utf-8')
  }

  const newAssessment = !targetId
  const summary = result || preview

  return <PageContainer title="Bulk Assessment Upload" subtitle="Validate an Excel worksheet, preview MCQs, then append them or create a new assessment." actions={<Link to="/admin/assessments"><Button variant="secondary">Back to Assessments</Button></Link>}>
    <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy">Step 1 · Prepare your workbook</h2><p className="text-sm text-muted">Download the template and fill one MCQ per row.</p></div><Button variant="secondary" disabled={busy === 'template'} onClick={downloadTemplate}>{busy === 'template' ? 'Preparing...' : 'Download Excel Template'}</Button></div>
      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Required columns: <code>questionText</code>, <code>optionA</code>–<code>optionD</code>, and <code>correctAnswer</code>. Optional columns: explanation, skill, level, marks. The importer also accepts legacy difficulty values.</p>
    </section>

    <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-navy">Step 2 · Select a target assessment</h2>
      {assessmentsError ? <p role="alert" className="text-sm text-rose-700">{assessmentsError}</p> : null}
      {assessmentsLoading ? <Loading label="Loading assessments..." /> : null}
      <label className="block max-w-2xl text-sm font-medium text-navy">Import questions into<select aria-label="Target assessment" value={targetId} onChange={(event) => changeTarget(event.target.value)} className={inputClass}><option value="">Create a new assessment</option>{activeAssessments.map((assessment) => <option key={assessment._id} value={assessment._id}>{assessment.title} · {assessment.category} · {assessment.isPublished ? 'Published' : 'Draft'}</option>)}</select></label>
      {newAssessment ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Assessment title"><input required value={settings.title} onChange={(event) => changeSetting('title', event.target.value)} className={inputClass} maxLength={160} /></Field><Field label="Topic / category"><input required value={settings.category} onChange={(event) => changeSetting('category', event.target.value)} className={inputClass} maxLength={120} /></Field><Field label="Progression level"><select value={settings.level} onChange={(event) => changeSetting('level', event.target.value)} className={inputClass}>{levels.map((level) => <option key={level}>{level}</option>)}</select></Field><Field label="Duration (minutes)"><input type="number" min="1" max="300" value={settings.duration} onChange={(event) => changeSetting('duration', event.target.value)} className={inputClass} /></Field><Field label="Description"><input value={settings.description} onChange={(event) => changeSetting('description', event.target.value)} className={inputClass} maxLength={2000} /></Field><div className="flex flex-col justify-end gap-2 pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.allowRetakes} onChange={(event) => changeSetting('allowRetakes', event.target.checked)} />Allow retakes</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.published} onChange={(event) => changeSetting('published', event.target.checked)} />Publish after import</label></div></div> : <p className="text-sm text-muted">Questions will be appended. Existing questions and results are preserved; duplicate question text is skipped.</p>}
    </section>

    <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-navy">Step 3 · Upload and preview</h2>
      <div onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]) }} className={`rounded-xl border-2 border-dashed p-7 text-center transition ${dragging ? 'border-primary bg-blue-50' : 'border-line bg-slate-50'}`}>
        <p className="font-medium text-navy">Drag and drop an .xlsx file here</p><p className="mt-1 text-sm text-muted">Maximum size 5 MB · up to 1,000 question rows</p>
        <input ref={inputRef} className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Choose Excel workbook" onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = '' }} />
        <Button className="mt-4" variant="secondary" onClick={() => inputRef.current?.click()}>Browse files</Button>
      </div>
      {file ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm"><span className="break-all font-medium text-navy">{file.name}</span><span className="text-muted">{formatSize(file.size)}</span><Button variant="ghost" onClick={() => { setFile(null); setPreview(null); setResult(null) }}>Remove file</Button></div> : null}
      <div className="flex flex-wrap gap-2"><Button disabled={!file || busy === 'preview' || busy === 'import'} onClick={parseFile}>{busy === 'preview' ? 'Validating workbook...' : 'Validate and Preview'}</Button>{preview?.validQuestions ? <Button variant="secondary" disabled={busy === 'import'} onClick={() => setConfirming(true)}>Import {preview.validQuestions} valid questions</Button> : null}</div>
    </section>

    {summary ? <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy">{result ? 'Import report' : 'Step 4 · Review questions'}</h2><p className="text-sm text-muted">{result?.assessmentTitle ? `Assessment: ${result.assessmentTitle}` : 'Review valid, invalid, duplicate, and blank rows before importing.'}</p></div>{(summary.errors || []).length ? <Button variant="secondary" onClick={downloadErrorReport}>Download error report CSV</Button> : null}</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[['Total rows', summary.totalRows], ['Valid questions', summary.validQuestions], ['Imported questions', summary.importedQuestions ?? '—'], ['Skipped rows', summary.skippedRows]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-semibold text-navy">{value}</p></div>)}</div>
      {summary.headerErrors?.length ? <ErrorList errors={summary.headerErrors} /> : null}
      {summary.errors?.length ? <ErrorList errors={summary.errors} /> : null}
      {summary.preview?.length || summary.rows?.length ? <div className="overflow-x-auto rounded-lg border border-line"><table className="min-w-[1050px] border-collapse text-left text-xs"><thead className="bg-slate-50 text-muted"><tr>{['Excel row', 'Status', 'Question', 'Choices', 'Answer', 'Progression level', 'Marks', 'Details'].map((heading) => <th key={heading} className="border-b border-line px-3 py-2 font-semibold">{heading}</th>)}</tr></thead><tbody>{(summary.preview || summary.rows).map((row) => <tr key={row.row} className="align-top"><td className="border-b border-line px-3 py-2">{row.row}</td><td className="border-b border-line px-3 py-2"><Badge status={row.status === 'valid' || row.status === 'imported' ? 'Completed' : row.status === 'duplicate' ? 'In Progress' : 'Not Started'}>{row.status}</Badge></td><td className="max-w-xs whitespace-normal border-b border-line px-3 py-2">{row.question || '—'}</td><td className="max-w-xs whitespace-normal border-b border-line px-3 py-2">{(row.options || []).map((option, index) => <p key={index}>{String.fromCharCode(65 + index)}. {option}</p>)}</td><td className="border-b border-line px-3 py-2">{row.correctAnswer || '—'}</td><td className="border-b border-line px-3 py-2">{row.level || '—'}</td><td className="border-b border-line px-3 py-2">{row.marks ?? '—'}</td><td className="max-w-sm whitespace-normal border-b border-line px-3 py-2 text-rose-700">{row.error || '—'}</td></tr>)}</tbody></table></div> : null}
      {result ? <div className="flex flex-wrap gap-2"><Link to="/admin/assessments"><Button>Return to Assessment Management</Button></Link><Button variant="secondary" onClick={() => { setResult(null); setFile(null); setPreview(null); setRequestId(makeRequestId()) }}>Import another spreadsheet</Button></div> : null}
    </section> : null}

    <Modal open={confirming} title="Confirm question import" onClose={() => busy === 'import' ? null : setConfirming(false)} footer={<><Button variant="secondary" disabled={busy === 'import'} onClick={() => setConfirming(false)}>Review again</Button><Button disabled={busy === 'import'} onClick={importFile}>{busy === 'import' ? 'Importing...' : `Import ${preview?.validQuestions || 0} questions`}</Button></>}><p className="text-sm text-muted">{preview?.validQuestions} valid questions will be added to {targetId ? 'the selected assessment' : `a new ${settings.published ? 'published' : 'draft'} assessment`}. {preview?.skippedRows ? `${preview.skippedRows} invalid, duplicate, or blank rows will be skipped.` : ''}</p></Modal>
  </PageContainer>
}

function ErrorList({ errors }) { return <div className="max-h-48 overflow-auto rounded-lg border border-amber-200 bg-amber-50 p-3"><h3 className="text-sm font-semibold text-amber-950">Validation issues</h3><ul className="mt-2 space-y-1 text-xs text-amber-900">{errors.slice(0, 200).map((error, index) => <li key={`${error.row}-${error.column}-${index}`}>Row {error.row || 1} · {error.column}: {error.message}</li>)}</ul>{errors.length > 200 ? <p className="mt-2 text-xs">Showing first 200 issues; download the CSV for all.</p> : null}</div> }
function Field({ label, children }) { return <label className="block text-xs font-medium text-muted">{label}<span className="mt-1 block">{children}</span></label> }
const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15'
function makeRequestId() { return globalThis.crypto?.randomUUID?.() || `assessment-import-${Date.now()}-${Math.random().toString(36).slice(2)}` }
function formatSize(size) { return size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB` }
function csvCell(value) { const text = String(value ?? '').replaceAll('"', '""'); return `"${/^[=+\-@\t\r]/.test(text) ? `'${text}` : text}"` }
function downloadText(text, filename, type) { const url = URL.createObjectURL(new Blob([text], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url) }
