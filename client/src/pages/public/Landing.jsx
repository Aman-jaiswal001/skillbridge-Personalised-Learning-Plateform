import { Link } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  GraduationCap,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/common/Button'
import logo from '../../assets/images/logo.png'
import hero from '../../assets/images/hero.png'
import { APP_NAME } from '../../utils/constants'

const stats = [
  { label: '10K+ Students', value: '10K+' },
  { label: '250+ Courses', value: '250+' },
  { label: '98% Satisfaction', value: '98%' },
  { label: '50K+ Assessments', value: '50K+' },
]

const features = [
  { icon: ClipboardCheck, title: 'AI Assessment', text: 'Identify strengths and gaps with personalized assessment tests.' },
  { icon: GraduationCap, title: 'Personalized Learning', text: 'Get learning paths matched to your course goals and weak areas.' },
  { icon: Bot, title: 'AI Quiz Generator', text: 'Turn notes and study material into practice quizzes in minutes.' },
  { icon: BarChart3, title: 'Progress Analytics', text: 'Track your performance and improvement across subjects.' },
]

export default function Landing() {
  const [open, setOpen] = useState(false)
  const links = [
    { href: '#home', label: 'Home' },
    { href: '#features', label: 'Features' },
    { href: '#how', label: 'How It Works' },
    { href: '#impact', label: 'Impact' },
    { href: '#contact', label: 'Contact' },
  ]

  return (
    <div className="min-h-svh bg-white text-navy">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#home" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-sm font-bold">{APP_NAME}</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-primary">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login">
              <Button variant="secondary">Login</Button>
            </Link>
            <Link to="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open ? (
          <div className="space-y-2 border-t border-line px-4 py-3 md:hidden">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="block py-2 text-sm" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link to="/login" className="block py-2 text-sm font-semibold text-primary">
              Login / Get Started
            </Link>
          </div>
        ) : null}
      </header>

      <section id="home" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-16">
        <div>
          <p className="mb-3 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles size={14} /> Student success platform
          </p>
          <h1 className="text-[28px] font-bold leading-tight text-navy sm:text-[36px]">
            AI-Powered Learning for a Brighter Future
          </h1>
          <p className="mt-2 text-base font-semibold text-primary">Assess. Learn. Improve. Succeed.</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            An intelligent platform that identifies learning gaps, recommends personalized study paths, and helps students
            grow with confidence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/login">
              <Button className="px-5">Get Started</Button>
            </Link>
            <Button variant="secondary">Watch Demo</Button>
          </div>
        </div>
        <div className="relative">
          <img src={hero} alt="Student learning on SkillBridge AI" className="w-full rounded-2xl border border-line shadow-sm" />
          <div className="absolute -left-2 top-6 hidden rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-sm sm:block">
            <p className="font-semibold text-navy">Your Skills</p>
            <p className="text-muted">16 analyzed</p>
          </div>
          <div className="absolute -right-2 top-24 hidden rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-sm sm:block">
            <p className="font-semibold text-navy">Recommended For You</p>
            <p className="text-muted">AI Fundamentals</p>
          </div>
          <div className="absolute bottom-6 left-8 hidden rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-sm sm:block">
            <p className="font-semibold text-navy">Learn Today / Shine Tomorrow</p>
          </div>
        </div>
      </section>

      <section id="impact" className="bg-page py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-white p-4 text-center shadow-sm">
              <p className="text-xl font-bold text-primary">{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.label.replace(s.value + ' ', '')}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-[22px] font-semibold">Built for smarter learning</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-line p-5 shadow-sm">
              <f.icon className="text-primary" size={22} />
              <h3 className="mt-3 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-page py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-[22px] font-semibold">How It Works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {['Assess current skills', 'Learn with personalised paths', 'Improve and demonstrate impact'].map((t, i) => (
              <div key={t} className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs font-bold text-primary">0{i + 1}</p>
                <p className="mt-2 text-sm font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer id="contact" className="border-t border-line bg-navy py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">{APP_NAME}</p>
              <p className="mt-1 text-xs text-indigo-200">Student learning platform for personalized growth and academic success</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-indigo-100">
            <span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Secure</span>
            <span>Personalized</span>
            <span>Impactful</span>
            <span>Future Ready</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
