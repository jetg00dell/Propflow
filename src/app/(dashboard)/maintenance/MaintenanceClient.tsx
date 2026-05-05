'use client'

import { useState } from 'react'

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

export default function MaintenanceClient({ requests: initial }: { requests: Request[] }) {
  const [requests, setRequests] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

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
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1A2B4A]">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1">All requests across your portfolio</p>
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
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
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
