import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TenantsClient from './TenantsClient'

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Step 1: all tenants
  const { data: tenants } = await admin
    .from('tenants')
    .select('id, first_name, last_name, email, phone, credit_score, employer')
    .order('last_name')
    .order('first_name')

  // Step 2: all lease_tenants (primary and co-tenants)
  const { data: leaseTenants } = await admin
    .from('lease_tenants')
    .select('tenant_id, lease_id, is_primary')

  const leaseIds = (leaseTenants ?? []).map((lt: any) => lt.lease_id).filter(Boolean)

  // Step 3: leases
  const { data: leases } = leaseIds.length > 0
    ? await admin
        .from('leases')
        .select('id, monthly_rent, start_date, end_date, status, security_deposit, unit_id')
        .in('id', leaseIds)
    : { data: [] }

  const unitIds = (leases ?? []).map((l: any) => l.unit_id).filter(Boolean)

  // Step 4: units
  const { data: units } = unitIds.length > 0
    ? await admin
        .from('units')
        .select('id, unit_number, property_id')
        .in('id', unitIds)
    : { data: [] }

  const propertyIds = (units ?? []).map((u: any) => u.property_id).filter(Boolean)

  // Step 5: properties
  const { data: properties } = propertyIds.length > 0
    ? await admin
        .from('properties')
        .select('id, name')
        .in('id', propertyIds)
    : { data: [] }

  // Build lookup maps
  const leaseMap: Record<string, any> = Object.fromEntries((leases ?? []).map((l: any) => [l.id, l]))
  const unitMap: Record<string, any> = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]))
  const propertyMap: Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))
  const leaseTenantMap: Record<string, any> = Object.fromEntries((leaseTenants ?? []).map((lt: any) => [lt.tenant_id, lt]))

  const enriched = (tenants ?? []).map((t: any) => {
    const lt = leaseTenantMap[t.id]
    const lease = lt ? leaseMap[lt.lease_id] : null
    const unit = lease ? unitMap[lease.unit_id] : null
    const property = unit ? propertyMap[unit.property_id] : null
    return {
      ...t,
      is_primary: lt?.is_primary ?? null,
      lease_id: lease?.id ?? null,
      monthly_rent: lease?.monthly_rent ?? null,
      start_date: lease?.start_date ?? null,
      end_date: lease?.end_date ?? null,
      lease_status: lease?.status ?? null,
      unit_number: unit?.unit_number ?? null,
      property_name: property?.name ?? null,
      property_id: property?.id ?? null,
    }
  })

  const totalTenants = enriched.length

  // Deduplicate by lease_id so co-tenants on the same lease don't double-count
  const activeLeaseIds = new Set(
    enriched
      .filter(t => t.lease_status === 'active' && t.lease_id !== null)
      .map(t => t.lease_id)
  )
  const activeLeases = activeLeaseIds.size

  const creditScores = enriched
    .map(t => t.credit_score)
    .filter((s): s is number => s !== null && s !== undefined)
  const avgCreditScore = creditScores.length > 0
    ? creditScores.reduce((a, b) => a + b, 0) / creditScores.length
    : null

  const seenLeases = new Set<string>()
  const monthlyRevenue = enriched
    .filter(t => t.lease_status === 'active' && t.lease_id !== null)
    .reduce((sum, t) => {
      if (seenLeases.has(t.lease_id!)) return sum
      seenLeases.add(t.lease_id!)
      return sum + (t.monthly_rent ?? 0)
    }, 0)

  return (
    <TenantsClient
      tenants={enriched}
      stats={{ totalTenants, activeLeases, avgCreditScore, monthlyRevenue }}
    />
  )
}
