import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import { apiRequest, extractData } from '../../api/client'
import Button from '../../components/common/Button'

const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [developmentResetPath, setDevelopmentResetPath] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setDevelopmentResetPath('')
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const payload = await apiRequest('/auth/forgot-password', { method: 'POST', body: { email: normalizedEmail } })
      const data = extractData(payload)
      setMessage(data?.message || payload?.message || 'If the account exists, a reset token has been issued.')
      if (typeof data?.resetToken === 'string' && data.resetToken) {
        setDevelopmentResetPath(`/reset-password?token=${encodeURIComponent(data.resetToken)}`)
      }
    } catch (requestError) {
      setError(requestError.message || 'We could not process your request. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return <AuthShell>
    <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"><ArrowLeft size={16} /> Back to login</Link>
    <div className="mt-7 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700"><KeyRound size={23} /></div>
    <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#111d40]">Forgot your password?</h1>
    <p className="mt-2 text-sm leading-6 text-slate-500">Enter the email address associated with your account. We’ll let you know if a reset request can be processed.</p>
    {message ? <div role="status" className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={19} className="mt-0.5 shrink-0" /><div><p>{message}</p>{developmentResetPath ? <Link to={developmentResetPath} className="mt-2 inline-block font-semibold text-emerald-900 underline">Continue to password reset (development)</Link> : null}</div></div> : null}
    {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <label className="block text-sm font-semibold text-[#142144]">Email address<div className="relative mt-2"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="email" autoComplete="email" className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div></label>
      <Button type="submit" className="h-[52px] w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-base font-bold shadow-lg shadow-blue-200" disabled={loading}>{loading ? 'Sending request...' : 'Send Reset Link'}</Button>
    </form>
    <p className="mt-5 text-center text-xs leading-5 text-slate-500">For your privacy, the response does not confirm whether an account exists.</p>
  </AuthShell>
}

function AuthShell({ children }) {
  return <main className="min-h-svh bg-[radial-gradient(ellipse_at_25%_10%,#eaf2ff,white_60%)] px-4 py-8 sm:grid sm:place-items-center"><div className="mx-auto w-full max-w-md"><Link to="/" className="mb-7 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><KeyRound size={22} /></span><span><span className="block text-xl font-extrabold tracking-tight text-[#101d42]">SkillBridge <span className="text-blue-600">AI</span></span><span className="block text-xs text-slate-500">Your Personalized Learning Companion</span></span></Link><section className="rounded-[26px] border border-white bg-white/95 p-6 shadow-[0_22px_70px_-35px_rgba(31,68,135,0.32)] sm:p-8">{children}</section></div></main>
}
