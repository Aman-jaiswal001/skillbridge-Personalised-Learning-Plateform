import AppRoutes from './routes/AppRoutes'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}
