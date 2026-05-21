'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ChargeForModal = {
  id: string
  lease_id: string
  charge_month: string  // YYYY-MM-DD
  total_due: number
  ha_amount: number
  tenant_amount: number
  property_name?: string | null
  unit_number?: string | null
}

export type ModalLease = {
  id: string
  property_name: string | null
  unit_number: string | null
  tenant_name: string | null
  monthly_rent: number | null
}

type NextMonthPrompt = {
  needed: boolean
  isPartial: boolean
  nextMonth: string
  nextMonthDate: string
  suggestedCharge: {
    total_due: number
    ha_amount: number
    tenant_amount: number
    late_fee_flat: number
    ha_remaining: number
    tenant_remaining: number
  }
}

type Props = {
  charge?: ChargeForModal       // charge-row mode: pre-selected charge, no lease/month picker
  leases?: ModalLease[]         // standalone mode: show lease selector
  prefilledLeaseId?: string     // prefilled mode (expenses done screen)
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

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

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
  charge,
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
  const isChargeMode = !!charge
  const hasLeaseSelector = !isChargeMode && !!leases && !prefilledLeaseId

  // Lease / month (non-charge mode only)
  const [leaseId, setLeaseId] = useState(prefilledLeaseId ?? leases?.[0]?.id ?? '')
  const [chargeMonth, setChargeMonth] = useState(prefilledChargeMonth ?? currentMonthStr())

  // Charge check state (non-charge mode)
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle')
  const [foundChargeId, setFoundChargeId] = useState<string | null>(null)
  const [haAmount, setHaAmount] = useState('0')
  const [tenantAmount, setTenantAmount] = useState('')

  // Payment form
  const [amount, setAmount] = useState(prefilledAmount ?? '')
  const [paidBy, setPaidBy] = useState<'ha' | 'tenant'>('tenant')
  const [method, setMethod] = useState(prefilledMethod ?? 'zelle')
  const [paidDate, setPaidDate] = useState(prefilledPaidDate ?? todayStr())
  const [notes, setNotes] = useState(prefilledNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Two-step next-month flow
  const [step, setStep] = useState<'form' | 'next-month'>('form')
  const [nextMonthData, setNextMonthData] = useState<NextMonthPrompt | null>(null)
  const [lateFee, setLateFee] = useState('0')
  const [nextNotes, setNextNotes] = useState('')
  const [creating, setCreating] = useState(false)

  // Non-charge mode: check for existing charge whenever lease/month changes
  useEffect(() => {
    if (isChargeMode) return
    if (!leaseId || !chargeMonth) {
      setCheckStatus('idle')
      setFoundChargeId(null)
      return
    }
    const chargeMonthDate = `${chargeMonth}-01`
    setCheckStatus('checking')
    setFoundChargeId(null)
    fetch(`/api/payments/record?lease_id=${encodeURIComponent(leaseId)}&charge_month=${encodeURIComponent(chargeMonthDate)}`)
      .then(r => r.json())
      .then(data => {
        if (data.charge) {
          setCheckStatus('found')
          setFoundChargeId(data.charge.id)
        } else {
          setCheckStatus('not_found')
          setFoundChargeId(null)
          if (data.lease_defaults) {
            setHaAmount(String(data.lease_defaults.ha_amount ?? 0))
            setTenantAmount(String(data.lease_defaults.tenant_amount ?? data.lease_defaults.monthly_rent ?? ''))
          }
        }
      })
      .catch(() => setCheckStatus('idle'))
  }, [leaseId, chargeMonth, isChargeMode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, any> = {
        amount: parseFloat(amount),
        paid_by: paidBy,
        method,
        paid_date: paidDate,
        notes: notes || null,
      }

      if (isChargeMode) {
        body.charge_id = charge!.id
      } else if (foundChargeId) {
        body.charge_id = foundChargeId
      } else {
        // No existing charge — route will auto-create
        body.lease_id = leaseId
        body.charge_month = `${chargeMonth}-01`
        body.ha_amount = parseFloat(haAmount) || 0
        body.tenant_amount = parseFloat(tenantAmount) || 0
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')

      const prompt = data.nextMonthPrompt as NextMonthPrompt | null
      if (prompt?.needed) {
        if (!prompt.isPartial) {
          // Fully paid — silently create next month charge then close
          const supabase = createClient()
          await supabase.from('rent_charges').insert({
            lease_id: isChargeMode ? charge!.lease_id : leaseId,
            charge_month: prompt.nextMonthDate,
            ha_amount: prompt.suggestedCharge.ha_amount,
            tenant_amount: prompt.suggestedCharge.tenant_amount,
            total_due: prompt.suggestedCharge.total_due,
            notes: null,
          })
          onSaved()
        } else {
          setLateFee(String(prompt.suggestedCharge.late_fee_flat ?? 0))
          setNextMonthData(prompt)
          setStep('next-month')
        }
      } else {
        onSaved()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateNextCharge() {
    if (!nextMonthData) return
    setCreating(true)
    setError(null)
    try {
      const fee = parseFloat(lateFee) || 0
      const supabase = createClient()
      const { error: insertErr } = await supabase.from('rent_charges').insert({
        lease_id: isChargeMode ? charge!.lease_id : leaseId,
        charge_month: nextMonthData.nextMonthDate,
        ha_amount: nextMonthData.suggestedCharge.ha_amount,
        tenant_amount: nextMonthData.suggestedCharge.tenant_amount,
        total_due: nextMonthData.suggestedCharge.total_due + fee,
        notes: nextNotes || null,
      })
      if (insertErr && (insertErr as any).code !== '23505') throw new Error(insertErr.message)
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const selectedLease = leases?.find(l => l.id === leaseId)
  const displayTitle = prefilledTitle
    ?? (isChargeMode && charge?.property_name
        ? `${charge.property_name} — Unit ${charge.unit_number}`
        : selectedLease
        ? `${selectedLease.property_name} — Unit ${selectedLease.unit_number}`
        : '')
  const displaySubtitle = isChargeMode && charge?.charge_month
    ? formatMonth(charge.charge_month)
    : null

  const submitDisabled = saving
    || !amount
    || (!isChargeMode && checkStatus === 'checking')

  // Step 2 — next month charge prompt
  if (step === 'next-month' && nextMonthData) {
    const haRemaining = nextMonthData.suggestedCharge.ha_remaining ?? 0
    const tenantRemaining = nextMonthData.suggestedCharge.tenant_remaining ?? 0
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-base font-semibold text-[#1A2B4A] mb-1">
            Create {nextMonthData.nextMonth} Charge?
          </h2>
          {displayTitle && <p className="text-xs text-gray-400 mb-5">{displayTitle}</p>}

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 mb-4">
            <p className="text-xs font-medium text-amber-800 mb-1">This month is not fully paid:</p>
            {haRemaining > 0 && (
              <p className="text-xs text-amber-700">HA balance: {fmt(haRemaining)} remaining</p>
            )}
            {tenantRemaining > 0 && (
              <p className="text-xs text-amber-700">Tenant balance: {fmt(tenantRemaining)} remaining</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Late Fee <span className="text-gray-300 font-normal">(set to $0 to waive)</span>
              </label>
              <input
                type="number" min="0" step="0.01"
                value={lateFee}
                onChange={e => setLateFee(e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Notes <span className="text-gray-300 font-normal">(optional)</span>
              </label>
              <textarea
                value={nextNotes}
                onChange={e => setNextNotes(e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="e.g. HA short — waiving late fee, following up"
              />
            </div>
            <div className="flex justify-between items-center px-3 py-2 bg-[#F0F7FF] rounded-lg border border-[#1C7BC0]/20">
              <span className="text-xs font-medium text-gray-500">
                Total Due ({nextMonthData.nextMonth})
              </span>
              <span className="text-sm font-semibold text-[#1A2B4A]">
                {fmt(nextMonthData.suggestedCharge.total_due + (parseFloat(lateFee) || 0))}
              </span>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onSaved} className={btnSecondary}>
                Skip for now
              </button>
              <button type="button" onClick={handleCreateNextCharge} disabled={creating} className={btnPrimary}>
                {creating ? 'Creating…' : 'Create Charge'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 1 — payment form
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[#1A2B4A] mb-1">Record Payment</h2>
        {(displayTitle || displaySubtitle) && (
          <p className="text-xs text-gray-400 mb-5">
            {displayTitle}{displaySubtitle ? ` · ${displaySubtitle}` : ''}
          </p>
        )}

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

          {!isChargeMode && (
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
          )}

          {!isChargeMode && checkStatus === 'checking' && (
            <p className="text-xs text-gray-400">Checking for existing charge…</p>
          )}
          {!isChargeMode && checkStatus === 'found' && (
            <p className="text-xs text-green-600">✓ Charge found for {formatMonth(chargeMonth)}</p>
          )}
          {!isChargeMode && checkStatus === 'not_found' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
              <p className="text-xs font-medium text-amber-800 mb-2">
                No charge found for {formatMonth(chargeMonth)} — will auto-create:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">HA Amount</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={haAmount}
                    onChange={e => setHaAmount(e.target.value)}
                    className={inputCls} placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Tenant Amount</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={tenantAmount}
                    onChange={e => setTenantAmount(e.target.value)}
                    className={inputCls} placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Amount</label>
            <input
              type="number" min="0" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={inputCls} placeholder="0.00" required
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
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    paidBy === v
                      ? 'bg-[#1C7BC0] text-white border-[#1C7BC0]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-[#1C7BC0]'
                  }`}
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
              className={inputCls} required
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
            <button type="submit" disabled={submitDisabled} className={btnPrimary}>
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
