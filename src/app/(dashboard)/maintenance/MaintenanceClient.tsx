'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

type Property = { id: string; name: string }
type Unit = { id: string; unit_number: string; property_id: string }
type TenantOption = { id: string; first_name: string; last_name: string; email: string }

type Request = {
  id: string
  title: string
  description: string
  urgency: string
  status: string
  notes: string | null
  created_at: string
  property_name: string
  unit_number: string
  tenant_name: string
  tenant_email: string | null
}

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-[#1C7BC0]',
  high: 'bg-orange-50 text-orange-600',
  emergency: 'bg-red-50 text-red-600',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-50 text-[#1C7BC0]',
  resolved: 'bg-green-50 text-green-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30'

function NewRequestModal({ properties, units, tenants, onClose, onSaved }: {
  properties: Property[]
  units: Unit[]
  tenants: TenantOption[]
  onClose: () => void
  onSaved: (req: Request) => void
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '')
  const [unitId, setUnitId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'emergency'>('medium')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredUnits = units.filter(u => u.property_id === propertyId)
  const selectedProperty = properties.find(p => p.id === propertyId)
  const selectedUnit = units.find(u => u.id === unitId)
  const selectedTenant = tenants.find(t => t.id === tenantId)

  function handlePropertyChange(id: string) {
    setPropertyId(id)
    setUnitId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitId) { setError('Please select a unit.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unitId,
          tenant_id: tenantId || null,
          title,
          description,
          urgency,
          property_name: selectedProperty?.name ?? '—',
          unit_number: selectedUnit?.unit_number ?? '—',
          tenant_name: selectedTenant ? `${selectedTenant.first_name} ${selectedTenant.last_name}` : 'Not specified',
          tenant_email: selectedTenant?.email ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit')
      onSaved({
        ...data.request,
        property_name: selectedProperty?.name ?? '—',
        unit_number: selectedUnit?.unit_number ?? '—',
        tenant_name: selectedTenant ? `${selectedTenant.first_name} ${selectedTenant.last_name}` : 'Not specified',
        tenant_email: selectedTenant?.email ?? null,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[#1A2B4A] mb-5">New Maintenance Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Property</label>
            <select value={propertyId} onChange={e => handlePropertyChange(e.target.value)} className={inputCls} required>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Unit</label>
            <select value={unitId} onChange={e => setUnitId(e.target.value)} className={inputCls} required>
              <option value="">Select a unit…</option>
              {filteredUnits.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Tenant <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={inputCls}>
              <option value="">No tenant linked</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Leaking kitchen faucet" required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Describe the issue in detail…" required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Urgency</label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'emergency'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                    urgency === u
                      ? u === 'emergency' ? 'bg-red-600 text-white border-red-600'
                        : u === 'high' ? 'bg-orange-500 text-white border-orange-500'
                        : u === 'medium' ? 'bg-[#1C7BC0] text-white border-[#1C7BC0]'
                        : 'bg-gray-500 text-white border-gray-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-[#1C7BC0] text-white text-sm font-medium hover:bg-[#1C7BC0]/90 disabled:opacity-50 transition-colors">
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MaintenanceClient({ requests: initial, properties, units, tenants }: {
  requests: Request[]
  properties: Property[]
  units: Unit[]
  tenants: TenantOption[]
}) {
  const [requests, setRequests] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [linkedExpenses, setLinkedExpenses] = useState<Record<string, any[]>>({})

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  const counts = {
    all: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
  }

  async function updateStatus(req: Request, status: string) {
    setUpdating(req.id)
    const note = notes[req.id] ?? req.notes ?? ''
    const res = await fetch(`/api/maintenance/${req.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        notes: note,
        tenant_name: req.tenant_name,
        tenant_email: req.tenant_email,
        property_name: req.property_name,
        unit_number: req.unit_number,
        title: req.title,
      }),
    })
    if (res.ok) {
      setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status, notes: note } : r))
    }
    setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {addOpen && (
        <NewRequestModal
          properties={properties}
          units={units}
          tenants={tenants}
          onClose={() => setAddOpen(false)}
          onSaved={(req) => {
            setRequests((prev) => [req, ...prev])
            setAddOpen(false)
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1A2B4A]">Maintenance</h1>
            <p className="text-sm text-gray-500 mt-1">All requests across your portfolio</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1C7BC0] text-white text-sm font-medium rounded-lg hover:bg-[#1669A8] transition-colors"
          >
            <Plus size={16} />
            New Request
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {(['all', 'open', 'in_progress', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`bg-white border rounded-xl p-4 text-left transition-colors ${filter === s ? 'border-[#1C7BC0]' : 'border-gray-200 hover:border-[#1C7BC0]'}`}
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{s.replace('_', ' ')}</p>
              <p className="text-xl font-semibold text-[#1A2B4A]">{counts[s]}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No {filter === 'all' ? '' : filter.replace('_', ' ')} requests
            </div>
          )}
          {filtered.map((req) => {
            const isExpanded = expanded === req.id
            return (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div
                  className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-[#F0F7FF] transition-colors"
                  onClick={() => {
                    const nextId = isExpanded ? null : req.id
                    setExpanded(nextId)
                    if (nextId && linkedExpenses[nextId] === undefined) {
                      fetch('/api/expenses')
                        .then(r => r.json())
                        .then(data => {
                          const matched = (data.expenses ?? []).filter((e: any) => e.maintenance_request_id === nextId)
                          setLinkedExpenses(prev => ({ ...prev, [nextId]: matched }))
                        })
                    }
                  }}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${URGENCY_COLORS[req.urgency] ?? 'bg-gray-100 text-gray-600'}`}>
                        {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {req.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#1A2B4A]">{req.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{req.property_name} · Unit {req.unit_number} · {req.tenant_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(req.created_at)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{isExpanded ? '▲' : '▼'}</p>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-[#F8FAFC]">
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Description</p>
                    <p className="text-sm text-[#1A2B4A] mb-4">{req.description}</p>

                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Internal notes</p>
                    <textarea
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1C7BC0] mb-3 bg-white"
                      rows={2}
                      placeholder="Add notes..."
                      value={notes[req.id] ?? req.notes ?? ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    />

                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Linked Expenses</p>
                    {(() => {
                      const exps = linkedExpenses[req.id]
                      if (!exps) return <p className="text-xs text-gray-400 mb-3">Loading…</p>
                      if (exps.length === 0) return <p className="text-xs text-gray-400 mb-3">No expenses linked yet</p>
                      const total = exps.reduce((s, e) => s + Number(e.amount), 0)
                      return (
                        <div className="mb-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-100">
                                <th className="text-left py-1 font-medium">Date</th>
                                <th className="text-left py-1 font-medium">Payee</th>
                                <th className="text-left py-1 font-medium">Category</th>
                                <th className="text-right py-1 font-medium">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exps.map((e: any) => (
                                <tr key={e.id} className="border-b border-gray-50">
                                  <td className="py-1 text-gray-500">{formatDate(e.date)}</td>
                                  <td className="py-1 text-[#1A2B4A]">{e.payee || e.description || '—'}</td>
                                  <td className="py-1 text-gray-500 capitalize">{e.category?.replace(/_/g, ' ')}</td>
                                  <td className={`py-1 text-right font-medium ${e.amount < 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {e.amount < 0 ? `-$${Math.abs(Number(e.amount)).toFixed(2)}` : `$${Number(e.amount).toFixed(2)}`}
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t border-gray-200 font-semibold">
                                <td colSpan={3} className="py-1 text-[#1A2B4A]">Total cost</td>
                                <td className={`py-1 text-right ${total < 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {total < 0 ? `-$${Math.abs(total).toFixed(2)}` : `$${total.toFixed(2)}`}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}

                    <div className="flex gap-2">
                      {req.status !== 'in_progress' && (
                        <button
                          onClick={() => updateStatus(req, 'in_progress')}
                          disabled={updating === req.id}
                          className="px-3 py-1.5 text-xs bg-[#1C7BC0] text-white rounded-lg hover:bg-[#1669A8] disabled:opacity-50"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {req.status !== 'resolved' && (
                        <button
                          onClick={() => updateStatus(req, 'resolved')}
                          disabled={updating === req.id}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {req.status !== 'open' && (
                        <button
                          onClick={() => updateStatus(req, 'open')}
                          disabled={updating === req.id}
                          className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 disabled:opacity-50"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
