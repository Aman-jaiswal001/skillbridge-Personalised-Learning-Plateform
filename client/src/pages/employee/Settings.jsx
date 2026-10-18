import { useEffect, useMemo, useRef, useState } from 'react'
import { Award, Bell, BookOpen, BriefcaseBusiness, Camera, ChartNoAxesColumnIncreasing, Check, CircleUserRound, GraduationCap, LockKeyhole, MapPin, Save, Settings as SettingsIcon, ShieldCheck, Sparkles, Target, Upload, UserRound, Users } from 'lucide-react'
import { apiRequest, extractData, setSession } from '../../api/client'
import avatarFallback from '../../assets/images/avatar.png'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

const tabs = [
  { label: 'Profile Information', icon: UserRound },
  { label: 'Preferences', icon: SettingsIcon },
  { label: 'Notifications', icon: Bell },
  { label: 'Security', icon: ShieldCheck },
  { label: 'AI Preferences', icon: Sparkles },
]
const empty = { name: '', email: '', department: '', designation: '', phone: '', location: '', careerGoal: '' }
const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500'

export default function Settings() {
  const [tab, setTab] = useState(tabs[0].label)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInput = useRef(null)
  const { token, setUser, user } = useAuth()
  const { push } = useToast()
  const { data, loading, reload } = useApiData('/employees/me')
  const { data: analytics } = useApiData('/analytics/employee', { initialData: null })

  useEffect(() => {
    if (!data) return
    setForm({
      name: data.user?.name || '',
      email: data.user?.email || '',
      department: data.user?.department || data.profile?.department || '',
      designation: data.user?.designation || data.profile?.designation || '',
      phone: data.user?.phone || '',
      location: data.profile?.location || '',
      careerGoal: data.profile?.careerGoal || '',
    })
  }, [data])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = await apiRequest('/employees/me', {
        method: 'PUT',
        body: {
          name: form.name,
          department: form.department,
          designation: form.designation,
          phone: form.phone,
          location: form.location,
          careerGoal: form.careerGoal,
        },
      })
      const nextUser = extractData(payload).user
      setUser(nextUser)
      setSession({ token, user: nextUser })
      push('Profile changes saved')
      await reload()
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      push('Choose a JPG, PNG, or WebP image', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      push('Profile photos must be 5 MB or smaller', 'error')
      return
    }
    setUploadingPhoto(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const payload = await apiRequest('/employees/me/photo', { method: 'POST', body })
      const nextUser = extractData(payload)
      setUser(nextUser)
      setSession({ token, user: nextUser })
      await reload()
      push('Profile photo updated')
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const photoUrl = data?.user?.profilePhotoUrl || user?.profilePhotoUrl || ''
  const stats = data?.stats || {}
  const profileCompletion = useMemo(() => {
    const checks = [Boolean(form.name), Boolean(form.email), Boolean(form.department), Boolean(form.designation), Boolean(form.careerGoal), Boolean(data?.stats?.skillsAnalysed), Boolean(photoUrl)]
    return Math.round(checks.filter(Boolean).length / checks.length * 100)
  }, [data?.stats?.skillsAnalysed, form, photoUrl])

  if (loading && !data) return <Loading label="Loading profile..." />

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#e8f0ff] via-[#e9edff] to-[#bfe8ff] p-5 shadow-sm sm:p-7">
      <div className="absolute -right-8 -top-20 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <img src={photoUrl || avatarFallback} alt={`${form.name || 'User'} profile`} className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md sm:h-28 sm:w-28" />
          <button type="button" onClick={() => photoInput.current?.click()} disabled={uploadingPhoto} aria-label="Upload profile photo" className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:opacity-60"><Camera size={16} /></button>
          <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={uploadPhoto} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-extrabold tracking-tight text-[#132044] sm:text-3xl">{form.name || 'Your Profile'}</h1><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/70 text-slate-600"><CircleUserRound size={17} /></span></div>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-3 py-1 text-xs font-semibold text-blue-800"><GraduationCap size={15} /> {user?.role === 'ADMIN' ? 'Administrator' : 'Student'}</p>
          <p className="mt-2 text-sm text-slate-600">{[form.department, form.designation].filter(Boolean).join(' · ') || 'Add your department and designation'}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><MapPin size={14} />{form.location || 'Add your location'}</span><span className="inline-flex items-center gap-1.5"><span className="font-semibold">@</span>{form.email}</span><span className="inline-flex items-center gap-1.5"><BriefcaseBusiness size={14} />Joined {data?.user?.createdAt ? new Date(data.user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'SkillBridge'}</span></div>
        </div>
        <button type="button" onClick={() => photoInput.current?.click()} disabled={uploadingPhoto} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:opacity-60"><Upload size={16} />{uploadingPhoto ? 'Uploading photo...' : 'Change Profile Photo'}</button>
      </div>
    </section>

    <div><h2 className="text-2xl font-extrabold tracking-tight text-[#142144]">My Profile &amp; Settings</h2><p className="mt-1 text-sm text-slate-500">Manage your personal information and learning preferences</p></div>

    <div className="grid items-start gap-4 xl:grid-cols-[185px_minmax(0,1fr)_260px]">
      <nav aria-label="Profile settings" className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-sm xl:flex-col">
        {tabs.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => setTab(label)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${tab === label ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={17} />{label}</button>)}
      </nav>

      <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        {tab === 'Profile Information' ? <>
          <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><UserRound size={20} /></span><div><h3 className="font-bold text-[#172344]">Profile Information</h3><p className="mt-0.5 text-xs text-slate-500">Update your personal and academic information</p></div></div>
          <form className="grid gap-x-4 gap-y-4 sm:grid-cols-2" onSubmit={saveProfile}>
            {Object.entries({ 'Full Name': 'name', Email: 'email', Department: 'department', Designation: 'designation', 'Phone Number': 'phone', Location: 'location', 'Career Goal': 'careerGoal' }).map(([label, key]) => <label key={key} className={`text-xs font-semibold text-slate-700 ${key === 'careerGoal' ? 'sm:col-span-2' : ''}`}>
              {label}
              {key === 'careerGoal' ? <select className={inputClass} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}><option value="">Choose a career goal</option>{[form[key], 'Become a Full Stack Developer', 'Become an AI Engineer', 'Grow into a Data Analyst', 'Advance into a Leadership Role'].filter((value, index, list) => value && list.indexOf(value) === index).map((value) => <option key={value}>{value}</option>)}</select> : <input className={inputClass} value={form[key]} disabled={key === 'email'} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={key === 'phone' ? 'Add a contact number' : key === 'location' ? 'City, Country' : ''} />}
            </label>)}
            <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={saving} className="h-11 rounded-xl bg-blue-600 px-5 shadow-md shadow-blue-100 hover:bg-blue-700"><Save size={16} />{saving ? 'Saving...' : 'Save Changes'}</Button></div>
          </form>
        </> : <div className="space-y-4 text-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><SettingsIcon size={20} /></span><div><h3 className="font-bold text-[#172344]">{tab}</h3><p className="text-xs text-slate-500">Manage your {tab.toLowerCase()} settings</p></div></div><label className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">Email alerts<input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-600" /></label><label className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">Assessment reminders<input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-600" /></label><label className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">AI coaching suggestions<input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-600" /></label><Button onClick={() => push(`${tab} updated`)} className="rounded-xl bg-blue-600 hover:bg-blue-700"><Save size={16} />Save Changes</Button></div>}
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><h3 className="font-bold text-[#172344]">Profile Completion</h3><div className="mt-4 flex items-center gap-4"><div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#1dbb8a ${profileCompletion * 3.6}deg, #e8eef7 0deg)` }}><div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white text-sm font-bold text-[#172344]">{profileCompletion}%</div></div><p className="text-xs leading-5 text-slate-500">Complete your profile to get better learning recommendations.</p></div><div className="mt-4 space-y-2.5 text-xs">{[['Basic information', Boolean(form.name && form.email)], ['Academic details', Boolean(form.department && form.designation)], ['Career goal', Boolean(form.careerGoal)], ['Skills & interests', Boolean(stats.skillsAnalysed)], ['Profile photo', Boolean(photoUrl)]].map(([label, done]) => <div key={label} className="flex items-center gap-2 text-slate-600"><span className={`grid h-4 w-4 place-items-center rounded-full ${done ? 'bg-emerald-100 text-emerald-600' : 'border border-slate-300 text-transparent'}`}>{done ? <Check size={11} /> : null}</span>{label}</div>)}</div></section>
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><h3 className="flex items-center gap-2 font-bold text-[#172344]"><ChartNoAxesColumnIncreasing size={18} className="text-blue-600" />My Stats</h3><div className="mt-3 space-y-2">{[[BookOpen, stats.coursesCompleted || 0, 'Courses Completed', 'bg-blue-50 text-blue-600'], [Target, analytics?.cards?.learningQuizzesTaken || 0, 'Quizzes Attempted', 'bg-emerald-50 text-emerald-600'], [Award, stats.certificates || 0, 'Certificates Earned', 'bg-violet-50 text-violet-600'], [LockKeyhole, `${stats.learningHours || 0} hrs`, 'Learning Time', 'bg-orange-50 text-orange-600']].map(([Icon, value, label, tone]) => <div key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${tone.split(' ').filter((part) => part.startsWith('bg-')).join(' ')}`}><Icon size={20} className={tone.split(' ').find((part) => part.startsWith('text-'))} /><div><p className="text-sm font-bold text-slate-800">{value}</p><p className="text-[11px] text-slate-500">{label}</p></div></div>)}</div></section>
      </aside>
    </div>
  </div>
}
