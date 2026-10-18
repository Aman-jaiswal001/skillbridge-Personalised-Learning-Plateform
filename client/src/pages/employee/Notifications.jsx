import { apiRequest } from '../../api/client'
import { normalizeNotification } from '../../api/normalizers'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import NotificationCard from '../../components/common/NotificationCard'
import PageContainer from '../../components/common/PageContainer'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

export default function Notifications() {
  const { push } = useToast()
  const { data = [], loading, reload, setData } = useApiData('/notifications', { initialData: [] })
  const items = data.map(normalizeNotification)

  async function markOne(id) {
    setData((prev) => prev.map((n) => ((n._id || n.id) === id ? { ...n, isRead: true, read: true } : n)))
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' })
      await reload()
    } catch (err) {
      push(err.message, 'error')
    }
  }

  async function markAll() {
    setData((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })))
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' })
      await reload()
      push('All notifications marked as read')
    } catch (err) {
      push(err.message, 'error')
    }
  }

  return (
    <PageContainer title="Notifications" actions={<Button variant="secondary" onClick={markAll}>Mark all as read</Button>}>
      {loading ? <Loading label="Loading notifications..." /> : null}
      {items.length ? (
        <div className="space-y-3">
          {items.map((n) => (
            <NotificationCard key={n.id} item={n} onClick={() => markOne(n.id)} />
          ))}
        </div>
      ) : (
        <EmptyState title="No notifications" description="You are all caught up." />
      )}
    </PageContainer>
  )
}
