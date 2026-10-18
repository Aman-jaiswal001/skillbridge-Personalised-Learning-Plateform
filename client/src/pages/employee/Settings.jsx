import { useEffect, useState } from 'react'
import { apiRequest, extractData, setSession } from '../../api/client'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import PageContainer from '../../components/common/PageContainer'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

const tabs = ['Profile Information', 'Preferences', 'Notifications', 'Security', 'AI Preferences']
const empty = { name: '', email: '', department: '', designation: '', phone: '', location: '', careerGoal: '' }

export default function Settings() {
  const [tab, setTab] = useState(tabs[0])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const { token, setUser } = useAuth()
  const { push } = useToast()
  const { data, loading } = useApiData('/employees/me')

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
    } catch (err) {
      push(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer title="My Profile & Settings">
      {loading ? <Loading label="Loading profile..." /> : null}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit space-y-1 rounded-xl border border-line bg-white p-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${tab === t ? 'bg-indigo-50 font-semibold text-primary' : 'text-slate-600'}`}
            >
              {t}
            </button>
          ))}
        </aside>
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          {tab === 'Profile Information' ? (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveProfile}>
              {Object.entries({
                Name: 'name',
                Email: 'email',
                Department: 'department',
                Designation: 'designation',
                Phone: 'phone',
                Location: 'location',
                'Career Goal': 'careerGoal',
              }).map(([label, key]) => (
                <label key={key} className={`text-xs font-semibold ${key === 'careerGoal' ? 'sm:col-span-2' : ''}`}>
                  {label}
                  <input
                    className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm disabled:bg-slate-50"
                    value={form[key]}
                    disabled={key === 'email'}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-navy">{tab}</p>
              <label className="flex items-center justify-between rounded-lg border border-line px-3 py-3">
                Email alerts
                <input type="checkbox" defaultChecked />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-line px-3 py-3">
                Assessment reminders
                <input type="checkbox" defaultChecked />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-line px-3 py-3">
                AI coaching suggestions
                <input type="checkbox" defaultChecked />
              </label>
              <Button onClick={() => push(`${tab} updated`)}>Save Changes</Button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
