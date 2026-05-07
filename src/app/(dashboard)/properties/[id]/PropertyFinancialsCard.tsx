'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  propertyId: string
  estimatedValue: number | null
  purchasePrice: number | null
  cashInvested: number | null
  lastValueUpdate: string | null
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return `$${n.toLocaleString()}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30'

export default function PropertyFinancialsCard({
  propertyId,
  estimatedValue,
  purchasePrice,
  cashInvested,
  lastValueUpdate,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [estValue, setEstValue] = useState(estimatedValue != null ? String(estimatedValue) : '')
  const [purPrice, setPurPrice] = useState(purchasePrice != null ? String(purchasePrice) : '')
  const [cashInv, setCashInv] = useState(cashInvested != null ? String(cashInvested) : '')
  const [lastUpdate, setLastUpdate] = useState(lastValueUpdate ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('properties')
      .update({
        estimated_value: estValue ? parseFloat(estValue) : null,
        purchase_price: purPrice ? parseFloat(purPrice) : null,
        cash_invested: cashInv ? parseFloat(cashInv) : null,
        last_value_update: lastUpdate || null,
      })
      .eq('id', propertyId)
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
    setEstValue(estimatedValue != null ? String(estimatedValue) : '')
    setPurPrice(purchasePrice != null ? String(purchasePrice) : '')
    setCashInv(cashInvested != null ? String(cashInvested) : '')
    setLastUpdate(lastValueUpdate ?? '')
    setError(null)
    setEditing(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#1A2B4A] font-semibold text-base">Financial Metrics</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#1A2B4A] transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Estimated Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                <input
                  type="number" min="0" step="1" value={estValue}
                  onChange={e => setEstValue(e.target.value)}
                  className={`${inputCls} pl-6`} placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                <input
                  type="number" min="0" step="1" value={purPrice}
                  onChange={e => setPurPrice(e.target.value)}
                  className={`${inputCls} pl-6`} placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Cash Invested</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                <input
                  type="number" min="0" step="1" value={cashInv}
                  onChange={e => setCashInv(e.target.value)}
                  className={`${inputCls} pl-6`} placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Last Value Update</label>
              <input
                type="date" value={lastUpdate}
                onChange={e => setLastUpdate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
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
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Estimated Value</p>
            <p className="text-[#1A2B4A] font-semibold">{fmt(estimatedValue)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Purchase Price</p>
            <p className="text-[#1A2B4A] font-semibold">{fmt(purchasePrice)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Cash Invested</p>
            <p className="text-[#1A2B4A] font-semibold">{fmt(cashInvested)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Last Value Update</p>
            <p className="text-[#1A2B4A] font-semibold">{formatDate(lastValueUpdate)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
