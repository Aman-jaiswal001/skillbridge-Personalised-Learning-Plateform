import { Bot } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-page px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-white text-primary shadow-sm">
          <Bot size={36} />
        </div>
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-[22px] font-semibold text-navy">Oops! Page Not Found</h1>
        <p className="mt-2 text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Go Back Home</Button>
        </Link>
      </div>
    </div>
  )
}
