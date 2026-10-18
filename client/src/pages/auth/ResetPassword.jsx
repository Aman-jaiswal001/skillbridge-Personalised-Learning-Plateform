import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react'
import { apiRequest } from '../../api/client'
import Button from '../../components/common/Button'

const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!token) {
      setError('This reset link is missing its token. Request a new password reset link.')
      return
    }
    if (!password || !confirmPassword) {
      setError('Enter and confirm your new password.')
      return
    }
    if (password.length < 6) {
      setError('Your password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } })
      setSuccess(true)
      setPassword('')
      setConfirmPassword('')
    } catch (requestError) {
      setError(requestError.message || 'We could not reset your password. The link may have expired; request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="min-h-svh bg-[radial-gradient(ellipse_at_25%_10%,#eaf2ff,white_60%)] px-4 py-8 sm:grid sm:place-items-center"><div className="mx-auto w-full max-w-md"><Link to="/" className="mb-7 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><KeyRound size={22} /></span><span><span className="block text-xl font-extrabold tracking-tight text-[#101d42]">SkillBridge <span className="text-blue-600">AI</span></span><span className="block text-xs text-slate-500">Your Personalized Learning Companion</span></span></Link><section className="rounded-[26px] border border-white bg-white/95 p-6 shadow-[0_22px_70px_-35px_rgba(31,68,135,0.32)] sm:p-8">
    <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"><ArrowLeft size={16} /> Back to login</Link>
    <div className="mt-7 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700"><LockKeyhole size={22} /></div>
    <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#111d40]">Set a new password</h1>
    <p className="mt-2 text-sm leading-6 text-slate-500">Choose a new password for your SkillBridge account.</p>
    {success ? <div className="mt-6 space-y-4"><div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={19} className="mt-0.5 shrink-0" /><p>Password updated successfully. You can now sign in with your new password.</p></div><Link to="/login" className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-base font-bold text-white shadow-lg shadow-blue-200">Return to Login</Link></div> : <>
      {!token ? <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">This reset link is missing its token. Request a new reset link to continue.<Link to="/forgot-password" className="mt-2 block font-semibold text-blue-700 underline">Request a new link</Link></div> : null}
      {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <PasswordField label="New password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
        <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirm} onToggle={() => setShowConfirm((value) => !value)} autoComplete="new-password" />
        <p className="text-xs text-slate-500">Use at least 6 characters.</p>
        <Button type="submit" className="h-[52px] w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-base font-bold shadow-lg shadow-blue-200" disabled={loading || !token}>{loading ? 'Updating password...' : 'Reset Password'}</Button>
      </form>
    </>}
  </section></div></main>
}

function PasswordField({ label, value, onChange, visible, onToggle, autoComplete }) {
  return <label className="block text-sm font-semibold text-[#142144]">{label}<div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type={visible ? 'text' : 'password'} autoComplete={autoComplete} className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder="At least 6 characters" required /><button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
}
