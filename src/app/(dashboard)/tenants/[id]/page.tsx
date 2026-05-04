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
  if (days === null) return <span className="text-gray-300 text-sm">{text}</span>
  if (days < 0)
    return <span className="text-red-400 text-sm">{text} <span className="text-xs font-normal">(expired)</span></span>
  if (days <= 90)
    return <span className="text-amber-400 text-sm">{text} <span className="text-xs font-normal">({days}d left)</span></span>
  return <span className="text-gray-300 text-sm">{text}</span>
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      employer,
      monthly_income,
      credit_score,
      background_check_passed,
      background_check_date,
      emergency_contact_name,
      emergency_contact_phone,
      created_at
    `)
    .eq('id', id)
    .single()

  if (tenantError) console.error('Tenant fetch error:', JSON.stringify(tenantError))
  if (!tenant) notFound()

  const { data: leaseTenant } = await admin
    .from('lease_tenants')
    .select(`
      leases (
        id,
        status,
        start_date,
        end_date,
        monthly_rent,
        security_deposit,
        grace_period_days,
        rent_due_day,
        auto_renew,
        renewal_notice_days,
        units (
          unit_number,
          property_id,
          properties (
            id,
            name
          )
        )
      )
    `)
    .eq('tenant_id', id)
    .eq('is_primary', true)
    .maybeSingle()

  const lease = (leaseTenant as any)?.leases
  const unit = lease?.units
  const property = unit?.properties

  let coTenants: any[] = []
  if (lease?.id) {
    const { data: ct } = await admin
      .from('lease_tenants')
      .select('is_primary, tenants (id, first_name, last_name, email)')
      .eq('lease_id', lease.id)
      .neq('tenant_id', id)
    coTenants = ct ?? []
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mb-6">
        <Link href="/tenants" className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1">
          ← Back to Tenants
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{tenant.first_name} {tenant.last_name}</h1>
        {tenant.email && <p className="text-gray-400 mt-0.5">{tenant.email}</p>}
        {tenant.phone && <p className="text-gray-400 text-sm">{tenant.phone as string}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Lease card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold text-base mb-4">Current Lease</h2>
            {lease ? (
              <>
                {property && (
                  <div className="mb-5">
                    <Link
                      href={`/properties/${property.id}`}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      {property.name}
                    </Link>
                    {unit?.unit_number && (
                      <span className="text-gray-400 text-sm ml-2">· Unit {unit.unit_number}</span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Monthly Rent</p>
                    <p className="text-white font-semibold">
                      {lease.monthly_rent ? `$${(lease.monthly_rent as number).toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Security Deposit</p>
                    <p className="text-white font-semibold">
                      {lease.security_deposit ? `$${(lease.security_deposit as number).toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      lease.status === 'active'
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>
                      {lease.status ?? '—'}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Start Date</p>
                    <p className="text-gray-300 text-sm">{formatDate(lease.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">End Date</p>
                    <LeaseEndValue endDate={lease.end_date} />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Rent Due Day</p>
                    <p className="text-gray-300 text-sm">
                      {lease.rent_due_day != null ? `Day ${lease.rent_due_day}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Grace Period</p>
                    <p className="text-gray-300 text-sm">
                      {lease.grace_period_days != null ? `${lease.grace_period_days} days` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Auto-Renew</p>
                    <p className="text-gray-300 text-sm">{lease.auto_renew ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                {coTenants.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-800">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Co-Tenants</p>
                    <div className="space-y-1.5">
                      {coTenants.map((ct: any) => {
                        const t = ct.tenants
                        if (!t) return null
                        return (
                          <div key={t.id} className="flex items-center gap-3">
                            <Link
                              href={`/tenants/${t.id}`}
                              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                            >
                              {t.first_name} {t.last_name}
                            </Link>
                            {t.email && (
                              <span className="text-gray-500 text-xs">{t.email}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm italic">No active lease on file.</p>
            )}
          </div>

          {/* Personal info card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold text-base mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Employer</p>
                <p className="text-gray-300 text-sm">{(tenant.employer as string | null) ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Monthly Income</p>
                <p className="text-gray-300 text-sm">
                  {tenant.monthly_income != null
                    ? `$${(tenant.monthly_income as number).toLocaleString()}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Credit Score</p>
                <p className="text-gray-300 text-sm">{(tenant.credit_score as number | null) ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Background Check</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  tenant.background_check_passed === true
                    ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                    : tenant.background_check_passed === false
                    ? 'bg-red-900/50 text-red-400 border border-red-800'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}>
                  {tenant.background_check_passed === true
                    ? 'Passed'
                    : tenant.background_check_passed === false
                    ? 'Failed'
                    : '—'}
                </span>
              </div>
              {tenant.background_check_date && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Check Date</p>
                  <p className="text-gray-300 text-sm">{formatDate(tenant.background_check_date as string)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency contact card */}
        {tenant.emergency_contact_name && (
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-base mb-4">Emergency Contact</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Name</p>
                  <p className="text-gray-300 text-sm">{tenant.emergency_contact_name as string}</p>
                </div>
                {tenant.emergency_contact_phone && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-gray-300 text-sm">{tenant.emergency_contact_phone as string}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
