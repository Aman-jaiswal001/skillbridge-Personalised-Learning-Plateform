import { useMemo, useState } from 'react'
import { apiRequest } from '../../api/client'
import { toId } from '../../api/normalizers'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import EmptyState from '../../components/common/EmptyState'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import PageContainer from '../../components/common/PageContainer'
import SearchBar from '../../components/common/SearchBar'
import { useToast } from '../../context/ToastContext'
import { useApiData } from '../../hooks/useApiData'

const empty = { name: '', email: '', employeeId: '', department: '', designation: '', role: 'EMPLOYEE', competency: 0, status: 'Active' }

export default function EmployeeManagement() {
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const { push } = useToast()
  const { data: rows = [], loading, reload } = useApiData('/admin/employees?limit=100', { initialData: [] })

  const employees = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        id: toId(r),
        roleTitle: r.designation || r.role,
        status: r.status || (r.isActive ? 'Active' : 'Inactive'),
      })),
    [rows],
  )
  const filtered = useMemo(
    () => employees.filter((r) => `${r.name} ${r.email} ${r.department} ${r.roleTitle}`.toLowerCase().includes(q.toLowerCase())),
    [employees, q],
  )

  async function save() {
    try {
      if (modal === 'add') {
        await apiRequest('/admin/employees', {
          method: 'POST',
          body: {
            name: form.name,
            email: form.email,
            employeeId: form.employeeId,
            department: form.department,
            designation: form.designation,
            role: form.role || 'EMPLOYEE',
          },
        })
        push('Employee added')
      } else if (modal === 'edit') {
        await apiRequest(`/admin/employees/${form.id}`, {
          method: 'PUT',
          body: {
            name: form.name,
            department: form.department,
            designation: form.designation,
            role: form.role,
            isActive: form.status !== 'Inactive',
          },
        })
        push('Employee updated')
      }
      setModal(null)
      await reload()
    } catch (err) {
      push(err.message, 'error')
    }
  }

  async function remove() {
    try {
      await apiRequest(`/admin/employees/${form.id}`, { method: 'DELETE' })
      setModal(null)
      await reload()
      push('Employee deactivated')
    } catch (err) {
      push(err.message, 'error')
    }
  }

  return (
    <PageContainer
      title="Employee Management"
      actions={
        <>
          <div className="w-full sm:w-64">
            <SearchBar value={q} onChange={setQ} placeholder="Search employees" />
          </div>
          <Button
            onClick={() => {
              setForm(empty)
              setModal('add')
            }}
          >
            + Add Employee
          </Button>
        </>
      }
    >
      {loading ? <Loading label="Loading employees..." /> : null}
      {filtered.length ? (
        <DataTable
          rows={filtered}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'department', header: 'Department' },
            { key: 'roleTitle', header: 'Role' },
            { key: 'competency', header: 'Competency', render: (r) => `${r.competency}%` },
            { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
            {
              key: 'action',
              header: 'Action',
              render: (r) => (
                <div className="flex gap-2">
                  <button className="text-xs font-semibold text-primary" onClick={() => { setForm(r); setModal('view') }}>
                    View
                  </button>
                  <button className="text-xs font-semibold text-navy" onClick={() => { setForm(r); setModal('edit') }}>
                    Edit
                  </button>
                  <button className="text-xs font-semibold text-danger" onClick={() => { setForm(r); setModal('delete') }}>
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState title="No employees found" description="Add employees or change your search." />
      )}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        title={modal === 'add' ? 'Add Employee' : 'Edit Employee'}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <div className="grid gap-2">
          {['name', 'email', 'employeeId', 'department', 'designation'].map((k) => (
            <input
              key={k}
              className="h-10 rounded-lg border border-line px-3 text-sm disabled:bg-slate-50"
              placeholder={k}
              value={form[k] ?? ''}
              disabled={modal === 'edit' && (k === 'email' || k === 'employeeId')}
              onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
            />
          ))}
          <select className="h-10 rounded-lg border border-line px-3 text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
            <option value="EMPLOYEE">Employee</option>
            <option value="TRAINER">Trainer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </Modal>
      <Modal open={modal === 'view'} title="Employee" onClose={() => setModal(null)}>
        <p className="text-sm font-semibold">{form.name}</p>
        <p className="text-xs text-muted">
          {form.roleTitle} - {form.department}
        </p>
        <p className="mt-2 text-sm">Competency {form.competency}%</p>
        <p className="text-sm">{form.email}</p>
      </Modal>
      <Modal
        open={modal === 'delete'}
        title="Deactivate employee?"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">This will deactivate {form.name} and keep their historical records.</p>
      </Modal>
    </PageContainer>
  )
}
