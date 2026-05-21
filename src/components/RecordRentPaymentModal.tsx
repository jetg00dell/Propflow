'use client'

import { useState, useEffect } from 'react'

export type ModalLease = {
  id: string
  property_name: string | null
  unit_number: string | null
  tenant_name: string | null
  monthly_rent: number | null
}

type Props = {
  leases?: ModalLease[]
  prefilledLeaseId?: string
  prefilledTitle?: string
  prefilledChargeMonth?: string  // YYYY-MM
  prefilledAmount?: string
  prefilledPaidDate?: string
  prefilledMethod?: string
  prefilledNotes?: string
  onClose: () => void
  onSaved: () => void
}

const METHODS = [
  { value: 'ach', label: 'ACH' },
  { value: 'check', label: 'Check' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
]

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30'
const btnPrimary = 'flex-1 py-2 rounded-lg bg-[#1C7BC0] text-white text-sm font-medium hover:bg-[#1C7BC0]/90 disabled:opacity-50 transition-colors'
const btnSecondary = 'flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function RecordRentPaymentModal({
  leases,
  prefilledLeaseId,
  prefilledTitle,
  prefilledChargeMonth,
  prefilledAmount,
  prefilledPaidDate,
  prefilledMethod,
  prefilledNotes,
  onClose,
  onSaved,
}: Props) {
  const hasLeaseSelector = !!leases && !prefilledLeaseId

  const [leaseId, setLeaseId] = useState(prefilledLeaseId ?? leases?.[0]?.id ?? '')
  const [chargeMonth, setChargeMonth] = useState(prefilledChargeMonth ?? currentMonthStr())
  const [amount, setAmount] = useState(prefilledAmount ?? '')
  const [paidBy, setPaidBy] = useState<'ha' | 'tenant'>('tenant')
  const [method, setMethod] = useState(prefilledMethod ?? 'zelle')
  const [paidDate, setPaidDate] = useState(prefilledPaidDate ?? todayStr())
  const [notes, setNotes] = useState(prefilledNotes ?? '')

  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle')
  const [haAmount, setHaAmount] = useState('0')
  const [tenantAmount, setTenantAmount] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leaseId || !chargeMonth) {
      setCheckStatus('idle')
      return
    }
    const chargeMonthDate = `${chargeMonth}-01`
    setCheckStatus('checking')
    fetch(`/api/payments/record?lease_id=${encodeURIComponent(leaseId)}&charge_month=${encodeURIComponent(chargeMonthDate)}`)
      .then(r => r.json())
      .then(data => {
        if (data.charge) {
          setCheckStatus('found')
        } else {
          setCheckStatus('not_found')
          if (data.lease_defaults) {
            setHaAmount(String(data.lease_defaults.ha_amount ?? 0))
            setTenantAmount(String(data.lease_defaults.tenant_amount ?? data.lease_defaults.monthly_rent ?? ''))
          }
        }
      })
      .catch(() => setCheckStatus('idle'))
  }, [leaseId, chargeMonth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!leaseId || !chargeMonth || !amount) return
    if (checkStatus === 'found') {
      setError('A charge already exists for this lease and month.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_id: leaseId,
          charge_month: `${chargeMonth}-01`,
          amount: parseFloat(amount),
          paid_by: paidBy,
          method,
          paid_date: paidDate,
          notes: notes || null,
          ha_amount: parseFloat(haAmount) || 0,
          tenant_amount: parseFloat(tenantAmount) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedLease = leases?.find(l => l.id === leaseId)
  const displayTitle = prefilledTitle
    ?? (selectedLease ? `${selectedLease.property_name} — Unit ${selectedLease.unit_number}` : '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[#1A2B4A] mb-1">Record Payment</h2>
        {displayTitle && <p className="text-xs text-gray-400 mb-5">{displayTitle}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasLeaseSelector && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Lease</label>
              <select
                value={leaseId}
                onChange={e => setLeaseId(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Select a lease…</option>
                {leases!.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.property_name} — Unit {l.unit_number}{l.tenant_name ? ` (${l.tenant_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Month</label>
            <input
              type="month"
              value={chargeMonth}
              onChange={e => setChargeMonth(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {checkStatus === 'checking' && (
            <p className="text-xs text-gray-400">Checking for existing charge…</p>
          )}
          {checkStatus === 'found' && (
            <p className="text-xs text-green-600">✓ Charge found for {formatMonth(chargeMonth)}</p>
          )}
          {checkStatus === 'not_found' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
              <p className="text-xs font-medium text-amber-800 mb-2">
                No charge found for {formatMonth(chargeMonth)} — will auto-create:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">HA Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={haAmount}
                    onChange={e => setHaAmount(e.target.value)}
                    className={inputCls}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Tenant Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tenantAmount}
                    onChange={e => setTenantAmount(e.target.value)}
                    className={inputCls}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={inputCls}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Paid by</label>
            <div className="flex gap-3">
              {(['ha', 'tenant'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPaidBy(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${paidBy === v ? 'bg-[#1C7BC0] text-white border-[#1C7BC0]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#1C7BC0]'}`}
                >
                  {v === 'ha' ? 'HA' : 'Tenant'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Date paid</label>
            <input
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Note <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Any notes…"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button
              type="submit"
              disabled={saving || !leaseId || checkStatus === 'checking'}
              className={btnPrimary}
            >
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
