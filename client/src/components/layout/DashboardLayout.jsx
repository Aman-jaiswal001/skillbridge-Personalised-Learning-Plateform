import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import MobileSidebar from './MobileSidebar'
import Sidebar from './Sidebar'

export default function DashboardLayout({ variant = 'employee' }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-page">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-svh">
          <Sidebar variant={variant} />
        </div>
      </div>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} variant={variant} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 px-3 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
