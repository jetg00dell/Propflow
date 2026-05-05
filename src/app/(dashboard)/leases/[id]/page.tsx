import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

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

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'active')
    return <span className="bg-[#F0F7FF] text-[#1C7BC0] text-xs px-2 py-0.5 rounded-full">Active</span>
  if (status === 'expired')
    return <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full">Expired</span>
  return <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full capitalize">{status ?? '—'}</span>
}

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: lease, error: leaseError } = await admin
    .from('leases')
    .select('id, unit_id, status, start_date, end_date, monthly_rent, security_deposit, pet_deposit, late_fee_flat, grace_period_days, rent_due_day, auto_renew, renewal_notice_days')
    .eq('id', id)
    .single()

  if (leaseError) console.error('Lease fetch error:', JSON.stringify(leaseError))
  if (!lease) notFound()

  const { data: unit } = await admin
    .from('units')
    .select('id, unit_number, property_id')
    .eq('id', lease.unit_id)
    .single()

  const { data: leaseTenants } = await admin
    .from('lease_tenants')
    .select('tenant_id, is_primary')
    .eq('lease_id', id)

  const tenantIds = (leaseTenants ?? []).map((lt: any) => lt.tenant_id).filter(Boolean)

  let property: any = null
  if (unit) {
    const { data } = await admin
      .from('properties')
      .select('id, name, address, city, state')
      .eq('id', unit.property_id)
      .single()
    property = data
  }

  let tenants: any[] = []
  if (tenantIds.length > 0) {
    const { data } = await admin
      .from('tenants')
      .select('id, first_name, last_name, email, phone')
      .in('id', tenantIds)
    tenants = data ?? []
  }

  const tenantMap: Record<string, any> = Object.fromEntries(tenants.map(t => [t.id, t]))
  const leaseTenantsList = (leaseTenants ?? [])
    .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    .map((lt: any) => ({ ...tenantMap[lt.tenant_id], is_primary: lt.is_primary }))
    .filter((t: any) => t?.id)

  const propertyLabel = property?.name
    ? `${property.name}${unit?.unit_number ? ` — Unit ${unit.unit_number}` : ''}`
    : unit?.unit_number ? `Unit ${unit.unit_number}` : 'Lease'

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="mb-6">
        <Link href="/leases" className="text-gray-500 hover:text-[#1C7BC0] text-sm transition-colors flex items-center gap-1">
          ← Back to Leases
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A2B4A]">{propertyLabel}</h1>
          {property && (
            <p className="text-gray-500 mt-0.5">{property.address}, {property.city}, {property.state}</p>
          )}
        </div>
        <StatusBadge status={lease.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-[#1A2B4A] font-semibold text-base mb-4">Lease Terms</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Monthly Rent</p>
                <p className="text-[#1A2B4A] font-semibold">
                  {lease.monthly_rent != null ? `$${(lease.monthly_rent as number).toLocaleString()}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Security Deposit</p>
                <p className="text-[#1A2B4A] font-semibold">
                  {lease.security_deposit != null ? `$${(lease.security_deposit as number).toLocaleString()}` : '—'}
                </p>
              </div>
              {(lease.pet_deposit as number | null) != null && (lease.pet_deposit as number) > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Pet Deposit</p>
                  <p className="text-[#1A2B4A] font-semibold">${(lease.pet_deposit as number).toLocaleString()}</p>
                </div>
              )}
              {(lease.late_fee_flat as number | null) != null && (lease.late_fee_flat as number) > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Late Fee</p>
                  <p className="text-[#1A2B4A] font-semibold">${(lease.late_fee_flat as number).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Start Date</p>
                <p className="text-gray-700 text-sm">{formatDate(lease.start_date as string | null)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">End Date</p>
                <LeaseEndValue endDate={lease.end_date as string | null} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Rent Due Day</p>
                <p className="text-gray-700 text-sm">
                  {lease.rent_due_day != null ? `Day ${lease.rent_due_day}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Grace Period</p>
                <p className="text-gray-700 text-sm">
                  {lease.grace_period_days != null ? `${lease.grace_period_days} days` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Auto-Renew</p>
                <p className="text-gray-700 text-sm">{lease.auto_renew ? 'Yes' : 'No'}</p>
              </div>
              {lease.renewal_notice_days != null && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Renewal Notice</p>
                  <p className="text-gray-700 text-sm">{lease.renewal_notice_days as number} days</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 h-fit">
          <h2 className="text-[#1A2B4A] font-semibold text-base mb-4">Tenants</h2>
          {leaseTenantsList.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No tenants on record.</p>
          ) : (
            <div className="space-y-4">
              {leaseTenantsList.map((t: any) => (
                <div key={t.id}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/tenants/${t.id}`}
                      className="text-[#1A2B4A] text-sm font-medium hover:text-[#1C7BC0] transition-colors"
                    >
                      {t.first_name} {t.last_name}
                    </Link>
                    {t.is_primary && (
                      <span className="text-gray-500 text-xs border border-gray-200 rounded px-1.5 py-0.5 leading-none">
                        Primary
                      </span>
                    )}
                  </div>
                  {t.email && <p className="text-gray-500 text-xs mt-0.5">{t.email}</p>}
                  {t.phone && <p className="text-gray-500 text-xs">{t.phone}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
