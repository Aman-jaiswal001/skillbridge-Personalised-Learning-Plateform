import { Bell, ChevronDown, Menu, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import avatar from '../../assets/images/avatar.png'
import { useAuth } from '../../context/AuthContext'

export default function Header({ onMenu }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white px-4">
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-lg border border-line lg:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>
      <div className="hidden min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-navy md:flex">
        <Sparkles size={16} className="text-primary" />
        <span>Build skills for what’s next</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/notifications"
          className="relative grid h-10 w-10 place-items-center rounded-lg border border-line text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold text-navy">{user?.name || 'SkillBridge User'}</span>
              <span className="block text-[10px] text-muted">{user?.designation || user?.role}</span>
            </span>
            <ChevronDown size={14} className="text-muted" />
          </button>
          {open ? (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-line bg-white p-1 shadow-lg">
              <Link to="/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>
                Settings
              </Link>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  logout()
                  setOpen(false)
                  navigate('/login')
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
