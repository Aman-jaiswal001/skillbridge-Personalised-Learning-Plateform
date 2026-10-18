import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  ClipboardList,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  LogOut,
  Route,
  Settings,
  Sparkles,
  Users,
  WandSparkles,
  UserRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { adminNav, APP_NAME, employeeNav } from '../../utils/constants'
import logo from '../../assets/images/logo.png'
import { cn } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'

const icons = {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  Gauge,
  BookOpen,
  Bot,
  WandSparkles,
  Route,
  BarChart3,
  Bell,
  Settings,
  Users,
  FileBarChart,
  ArrowLeftRight,
  UserRound,
}


export default function Sidebar({ variant = 'employee', onNavigate }) {
  const items = variant === 'admin' ? adminNav : employeeNav
  const { logout } = useAuth()
  return (
    <aside className="flex h-full w-[248px] flex-col border-r border-line bg-white">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
        <img src={logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
        <div>
          <p className="text-sm font-bold tracking-tight text-navy">{APP_NAME}</p>
          <p className="text-[10px] text-muted">Learn. Grow. Get hired.</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {items.map((item) => {
          const Icon = icons[item.icon]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isActive ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50',
                )
              }
            >
              {Icon ? <Icon size={16} /> : null}
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-line p-3">
        <NavLink
          to="/login"
          onClick={() => {
            logout()
            onNavigate?.()
          }}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-red-50 hover:text-danger"
        >
          <LogOut size={16} />
          Logout
        </NavLink>
      </div>
    </aside>
  )
}
