'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Property = { id: string; name: string }
type Unit = { id: string; unit_number: string; property_id: string }
type ActiveLease = { id: string; unit_id: string }

type TenantInfo = {
  first_name: string
  last_name: string
  email: string
  phone: string
  employer: string
  monthly_income: string
  credit_score: string
  emergency_contact_name: string
  emergency_contact_phone: string
  background_check_passed: boolean
  background_check_date: string
}

type LeaseInfo = {
  property_id: string
  unit_id: string
  is_cotenant: boolean
  existing_lease_id: string
  start_date: string
  end_date: string
  monthly_rent: string
  security_deposit: string
  pet_deposit: string
  rent_due_day: string
  grace_period_days: string
  auto_renew: boolean
  ha_assistance: boolean
  ha_amount: string
  ha_voucher_number: string
}

const inputCls =
  'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-[#1A2B4A] placeholder-gray-400 focus:outline-none focus:border-[#1C7BC0] transition-colors'
const labelCls = 'block text-sm font-medium text-gray-600 mb-1'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
          value
            ? 'bg-[#1C7BC0] border-[#1C7BC0] text-white font-medium'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
          !value
            ? 'bg-[#1C7BC0] border-[#1C7BC0] text-white font-medium'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        No
      </button>
    </div>
  )
}

function ReviewRow({
  label,
  value,
}: {
  label: string
  value: string | number | boolean | null | undefined
}) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-[#1A2B4A] text-sm font-medium">{display}</span>
    </div>
  )
}

const STEPS = [
  { num: 1, label: 'Tenant Info' },
  { num: 2, label: 'Lease Info' },
  { num: 3, label: 'Review & Submit' },
]

