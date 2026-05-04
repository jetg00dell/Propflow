import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

function getPropertyTypeLabel(type: string) {
  const labels: Record<string, string> = {
    single_family: 'Single Family',
    multi_family: 'Multi Family',
    condo: 'Condo',
    townhouse: 'Townhouse',
    commercial: 'Commercial',
    sfh_adu: 'SFH + ADU',
  }
  return labels[type] ?? type
}

function getStatusBadge(status: string) {
  if (status === 'occupied') {
    return (
      <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-xs px-2 py-0.5 rounded-full">
        Occupied
      </span>
    )
  }
  if (status === 'vacant') {
    return (
      <span className="bg-red-900/50 text-red-400 border border-red-800 text-xs px-2 py-0.5 rounded-full">
        Vacant
      </span>
    )
  }
  return (
    <span className="bg-gray-800 text-gray-400 border border-gray-700 text-xs px-2 py-0.5 rounded-full">
      {status}
    </span>
  )
}

type PaidBy = string | null

function PaidByBadge({ paidBy }: { paidBy: PaidBy }) {
  if (!paidBy) return null
  const lower = paidBy.toLowerCase()
  if (lower === 'tenant')
    return <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-xs px-2 py-0.5 rounded-full">Tenant</span>
  if (lower === 'landlord')
    return <span className="bg-blue-900/50 text-blue-400 border border-blue-800 text-xs px-2 py-0.5 rounded-full">Landlord</span>
  return <span className="bg-gray-800 text-gray-400 border border-gray-700 text-xs px-2 py-0.5 rounded-full capitalize">{paidBy}</span>
}

