'use client'

import { useState } from 'react'

type Props = {
  tenant: { id: string; first_name: string; last_name: string; email: string }
  lease: { id: string; monthly_rent: number; start_date: string; end_date: string } | null
  unit: { id: string; unit_number: string } | null
  property: { id: string; name: string; address: string; city: string; state: string } | null
  requests: Array<{
    id: string; title: string; description: string; urgency: string;
    status: string; notes: string | null; created_at: string
  }>
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-50 text-[#1C7BC0]',
  resolved: 'bg-green-50 text-green-700',
}

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low — minor issue, no rush' },
  { value: 'medium', label: 'Medium — needs attention soon' },
  { value: 'high', label: 'High — affecting daily living' },
  { value: 'emergency', label: 'Emergency — immediate danger' },
]

function formatDate(str: string) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function PortalClient({ tenant, lease, unit, property, requests: initial }: Props) {
  const [requests, setRequests] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', urgency: 'medium' })

  async function handleSubmit() {
    if (!form.title || !form.description || !unit || !property) return
    setSubmitting(true)

    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: unit.id,
        tenant_id: tenant.id,
        title: form.title,
        description: form.description,
        urgency: form.urgency,
        tenant_name: `${tenant.first_name} ${tenant.last_name}`,
        tenant_email: tenant.email,
        property_name: property.name,
        unit_number: unit.unit_number,
      }),
    })

    if (res.ok) {
      const { request } = await res.json()
      setRequests((prev) => [{
        ...request,
        title: form.title,
        description: form.description,
        urgency: form.urgency,
        status: 'open',
        notes: null,
        created_at: new Date().toISOString(),
      }, ...prev])
      setForm({ title: '', description: '', urgency: 'medium' })
      setShowForm(false)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
    }
    setSubmitting(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1A2B4A]">Welcome, {tenant.first_name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{property?.name ?? '—'} · Unit {unit?.unit_number ?? '—'}</p>
      </div>

      {lease && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your lease</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Monthly rent</p>
              <p className="text-sm font-semibold text-[#1A2B4A]">{formatCurrency(lease.monthly_rent)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lease start</p>
              <p className="text-sm font-semibold text-[#1A2B4A]">{formatDate(lease.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lease end</p>
              <p className="text-sm font-semibold text-[#1A2B4A]">{formatDate(lease.end_date)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1A2B4A]">Maintenance requests</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm bg-[#1C7BC0] text-white rounded-lg hover:bg-[#1669A8] font-medium"
        >
          + New request
        </button>
      </div>

      {submitted && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✓ Request submitted — you'll receive a confirmation email shortly.
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-[#1A2B4A] mb-4">New maintenance request</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Issue title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Leaking faucet in bathroom"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1C7BC0]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue in detail..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1C7BC0]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1C7BC0]"
              >
                {URGENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.title || !form.description}
                className="flex-1 px-4 py-2 text-sm bg-[#1C7BC0] text-white rounded-lg hover:bg-[#1669A8] font-medium disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {requests.length === 0 && !showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            No maintenance requests yet
          </div>
        )}
        {requests.map((r) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#1A2B4A]">{r.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                {r.notes && (
                  <p className="text-xs text-[#1C7BC0] mt-2">Note: {r.notes}</p>
                )}
              </div>
              <p className="text-xs text-gray-400 shrink-0">
                {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
