'use client'

import { useState } from 'react'

export type UtilityProperty = {
  id: string
  electric_provider: string | null
  electric_paid_by: string | null
  electric_account: string | null
  gas_provider: string | null
  gas_paid_by: string | null
  gas_account: string | null
  water_provider: string | null
  water_paid_by: string | null
  water_account: string | null
  sewer_provider: string | null
  sewer_paid_by: string | null
  sewer_account: string | null
  trash_provider: string | null
  trash_paid_by: string | null
  trash_account: string | null
}

type FormState = {
  electric_provider: string
  electric_paid_by: string
  electric_account: string
  gas_provider: string
  gas_paid_by: string
  gas_account: string
  water_provider: string
  water_paid_by: string
  water_account: string
  sewer_provider: string
  sewer_paid_by: string
  sewer_account: string
  trash_provider: string
  trash_paid_by: string
  trash_account: string
}

type UtilityConfig = {
  label: string
  providerKey: keyof FormState
  paidByKey: keyof FormState
  accountKey: keyof FormState
}

const UTILITIES: UtilityConfig[] = [
  { label: 'ELECTRIC', providerKey: 'electric_provider', paidByKey: 'electric_paid_by', accountKey: 'electric_account' },
  { label: 'GAS',      providerKey: 'gas_provider',      paidByKey: 'gas_paid_by',      accountKey: 'gas_account' },
  { label: 'WATER',    providerKey: 'water_provider',    paidByKey: 'water_paid_by',    accountKey: 'water_account' },
  { label: 'SEWER',    providerKey: 'sewer_provider',    paidByKey: 'sewer_paid_by',    accountKey: 'sewer_account' },
  { label: 'TRASH',    providerKey: 'trash_provider',    paidByKey: 'trash_paid_by',    accountKey: 'trash_account' },
]

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30'

export default function EditUtilitiesModal({
  property,
  onClose,
  onSaved,
}: {
  property: UtilityProperty
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>({
    electric_provider: property.electric_provider ?? '',
    electric_paid_by:  property.electric_paid_by  ?? '',
    electric_account:  property.electric_account  ?? '',
    gas_provider:      property.gas_provider      ?? '',
    gas_paid_by:       property.gas_paid_by       ?? '',
    gas_account:       property.gas_account       ?? '',
    water_provider:    property.water_provider    ?? '',
    water_paid_by:     property.water_paid_by     ?? '',
    water_account:     property.water_account     ?? '',
    sewer_provider:    property.sewer_provider    ?? '',
    sewer_paid_by:     property.sewer_paid_by     ?? '',
    sewer_account:     property.sewer_account     ?? '',
    trash_provider:    property.trash_provider    ?? '',
    trash_paid_by:     property.trash_paid_by     ?? '',
    trash_account:     property.trash_account     ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#1A2B4A]">Edit Utilities</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {UTILITIES.map(({ label, providerKey, paidByKey, accountKey }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Provider</label>
                  <input
                    type="text"
                    value={form[providerKey]}
                    onChange={e => setField(providerKey, e.target.value)}
                    className={inputCls}
                    placeholder="e.g. PG&E"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Account # <span className="text-gray-300 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={form[accountKey]}
                    onChange={e => setField(accountKey, e.target.value)}
                    className={inputCls}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Paid by</label>
                <div className="flex gap-2">
                  {(['Landlord', 'Tenant'] as const).map(opt => {
                    const val = opt.toLowerCase()
                    const active = form[paidByKey] === val
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setField(paidByKey, active ? '' : val)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          active
                            ? 'bg-[#1C7BC0] text-white'
                            : 'border border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="px-6 pb-2 text-xs text-red-600">{error}</p>}

        <div className="flex gap-3 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-[#1C7BC0] text-white text-sm font-medium hover:bg-[#1669A8] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
