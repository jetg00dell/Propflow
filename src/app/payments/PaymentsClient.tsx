"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Payment = {
  id: string
  charge_id: string
  amount: number
  paid_by: string
  method: string
  paid_date: string
  notes: string | null
}

type ChargeRow = {
  id: string
  lease_id: string
  charge_month: string
  ha_amount: number
  tenant_amount: number
  property_name: string | null
  unit_number: string | null
  tenant_name: string | null
  payments: Payment[]
}

type ActiveLease = {
  id: string
  property_name: string | null
  unit_number: string | null
  tenant_name: string | null
}

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatMonth(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

const METHODS = [
  { value: 'ach', label: 'ACH' },
  { value: 'check', label: 'Check' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
]

function PaidCell({ expected, paid }: { expected: number; paid: number }) {
  if (expected === 0) return <span className="text-xs text-gray-400">—</span>
  const full = paid >= expected
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[#1A2B4A]">{fmt(paid)}</span>
      <span className="text-[10px] text-gray-400">/ {fmt(expected)}</span>
      {full ? (
        <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
      ) : (
        <XCircle size={13} className={`flex-shrink-0 ${paid === 0 ? 'text-red-400' : 'text-amber-400'}`} />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'Paid' | 'Partial' | 'Unpaid' }) {
  const styles = {
    Paid: 'bg-green-50 text-green-700',
    Partial: 'bg-amber-50 text-amber-600',
    Unpaid: 'bg-red-50 text-red-600',
  }
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  )
}

function RecordPaymentModal({ charge, onClose, onSaved }: {
  charge: ChargeRow
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState<'ha' | 'tenant'>('tenant')
  const [method, setMethod] = useState('ach')
  const [paidDate, setPaidDate] = useState(todayStr())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charge_id: charge.id,
          amount: parseFloat(amount),
          paid_by: paidBy,
          method,
          paid_date: paidDate,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
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
        <h2 className="text-base font-semibold text-[#1A2B4A] mb-1">Record Payment</h2>
        <p className="text-xs text-gray-400 mb-5">
          {charge.property_name} — Unit {charge.unit_number} &middot; {formatMonth(charge.charge_month)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Paid by</label>
            <div className="flex gap-3">
              {([['ha', 'HA'], ['tenant', 'Tenant']] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPaidBy(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    paidBy === v
                      ? 'bg-[#1C7BC0] text-white border-[#1C7BC0]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-[#1C7BC0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
            >
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Date paid</label>
            <input
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30 resize-none"
              placeholder="Any notes…"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-[#1C7BC0] text-white text-sm font-medium hover:bg-[#1C7BC0]/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddChargeModal({ leases, onClose, onSaved }: {
  leases: ActiveLease[]
  onClose: () => void
  onSaved: () => void
}) {
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [leaseId, setLeaseId] = useState(leases[0]?.id ?? '')
  const [chargeMonth, setChargeMonth] = useState(currentMonthStr)
  const [haAmount, setHaAmount] = useState('')
  const [tenantAmount, setTenantAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const ha = parseFloat(haAmount) || 0
      const tenant = parseFloat(tenantAmount) || 0
      const { error: err } = await supabase.from('rent_charges').insert({
        lease_id: leaseId,
        charge_month: `${chargeMonth}-01`,
        ha_amount: ha,
        tenant_amount: tenant,
        total_due: ha + tenant,
      })
      if (err) throw new Error(err.message)
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
        <h2 className="text-base font-semibold text-[#1A2B4A] mb-5">Add Rent Charge</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Lease</label>
            <select
              value={leaseId}
              onChange={e => setLeaseId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
              required
            >
              {leases.map(l => (
                <option key={l.id} value={l.id}>
                  {l.property_name} — Unit {l.unit_number}{l.tenant_name ? ` (${l.tenant_name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Month</label>
            <input
              type="month"
              value={chargeMonth}
              onChange={e => setChargeMonth(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">HA Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={haAmount}
                onChange={e => setHaAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                placeholder="0.00"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !leaseId}
              className="flex-1 py-2 rounded-lg bg-[#1C7BC0] text-white text-sm font-medium hover:bg-[#1C7BC0]/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add Charge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function chargeStatus(c: ChargeRow): 'Paid' | 'Partial' | 'Unpaid' {
  const paid = c.payments.reduce((s, p) => s + p.amount, 0)
  const expected = c.ha_amount + c.tenant_amount
  if (paid === 0) return 'Unpaid'
  if (paid >= expected) return 'Paid'
  return 'Partial'
}

export default function PaymentsClient({ charges, leases }: {
  charges: ChargeRow[]
  leases: ActiveLease[]
}) {
  const router = useRouter()
  const [addChargeOpen, setAddChargeOpen] = useState(false)
  const [recordCharge, setRecordCharge] = useState<ChargeRow | null>(null)

  const now = new Date()
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthCharges = charges.filter(c => c.charge_month.startsWith(currentMonthPrefix))

  const haCollected = currentMonthCharges.reduce(
    (s, c) => s + c.payments.filter(p => p.paid_by === 'ha').reduce((a, p) => a + p.amount, 0),
    0
  )
  const tenantCollected = currentMonthCharges.reduce(
    (s, c) => s + c.payments.filter(p => p.paid_by === 'tenant').reduce((a, p) => a + p.amount, 0),
    0
  )
  const totalExpected = currentMonthCharges.reduce((s, c) => s + c.ha_amount + c.tenant_amount, 0)
  const totalCollected = haCollected + tenantCollected
  const outstanding = Math.max(0, totalExpected - totalCollected)

  function handleSaved() {
    setAddChargeOpen(false)
    setRecordCharge(null)
    router.refresh()
  }

  const stats = [
    { label: 'Expected (this month)', value: fmt(totalExpected), accent: false },
    { label: 'Total Collected', value: fmt(totalCollected), accent: false },
    { label: 'HA Collected', value: fmt(haCollected), accent: false },
    { label: 'Tenant Collected', value: fmt(tenantCollected), accent: false },
    { label: 'Outstanding', value: fmt(outstanding), accent: outstanding > 0 },
  ]

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1A2B4A]">Payments</h1>
        <button
          onClick={() => setAddChargeOpen(true)}
          className="flex items-center gap-2 bg-[#1C7BC0] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1C7BC0]/90 transition-colors"
        >
          <Plus size={15} />
          Add Charge
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-xl font-semibold ${s.accent ? 'text-red-600' : 'text-[#1A2B4A]'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F5F6FA]">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Property / Unit</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tenant</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Month</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">HA</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tenant</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 text-sm py-12">
                    No rent charges found
                  </td>
                </tr>
              ) : (
                charges.map(c => {
                  const haPaid = c.payments.filter(p => p.paid_by === 'ha').reduce((s, p) => s + p.amount, 0)
                  const tenantPaid = c.payments.filter(p => p.paid_by === 'tenant').reduce((s, p) => s + p.amount, 0)
                  const totalPaid = haPaid + tenantPaid
                  const totalDue = c.ha_amount + c.tenant_amount
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-[#F5F6FA] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#1A2B4A] leading-tight">{c.property_name ?? '—'}</p>
                        <p className="text-xs text-gray-400">Unit {c.unit_number ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{c.tenant_name ?? '—'}</td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{formatMonth(c.charge_month)}</td>
                      <td className="px-5 py-4"><PaidCell expected={c.ha_amount} paid={haPaid} /></td>
                      <td className="px-5 py-4"><PaidCell expected={c.tenant_amount} paid={tenantPaid} /></td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-medium text-[#1A2B4A]">{fmt(totalPaid)}</p>
                        <p className="text-[10px] text-gray-400">of {fmt(totalDue)}</p>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={chargeStatus(c)} /></td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setRecordCharge(c)}
                          className="text-xs text-[#1C7BC0] font-medium hover:underline whitespace-nowrap"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {recordCharge && (
        <RecordPaymentModal
          charge={recordCharge}
          onClose={() => setRecordCharge(null)}
          onSaved={handleSaved}
        />
      )}
      {addChargeOpen && (
        <AddChargeModal
          leases={leases}
          onClose={() => setAddChargeOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
