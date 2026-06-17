import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import LeaseTermsCard from './LeaseTermsCard'
import DocumentsSection from './DocumentsSection'

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
    .select('id, unit_id, status, start_date, end_date, monthly_rent, security_deposit, pet_rent, pet_deposit, late_fee_flat, grace_period_days, rent_due_day, auto_renew, renewal_notice_days')
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
      .select('id, name, address, city, state, year_built')
      .eq('id', unit.property_id)
      .single()
    property = data
  }

  const { data: leaseDocs } = await admin
    .from('lease_documents')
    .select('id, category, filename, uploaded_at, notes')
    .eq('lease_id', id)

  const yearBuilt = property?.year_built as number | null
  const hideLeadDisclosure = typeof yearBuilt === 'number' && yearBuilt >= 1978

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
          <LeaseTermsCard
            leaseId={lease.id}
            monthlyRent={(lease.monthly_rent as number | null) ?? null}
            securityDeposit={(lease.security_deposit as number | null) ?? null}
            petRent={(lease.pet_rent as number | null) ?? null}
            petDeposit={(lease.pet_deposit as number | null) ?? null}
            lateFeeFlat={(lease.late_fee_flat as number | null) ?? null}
            gracePeriodDays={(lease.grace_period_days as number | null) ?? null}
            rentDueDay={(lease.rent_due_day as number | null) ?? null}
            autoRenew={(lease.auto_renew as boolean | null) ?? null}
            renewalNoticeDays={(lease.renewal_notice_days as number | null) ?? null}
            startDate={(lease.start_date as string | null) ?? null}
            endDate={(lease.end_date as string | null) ?? null}
          />
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

      <DocumentsSection
        leaseId={id}
        initialDocs={leaseDocs ?? []}
        hideLeadDisclosure={hideLeadDisclosure}
      />
    </div>
  )
}