function UtilityRow({ label, provider, paidBy, account }: { label: string; provider: string | null; paidBy: PaidBy; account: string | null }) {
  if (!provider && !paidBy) return null
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-gray-800/60 last:border-0">
      <span className="text-gray-500 text-xs uppercase tracking-wider w-14 flex-shrink-0">{label}</span>
      <span className="text-gray-300 text-sm flex-1">{provider ?? '—'}</span>
      <PaidByBadge paidBy={paidBy} />
      {account && <span className="text-gray-600 text-xs font-mono">{account}</span>}
    </div>
  )
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

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select(`
      id,
      address,
      city,
      state,
      property_type,
      electric_provider, electric_paid_by, electric_account,
      gas_provider, gas_paid_by, gas_account,
      water_provider, water_paid_by, water_account,
      sewer_provider, sewer_paid_by, sewer_account,
      trash_provider, trash_paid_by, trash_account,
      hoa_fee, hoa_covers,
      units (
        id,
        unit_number,
        status,
        market_rent
      )
    `)
    .eq('id', id)
    .single()

  if (propertyError) {
    console.error('Property fetch error:', JSON.stringify(propertyError))
  }
  if (!property) notFound()

  const admin = createAdminClient()
  const unitIds = (property.units ?? []).map((u: any) => u.id)

  const { data: leases } = unitIds.length > 0
    ? await admin
        .from('leases')
        .select('id, unit_id, start_date, end_date, monthly_rent, status')
        .in('unit_id', unitIds)
        .eq('status', 'active')
    : { data: [] }

  const leaseUnitIds = (leases ?? []).map((l: any) => l.unit_id).filter(Boolean)
  const { data: leaseTenants } = leaseUnitIds.length > 0
    ? await admin
        .from('lease_tenants')
        .select('lease_id, tenant_id, is_primary')
        .in('lease_id', (leases ?? []).map((l: any) => l.id))
    : { data: [] }

  const tenantIds = [...new Set((leaseTenants ?? []).map((lt: any) => lt.tenant_id).filter(Boolean))]
  const { data: tenants } = tenantIds.length > 0
    ? await admin
        .from('tenants')
        .select('id, first_name, last_name, email, phone')
        .in('id', tenantIds)
    : { data: [] }

  const tenantMap: Record<string, any> = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]))
  const primaryTenantByLease: Record<string, any> = {}
  for (const lt of (leaseTenants ?? [])) {
    const lid = (lt as any).lease_id
    if ((lt as any).is_primary || !primaryTenantByLease[lid]) {
      primaryTenantByLease[lid] = tenantMap[(lt as any).tenant_id]
    }
  }

  const { data: recentPayments } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      paid_date,
      type,
      status,
      unit_id
    `)
    .in('unit_id', unitIds)
    .order('paid_date', { ascending: false })
    .limit(10)

  const units = property.units ?? []
  const occupied = units.filter((u: any) => u.status === 'occupied').length

  const leaseByUnit: Record<string, any> = {}
  for (const lease of (leases ?? [])) {
    leaseByUnit[(lease as any).unit_id] = {
      ...lease,
      tenant: primaryTenantByLease[(lease as any).id] ?? null,
    }
  }

  const monthlyRevenue = (leases ?? []).reduce((sum: number, l: any) => sum + (l.monthly_rent ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mb-6">
        <Link href="/properties" className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1">
          ← Back to Properties
        </Link>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">{property.address}</h1>
            <p className="text-gray-400 mt-0.5">{property.city}, {property.state}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-md border border-gray-700">
                {getPropertyTypeLabel(property.property_type ?? '')}
              </span>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
            Edit Property
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-800">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Units</p>
            <p className="text-white text-xl font-bold">{units.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Occupied</p>
            <p className="text-emerald-400 text-xl font-bold">{occupied}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Vacant</p>
            <p className="text-red-400 text-xl font-bold">{units.length - occupied}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Monthly Revenue</p>
            <p className="text-white text-xl font-bold">
              {monthlyRevenue === 0 ? '—' : `$${monthlyRevenue.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Utilities + HOA */}
      {(property.electric_provider || property.electric_paid_by ||
        property.gas_provider || property.gas_paid_by ||
        property.water_provider || property.water_paid_by ||
        property.sewer_provider || property.sewer_paid_by ||
        property.trash_provider || property.trash_paid_by ||
        property.hoa_fee != null) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold text-base mb-3">Utilities</h2>
          <UtilityRow label="Electric" provider={property.electric_provider} paidBy={property.electric_paid_by} account={property.electric_account} />
          <UtilityRow label="Gas" provider={property.gas_provider} paidBy={property.gas_paid_by} account={property.gas_account} />
          <UtilityRow label="Water" provider={property.water_provider} paidBy={property.water_paid_by} account={property.water_account} />
          <UtilityRow label="Sewer" provider={property.sewer_provider} paidBy={property.sewer_paid_by} account={property.sewer_account} />
          <UtilityRow label="Trash" provider={property.trash_provider} paidBy={property.trash_paid_by} account={property.trash_account} />
          {property.hoa_fee != null && (
            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-6">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">HOA Fee</p>
                <p className="text-white font-semibold">${(property.hoa_fee as number).toLocaleString()}/mo</p>
              </div>
              {property.hoa_covers && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Covers</p>
                  <p className="text-gray-300 text-sm">{property.hoa_covers as string}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <h2 className="text-white font-semibold text-lg mb-4">Units</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {units.map((unit: any) => {
          const lease = leaseByUnit[unit.id]
          const tenant = lease?.tenant
          const leaseEnd = lease?.end_date
          const daysLeft = daysUntil(leaseEnd)

          return (
            <div key={unit.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">
                    {unit.unit_number ? `Unit ${unit.unit_number}` : 'Primary Unit'}
                  </h3>
                </div>
                {getStatusBadge(unit.status ?? 'vacant')}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">{lease ? 'Lease Rent' : 'Market Rent'}</span>
                <span className="text-white font-semibold">
                  {lease
                    ? (lease.monthly_rent ? `$${lease.monthly_rent.toLocaleString()}/mo` : '—')
                    : (unit.market_rent ? `$${unit.market_rent.toLocaleString()}/mo` : '—')}
                </span>
              </div>

              {lease && tenant ? (
                <div className="pt-4 border-t border-gray-800">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Current Tenant</p>
                  <p className="text-white text-sm font-medium">
                    {tenant.first_name} {tenant.last_name}
                  </p>
                  {tenant.email && (
                    <p className="text-gray-400 text-xs mt-0.5">{tenant.email}</p>
                  )}
                  {tenant.phone && (
                    <p className="text-gray-400 text-xs">{tenant.phone}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-gray-500 text-xs">
                      Lease ends {formatDate(leaseEnd)}
                    </span>
                    {daysLeft !== null && daysLeft <= 90 && (
                      <span className={`text-xs font-medium ${daysLeft <= 30 ? 'text-red-400' : 'text-amber-400'}`}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                      </span>
                    )}
                  </div>
                </div>
              ) : unit.status === 'vacant' ? (
                <div className="pt-4 border-t border-gray-800">
                  <p className="text-gray-500 text-sm italic">No active tenant</p>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {recentPayments && recentPayments.length > 0 && (
        <>
          <h2 className="text-white font-semibold text-lg mb-4">Recent Payments</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 text-xs uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-left text-gray-400 text-xs uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-left text-gray-400 text-xs uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-gray-400 text-xs uppercase tracking-wider px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 text-gray-300 text-sm">{formatDate(payment.paid_date)}</td>
                    <td className="px-5 py-3 text-gray-300 text-sm capitalize">{payment.type ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.status === 'completed'
                          ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                          : payment.status === 'pending'
                          ? 'bg-amber-900/50 text-amber-400 border border-amber-800'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        {payment.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white text-sm font-medium text-right">
                      ${(payment.amount ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  )
}