export default function TenantFormClient({
  properties,
  allUnits,
  activeLeases,
}: {
  properties: Property[]
  allUnits: Unit[]
  activeLeases: ActiveLease[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [tenantInfo, setTenantInfo] = useState<TenantInfo>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employer: '',
    monthly_income: '',
    credit_score: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    background_check_passed: false,
    background_check_date: '',
  })

  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo>({
    property_id: '',
    unit_id: '',
    is_cotenant: false,
    existing_lease_id: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    security_deposit: '',
    pet_deposit: '',
    rent_due_day: '1',
    grace_period_days: '5',
    auto_renew: true,
    ha_assistance: false,
    ha_amount: '',
    ha_voucher_number: '',
  })

  // Derived from props — no fetches needed
  const filteredUnits = useMemo(
    () => allUnits.filter((u) => u.property_id === leaseInfo.property_id),
    [allUnits, leaseInfo.property_id]
  )

  const filteredLeases = useMemo(
    () => activeLeases.filter((l) => l.unit_id === leaseInfo.unit_id),
    [activeLeases, leaseInfo.unit_id]
  )

  function updateTenant<K extends keyof TenantInfo>(key: K, value: TenantInfo[K]) {
    setTenantInfo((prev) => ({ ...prev, [key]: value }))
  }

  function updateLease<K extends keyof LeaseInfo>(key: K, value: LeaseInfo[K]) {
    setLeaseInfo((prev) => ({ ...prev, [key]: value }))
  }

  function handlePropertyChange(propertyId: string) {
    setLeaseInfo((prev) => ({ ...prev, property_id: propertyId, unit_id: '', existing_lease_id: '' }))
  }

  function handleUnitChange(unitId: string) {
    setLeaseInfo((prev) => ({ ...prev, unit_id: unitId, existing_lease_id: '' }))
  }

  function handleCotenatToggle(value: boolean) {
    setLeaseInfo((prev) => ({ ...prev, is_cotenant: value, existing_lease_id: '' }))
  }

  function step1Valid() {
    return (
      tenantInfo.first_name.trim() !== '' &&
      tenantInfo.last_name.trim() !== '' &&
      tenantInfo.email.trim() !== ''
    )
  }

  function step2Valid() {
    if (!leaseInfo.property_id || !leaseInfo.unit_id) return false
    if (leaseInfo.is_cotenant) return leaseInfo.existing_lease_id !== ''
    return leaseInfo.start_date !== '' && leaseInfo.end_date !== '' && leaseInfo.monthly_rent !== ''
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    try {
      const { data: tenantData, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          first_name: tenantInfo.first_name.trim(),
          last_name: tenantInfo.last_name.trim(),
          email: tenantInfo.email.trim(),
          phone: tenantInfo.phone.trim() || null,
          employer: tenantInfo.employer.trim() || null,
          monthly_income: tenantInfo.monthly_income ? Number(tenantInfo.monthly_income) : null,
          credit_score: tenantInfo.credit_score ? Number(tenantInfo.credit_score) : null,
          emergency_contact_name: tenantInfo.emergency_contact_name.trim() || null,
          emergency_contact_phone: tenantInfo.emergency_contact_phone.trim() || null,
          background_check_passed: tenantInfo.background_check_passed,
          background_check_date:
            tenantInfo.background_check_passed && tenantInfo.background_check_date
              ? tenantInfo.background_check_date
              : null,
        })
        .select('id')
        .single()

      if (tenantErr) throw tenantErr
      const tenantId = tenantData.id

      if (leaseInfo.is_cotenant) {
        const { error: ltErr } = await supabase.from('lease_tenants').insert({
          lease_id: leaseInfo.existing_lease_id,
          tenant_id: tenantId,
          is_primary: false,
        })
        if (ltErr) throw ltErr
      } else {
        const { data: leaseData, error: leaseErr } = await supabase
          .from('leases')
          .insert({
            unit_id: leaseInfo.unit_id,
            status: 'active',
            start_date: leaseInfo.start_date,
            end_date: leaseInfo.end_date,
            monthly_rent: Number(leaseInfo.monthly_rent),
            security_deposit: leaseInfo.security_deposit ? Number(leaseInfo.security_deposit) : null,
            pet_deposit: leaseInfo.pet_deposit ? Number(leaseInfo.pet_deposit) : null,
            rent_due_day: Number(leaseInfo.rent_due_day) || 1,
            grace_period_days: Number(leaseInfo.grace_period_days) || 5,
            auto_renew: leaseInfo.auto_renew,
            ha_amount: leaseInfo.ha_assistance && leaseInfo.ha_amount ? Number(leaseInfo.ha_amount) : null,
            ha_voucher_number: leaseInfo.ha_assistance && leaseInfo.ha_voucher_number.trim() ? leaseInfo.ha_voucher_number.trim() : null,
          })
          .select('id')
          .single()

        if (leaseErr) throw leaseErr

        const { error: ltErr } = await supabase.from('lease_tenants').insert({
          lease_id: leaseData.id,
          tenant_id: tenantId,
          is_primary: true,
        })
        if (ltErr) throw ltErr

        const { error: unitErr } = await supabase
          .from('units')
          .update({ status: 'occupied' })
          .eq('id', leaseInfo.unit_id)
        if (unitErr) throw unitErr
      }

      router.push('/tenants')
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const selectedProperty = properties.find((p) => p.id === leaseInfo.property_id)
  const selectedUnit = allUnits.find((u) => u.id === leaseInfo.unit_id)

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/tenants"
            className="text-sm text-gray-500 hover:text-[#1C7BC0] transition-colors inline-flex items-center gap-1 mb-4"
          >
            ← Back to Tenants
          </Link>
          <h1 className="text-2xl font-semibold text-[#1A2B4A]">Add Tenant</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  step === s.num
                    ? 'bg-[#1C7BC0] text-white'
                    : step > s.num
                    ? 'text-[#1C7BC0]'
                    : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    step === s.num
                      ? 'bg-white text-[#1C7BC0]'
                      : step > s.num
                      ? 'bg-[#1C7BC0] text-white border border-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-6 h-0.5 flex-shrink-0 ${step > s.num ? 'bg-[#1C7BC0]' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {/* ── Step 1: Tenant Info ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tenantInfo.first_name}
                    onChange={(e) => updateTenant('first_name', e.target.value)}
                    className={inputCls}
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tenantInfo.last_name}
                    onChange={(e) => updateTenant('last_name', e.target.value)}
                    className={inputCls}
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={tenantInfo.email}
                  onChange={(e) => updateTenant('email', e.target.value)}
                  className={inputCls}
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={tenantInfo.phone}
                  onChange={(e) => updateTenant('phone', e.target.value)}
                  className={inputCls}
                  placeholder="(555) 000-0000"
                />
              </div>

              <div>
                <label className={labelCls}>Employer</label>
                <input
                  type="text"
                  value={tenantInfo.employer}
                  onChange={(e) => updateTenant('employer', e.target.value)}
                  className={inputCls}
                  placeholder="ACME Corp"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Monthly income ($)</label>
                  <input
                    type="number"
                    value={tenantInfo.monthly_income}
                    onChange={(e) => updateTenant('monthly_income', e.target.value)}
                    className={inputCls}
                    placeholder="5000"
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelCls}>Credit score</label>
                  <input
                    type="number"
                    value={tenantInfo.credit_score}
                    onChange={(e) => updateTenant('credit_score', e.target.value)}
                    className={inputCls}
                    placeholder="720"
                    min="300"
                    max="850"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Emergency contact name</label>
                  <input
                    type="text"
                    value={tenantInfo.emergency_contact_name}
                    onChange={(e) => updateTenant('emergency_contact_name', e.target.value)}
                    className={inputCls}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className={labelCls}>Emergency contact phone</label>
                  <input
                    type="tel"
                    value={tenantInfo.emergency_contact_phone}
                    onChange={(e) => updateTenant('emergency_contact_phone', e.target.value)}
                    className={inputCls}
                    placeholder="(555) 000-0001"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Background check passed</label>
                <Toggle
                  value={tenantInfo.background_check_passed}
                  onChange={(v) => updateTenant('background_check_passed', v)}
                />
              </div>

              {tenantInfo.background_check_passed && (
                <div>
                  <label className={labelCls}>Background check date</label>
                  <input
                    type="date"
                    value={tenantInfo.background_check_date}
                    onChange={(e) => updateTenant('background_check_date', e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Lease Info ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Property</label>
                <select
                  value={leaseInfo.property_id}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select a property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {leaseInfo.property_id && (
                <div>
                  <label className={labelCls}>Unit</label>
                  {filteredUnits.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      No vacant units available for this property.
                    </p>
                  ) : (
                    <select
                      value={leaseInfo.unit_id}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select a unit...</option>
                      {filteredUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unit_number}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {leaseInfo.unit_id && (
                <div>
                  <label className={labelCls}>
                    Is this tenant a co-tenant on an existing lease?
                  </label>
                  <Toggle value={leaseInfo.is_cotenant} onChange={handleCotenatToggle} />
                </div>
              )}

              {leaseInfo.unit_id && leaseInfo.is_cotenant && (
                <div>
                  <label className={labelCls}>Existing lease</label>
                  {filteredLeases.length === 0 ? (
                    <p className="text-sm text-amber-600 py-2">
                      No active leases found for this unit.
                    </p>
                  ) : (
                    <select
                      value={leaseInfo.existing_lease_id}
                      onChange={(e) => updateLease('existing_lease_id', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select a lease...</option>
                      {filteredLeases.map((l) => (
                        <option key={l.id} value={l.id}>
                          Lease {l.id.slice(0, 8)}…
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {leaseInfo.unit_id && !leaseInfo.is_cotenant && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>
                        Start date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={leaseInfo.start_date}
                        onChange={(e) => updateLease('start_date', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        End date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={leaseInfo.end_date}
                        onChange={(e) => updateLease('end_date', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>
                      Monthly rent ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={leaseInfo.monthly_rent}
                      onChange={(e) => updateLease('monthly_rent', e.target.value)}
                      className={inputCls}
                      placeholder="1500"
                      min="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Security deposit ($)</label>
                      <input
                        type="number"
                        value={leaseInfo.security_deposit}
                        onChange={(e) => updateLease('security_deposit', e.target.value)}
                        className={inputCls}
                        placeholder="1500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Pet deposit ($)</label>
                      <input
                        type="number"
                        value={leaseInfo.pet_deposit}
                        onChange={(e) => updateLease('pet_deposit', e.target.value)}
                        className={inputCls}
                        placeholder="300"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Rent due day</label>
                      <input
                        type="number"
                        value={leaseInfo.rent_due_day}
                        onChange={(e) => updateLease('rent_due_day', e.target.value)}
                        className={inputCls}
                        min="1"
                        max="31"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Grace period (days)</label>
                      <input
                        type="number"
                        value={leaseInfo.grace_period_days}
                        onChange={(e) => updateLease('grace_period_days', e.target.value)}
                        className={inputCls}
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Auto-renew</label>
                    <Toggle
                      value={leaseInfo.auto_renew}
                      onChange={(v) => updateLease('auto_renew', v)}
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                      Housing Authority
                    </p>
                    <div>
                      <label className={labelCls}>Receives Housing Authority assistance?</label>
                      <Toggle
                        value={leaseInfo.ha_assistance}
                        onChange={(v) => updateLease('ha_assistance', v)}
                      />
                    </div>
                  </div>

                  {leaseInfo.ha_assistance && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>HA Monthly Amount ($)</label>
                          <input
                            type="number"
                            value={leaseInfo.ha_amount}
                            onChange={(e) => updateLease('ha_amount', e.target.value)}
                            className={inputCls}
                            placeholder="800"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Tenant Portion ($)</label>
                          <input
                            type="text"
                            readOnly
                            value={
                              leaseInfo.monthly_rent && leaseInfo.ha_amount
                                ? Math.max(
                                    0,
                                    Number(leaseInfo.monthly_rent) - Number(leaseInfo.ha_amount)
                                  ).toLocaleString()
                                : leaseInfo.monthly_rent
                                ? Number(leaseInfo.monthly_rent).toLocaleString()
                                : ''
                            }
                            className={`${inputCls} bg-gray-50 text-gray-500 cursor-default`}
                            placeholder="Auto-calculated"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Voucher / Case Number</label>
                        <input
                          type="text"
                          value={leaseInfo.ha_voucher_number}
                          onChange={(e) => updateLease('ha_voucher_number', e.target.value)}
                          className={inputCls}
                          placeholder="Optional"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Review & Submit ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Tenant Information
                </h3>
                <div className="bg-gray-50 rounded-lg px-4">
                  <ReviewRow
                    label="Name"
                    value={`${tenantInfo.first_name} ${tenantInfo.last_name}`}
                  />
                  <ReviewRow label="Email" value={tenantInfo.email} />
                  <ReviewRow label="Phone" value={tenantInfo.phone} />
                  <ReviewRow label="Employer" value={tenantInfo.employer} />
                  <ReviewRow
                    label="Monthly income"
                    value={
                      tenantInfo.monthly_income
                        ? `$${Number(tenantInfo.monthly_income).toLocaleString()}`
                        : ''
                    }
                  />
                  <ReviewRow label="Credit score" value={tenantInfo.credit_score} />
                  <ReviewRow label="Emergency contact" value={tenantInfo.emergency_contact_name} />
                  <ReviewRow
                    label="Emergency contact phone"
                    value={tenantInfo.emergency_contact_phone}
                  />
                  <ReviewRow
                    label="Background check passed"
                    value={tenantInfo.background_check_passed}
                  />
                  {tenantInfo.background_check_passed && (
                    <ReviewRow
                      label="Background check date"
                      value={tenantInfo.background_check_date}
                    />
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Lease Information
                </h3>
                <div className="bg-gray-50 rounded-lg px-4">
                  <ReviewRow label="Property" value={selectedProperty?.name} />
                  <ReviewRow
                    label="Unit"
                    value={selectedUnit ? `Unit ${selectedUnit.unit_number}` : ''}
                  />
                  <ReviewRow label="Co-tenant" value={leaseInfo.is_cotenant} />
                  {!leaseInfo.is_cotenant && (
                    <>
                      <ReviewRow label="Lease start" value={leaseInfo.start_date} />
                      <ReviewRow label="Lease end" value={leaseInfo.end_date} />
                      <ReviewRow
                        label="Monthly rent"
                        value={
                          leaseInfo.monthly_rent
                            ? `$${Number(leaseInfo.monthly_rent).toLocaleString()}`
                            : ''
                        }
                      />
                      <ReviewRow
                        label="Security deposit"
                        value={
                          leaseInfo.security_deposit
                            ? `$${Number(leaseInfo.security_deposit).toLocaleString()}`
                            : ''
                        }
                      />
                      <ReviewRow
                        label="Pet deposit"
                        value={
                          leaseInfo.pet_deposit
                            ? `$${Number(leaseInfo.pet_deposit).toLocaleString()}`
                            : ''
                        }
                      />
                      <ReviewRow label="Rent due day" value={`Day ${leaseInfo.rent_due_day}`} />
                      <ReviewRow
                        label="Grace period"
                        value={`${leaseInfo.grace_period_days} days`}
                      />
                      <ReviewRow label="Auto-renew" value={leaseInfo.auto_renew} />
                      <ReviewRow label="HA Assistance" value={leaseInfo.ha_assistance} />
                      {leaseInfo.ha_assistance && (
                        <>
                          <ReviewRow
                            label="HA Amount"
                            value={
                              leaseInfo.ha_amount
                                ? `$${Number(leaseInfo.ha_amount).toLocaleString()}`
                                : ''
                            }
                          />
                          <ReviewRow
                            label="Tenant Portion"
                            value={
                              leaseInfo.monthly_rent && leaseInfo.ha_amount
                                ? `$${Math.max(0, Number(leaseInfo.monthly_rent) - Number(leaseInfo.ha_amount)).toLocaleString()}`
                                : ''
                            }
                          />
                          <ReviewRow label="Voucher / Case #" value={leaseInfo.ha_voucher_number} />
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((s) => s - 1) : router.push('/tenants'))}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 bg-white rounded-lg hover:border-gray-300 transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !step1Valid() : !step2Valid()}
              className="px-6 py-2.5 text-sm font-semibold bg-[#1C7BC0] hover:bg-[#1C7BC0]/90 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-semibold bg-[#1C7BC0] hover:bg-[#1C7BC0]/90 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {submitting ? 'Saving…' : 'Add Tenant'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
