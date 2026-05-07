'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  leaseId: string
  monthlyRent: number | null
  securityDeposit: number | null
  petRent: number | null
  petDeposit: number | null
  lateFeeFlat: number | null
  gracePeriodDays: number | null
  rentDueDay: number | null
  autoRenew: boolean | null
  renewalNoticeDays: number | null
  startDate: string | null
  endDate: string | null
}

function parseLocalDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((parseLocalDate(dateStr).getTime() - Date.now()) / 86400000)
}

function LeaseEndValue({ endDate }: { endDate: string | null }) {
  const days = daysUntil(endDate)
  const text = formatDate(endDate)
  if (days === null) return <span className="text-gray-700 text-sm">{text}</span>
  if (days < 0)
    return <span className="text-red-600 text-sm">{text} <span className="text-xs font-normal">(expired)</span></span>
  if (days <= 90)
    return <span className="text-amber-500 text-sm">{text} <span className="text-xs font-normal">({days}d left)</span></span>
  return <span className="text-gray-700 text-sm">{text}</span>
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return `$${n.toLocaleString()}`
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30'

export default function LeaseTermsCard({
  leaseId,
  monthlyRent,
  securityDeposit,
  petRent,
  petDeposit,
  lateFeeFlat,
  gracePeriodDays,
  rentDueDay,
  autoRenew,
  renewalNoticeDays,
  startDate,
  endDate,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [petRentVal, setPetRentVal] = useState(petRent != null ? String(petRent) : '')
  const [petDepositVal, setPetDepositVal] = useState(petDeposit != null ? String(petDeposit) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('leases')
      .update({
        pet_rent: petRentVal ? parseFloat(petRentVal) : null,
        pet_deposit: petDepositVal ? parseFloat(petDepositVal) : null,
      })
      .eq('id', leaseId)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    setEditing(false)
    setSaving(false)
    router.refresh()
  }

  function handleCancel() {
    setPetRentVal(petRent != null ? String(petRent) : '')
    setPetDepositVal(petDeposit != null ? String(petDeposit) : '')
    setError(null)
    setEditing(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#1A2B4A] font-semibold text-base">Lease Terms</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#1A2B4A] transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Monthly Rent</p>
          <p className="text-[#1A2B4A] font-semibold">{fmt(monthlyRent)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Security Deposit</p>
          <p className="text-[#1A2B4A] font-semibold">{fmt(securityDeposit)}</p>
        </div>

        {/* Pet Rent */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Pet Rent</p>
          {editing ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
              <input
                type="number" min="0" step="1" value={petRentVal}
                onChange={e => setPetRentVal(e.target.value)}
                className={`${inputCls} pl-6`} placeholder="0"
              />
            </div>
          ) : (
            <p className="text-[#1A2B4A] font-semibold">{fmt(petRent)}</p>
          )}
        </div>

        {/* Pet Deposit */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Pet Deposit</p>
          {editing ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
              <input
                type="number" min="0" step="1" value={petDepositVal}
                onChange={e => setPetDepositVal(e.target.value)}
                className={`${inputCls} pl-6`} placeholder="0"
              />
            </div>
          ) : (
            <p className="text-[#1A2B4A] font-semibold">{fmt(petDeposit)}</p>
          )}
        </div>

        {lateFeeFlat != null && lateFeeFlat > 0 && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Late Fee</p>
            <p className="text-[#1A2B4A] font-semibold">{fmt(lateFeeFlat)}</p>
          </div>
        )}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Start Date</p>
          <p className="text-gray-700 text-sm">{formatDate(startDate)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">End Date</p>
          <LeaseEndValue endDate={endDate} />
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Rent Due Day</p>
          <p className="text-gray-700 text-sm">{rentDueDay != null ? `Day ${rentDueDay}` : '—'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Grace Period</p>
          <p className="text-gray-700 text-sm">{gracePeriodDays != null ? `${gracePeriodDays} days` : '—'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Auto-Renew</p>
          <p className="text-gray-700 text-sm">{autoRenew ? 'Yes' : 'No'}</p>
        </div>
        {renewalNoticeDays != null && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Renewal Notice</p>
            <p className="text-gray-700 text-sm">{renewalNoticeDays} days</p>
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
          {error && <p className="text-red-600 text-xs flex-1">{error}</p>}
          <button
            onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-[#1C7BC0] text-white text-sm font-medium rounded-lg hover:bg-[#1C7BC0]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
