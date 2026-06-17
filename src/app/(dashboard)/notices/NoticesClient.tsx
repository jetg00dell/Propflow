'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Notice = {
  id: string
  lease_id: string
  type: string
  title: string | null
  issued_date: string
  response_deadline: string | null
  status: string
  notes: string | null
  property_name: string | null
  unit_number: string | null
  tenant_name: string | null
}

type LeaseSummary = {
  id: string
  property_name: string | null
  unit_number: string | null
  tenant_name: string | null
}

const NOTICE_TYPES = [
  { value: 'notice_to_pay', label: 'Notice to Pay' },
  { value: 'notice_to_quit', label: 'Notice to Quit' },
  { value: 'lease_violation', label: 'Lease Violation' },
  { value: 'entry_notice', label: 'Entry Notice' },
  { value: 'rent_increase', label: 'Rent Increase' },
  { value: 'move_out', label: 'Move-Out Notice' },
  { value: 'other', label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  notice_to_pay: 'bg-red-50 text-red-700',
  notice_to_quit: 'bg-red-100 text-red-800',
  lease_violation: 'bg-orange-50 text-orange-700',
  entry_notice: 'bg-[#F0F7FF] text-[#1C7BC0]',
  rent_increase: 'bg-purple-50 text-purple-700',
  move_out: 'bg-gray-100 text-gray-600',
  other: 'bg-gray-100 text-gray-500',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-amber-50 text-amber-700',
  resolved: 'bg-green-50 text-green-700',
  withdrawn: 'bg-gray-100 text-gray-500',
}

function typeLabel(value: string) {
  return NOTICE_TYPES.find(t => t.value === value)?.label ?? value
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline || status !== 'active') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = deadline.split('-').map(Number)
  return new Date(y, m - 1, d) < today
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30'
const btnPrimary = 'flex-1 py-2 rounded-lg bg-[#1C7BC0] text-white text-sm font-medium hover:bg-[#1C7BC0]/90 disabled:opacity-50 transition-colors'
const btnSecondary = 'flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors'

function AddNoticeModal({ leases, onClose, onSaved }: {
  leases: LeaseSummary[]
  onClose: () => void
  onSaved: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [leaseId, setLeaseId] = useState(leases[0]?.id ?? '')
  const [type, setType] = useState('notice_to_pay')
  const [title, setTitle] = useState('')
  const [issuedDate, setIssuedDate] = useState(today)
  const [responseDeadline, setResponseDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_id: leaseId,
          type,
          title: title || null,
          issued_date: issuedDate,
          response_deadline: responseDeadline || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save')
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-[#1A2B4A] mb-5">Add Notice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Lease</label>
            <select value={leaseId} onChange={e => setLeaseId(e.target.value)} className={inputCls} required>
              {leases.map(l => (
                <option key={l.id} value={l.id}>
                  {l.property_name ?? '—'} — Unit {l.unit_number ?? '—'}{l.tenant_name ? ` (${l.tenant_name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notice Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls} required>
              {NOTICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Title <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
              placeholder="e.g. Unpaid rent for June 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Issued Date</label>
              <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Response Deadline <span className="text-gray-300 font-normal">(opt.)</span>
              </label>
              <input type="date" value={responseDeadline} onChange={e => setResponseDeadline(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Notes <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Any internal notes…"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving || !leaseId} className={btnPrimary}>
              {saving ? 'Saving…' : 'Add Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditNoticeModal({ notice, onClose, onSaved }: {
  notice: Notice
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState(notice.type)
  const [title, setTitle] = useState(notice.title ?? '')
  const [issuedDate, setIssuedDate] = useState(notice.issued_date)
  const [responseDeadline, setResponseDeadline] = useState(notice.response_deadline ?? '')
  const [notes, setNotes] = useState(notice.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/notices/${notice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title || null,
          issued_date: issuedDate,
          response_deadline: responseDeadline || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save')
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-[#1A2B4A] mb-1">Edit Notice</h2>
        <p className="text-xs text-gray-400 mb-5">
          {notice.property_name} — Unit {notice.unit_number}
          {notice.tenant_name ? ` · ${notice.tenant_name}` : ''}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notice Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls} required>
              {NOTICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Title <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
              placeholder="e.g. Unpaid rent for June 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Issued Date</label>
              <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Response Deadline <span className="text-gray-300 font-normal">(opt.)</span>
              </label>
              <input type="date" value={responseDeadline} onChange={e => setResponseDeadline(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Notes <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NoticesClient({ notices: initial, leases }: {
  notices: Notice[]
  leases: LeaseSummary[]
}) {
  const router = useRouter()
  const [notices, setNotices] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'withdrawn'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editNotice, setEditNotice] = useState<Notice | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filtered = filter === 'all' ? notices : notices.filter(n => n.status === filter)

  const counts = {
    all: notices.length,
    active: notices.filter(n => n.status === 'active').length,
    resolved: notices.filter(n => n.status === 'resolved').length,
    withdrawn: notices.filter(n => n.status === 'withdrawn').length,
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setNotices(prev => prev.map(n => n.id === id ? { ...n, status } : n))
      }
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/notices/${id}`, { method: 'DELETE' })
      setNotices(prev => prev.filter(n => n.id !== id))
    } finally {
      setConfirmDeleteId(null)
    }
  }

  function handleSaved() {
    setAddOpen(false)
    setEditNotice(null)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1A2B4A]">Notices</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-[#1C7BC0] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1C7BC0]/90 transition-colors"
        >
          <Plus size={15} /> Add Notice
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {(['all', 'active', 'resolved', 'withdrawn'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`bg-white border rounded-xl p-4 text-left transition-colors ${filter === s ? 'border-[#1C7BC0]' : 'border-gray-200 hover:border-[#1C7BC0]'}`}
          >
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s}</p>
            <p className="text-xl font-semibold text-[#1A2B4A]">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F5F6FA]">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Property / Unit</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tenant</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Issued</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Deadline</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 text-sm py-12">
                    {filter === 'all' ? 'No notices recorded yet' : `No ${filter} notices`}
                  </td>
                </tr>
              ) : (
                filtered.map(n => {
                  const overdue = isOverdue(n.response_deadline, n.status)
                  return (
                    <tr key={n.id} className="border-b border-gray-50 hover:bg-[#F5F6FA] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#1A2B4A] leading-tight">{n.property_name ?? '—'}</p>
                        <p className="text-xs text-gray-400">Unit {n.unit_number ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{n.tenant_name ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-500'}`}>
                          {typeLabel(n.type)}
                        </span>
                        {n.title && <p className="text-xs text-gray-400 mt-1 max-w-[180px] truncate">{n.title}</p>}
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{formatDate(n.issued_date)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {n.response_deadline ? (
                          <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {formatDate(n.response_deadline)}
                            {overdue && <span className="ml-1 text-[10px] font-semibold uppercase">· overdue</span>}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[n.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {n.status.charAt(0).toUpperCase() + n.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right" style={{ minWidth: '260px' }}>
                        {confirmDeleteId === n.id ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-xs text-red-600">Delete this notice?</span>
                            <button onClick={() => handleDelete(n.id)}
                              className="text-xs text-red-600 font-semibold hover:underline">Yes, delete</button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-gray-400 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            {n.status === 'active' && (
                              <>
                                <button
                                  disabled={updatingId === n.id}
                                  onClick={() => handleStatusChange(n.id, 'resolved')}
                                  className="text-xs text-green-600 font-medium hover:underline disabled:opacity-50"
                                >
                                  Resolve
                                </button>
                                <button
                                  disabled={updatingId === n.id}
                                  onClick={() => handleStatusChange(n.id, 'withdrawn')}
                                  className="text-xs text-gray-400 font-medium hover:underline disabled:opacity-50"
                                >
                                  Withdraw
                                </button>
                              </>
                            )}
                            {n.status !== 'active' && (
                              <button
                                disabled={updatingId === n.id}
                                onClick={() => handleStatusChange(n.id, 'active')}
                                className="text-xs text-amber-600 font-medium hover:underline disabled:opacity-50"
                              >
                                Reactivate
                              </button>
                            )}
                            <button
                              onClick={() => setEditNotice(n)}
                              className="text-xs text-gray-400 font-medium hover:text-[#1A2B4A] flex items-center gap-1 transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(n.id)}
                              className="text-xs text-red-400 font-medium hover:underline flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <AddNoticeModal leases={leases} onClose={() => setAddOpen(false)} onSaved={handleSaved} />
      )}
      {editNotice && (
        <EditNoticeModal notice={editNotice} onClose={() => setEditNotice(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
