import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeasesClient from './LeasesClient'

function parseLocalDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export default async function LeasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Step 1: all leases ordered by end_date
  const { data: leases } = await admin
    .from('leases')
    .select('id, unit_id, status, start_date, end_date, monthly_rent')
    .order('end_date', { ascending: true })

  const unitIds = [...new Set((leases ?? []).map((l: any) => l.unit_id).filter(Boolean))]

  // Step 2: units
  const { data: units } = unitIds.length > 0
    ? await admin.from('units').select('id, unit_number, property_id').in('id', unitIds)
    : { data: [] }

  const propertyIds = [...new Set((units ?? []).map((u: any) => u.property_id).filter(Boolean))]

  // Step 3: properties
  const { data: properties } = propertyIds.length > 0
    ? await admin.from('properties').select('id, name').in('id', propertyIds)
    : { data: [] }

  const leaseIds = (leases ?? []).map((l: any) => l.id).filter(Boolean)

  // Step 4: lease_tenants
  const { data: leaseTenants } = leaseIds.length > 0
    ? await admin.from('lease_tenants').select('lease_id, tenant_id, is_primary').in('lease_id', leaseIds)
    : { data: [] }

  const tenantIds = [...new Set((leaseTenants ?? []).map((lt: any) => lt.tenant_id).filter(Boolean))]

  // Step 5: tenants
  const { data: tenants } = tenantIds.length > 0
    ? await admin.from('tenants').select('id, first_name, last_name').in('id', tenantIds)
    : { data: [] }

  // Build lookup maps
  const unitMap: Record<string, any> = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]))
  const propertyMap: Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))
  const tenantMap: Record<string, any> = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]))

  // Group lease_tenants by lease_id
  const ltByLease: Record<string, any[]> = {}
  for (const lt of (leaseTenants ?? [])) {
    const lid = (lt as any).lease_id
    if (!ltByLease[lid]) ltByLease[lid] = []
    ltByLease[lid].push(lt)
  }

  const enriched = (leases ?? []).map((l: any) => {
    const unit = unitMap[l.unit_id]
    const property = unit ? propertyMap[unit.property_id] : null
    const lts = (ltByLease[l.id] ?? [])
      .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    const leaseTenantsList = lts
      .map((lt: any) => ({ ...tenantMap[lt.tenant_id], is_primary: lt.is_primary }))
      .filter((t: any) => t?.id)
    return {
      id: l.id,
      unit_id: l.unit_id ?? null,
      status: l.status ?? null,
      start_date: l.start_date ?? null,
      end_date: l.end_date ?? null,
      monthly_rent: l.monthly_rent ?? null,
      unit_number: unit?.unit_number ?? null,
      property_id: property?.id ?? null,
      property_name: property?.name ?? null,
      tenants: leaseTenantsList,
    }
  })

  const total = enriched.length
  const active = enriched.filter(l => l.status === 'active').length

  const now = Date.now()
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000
  const expiringSoon = enriched.filter(l => {
    if (l.status !== 'active' || !l.end_date) return false
    const ms = parseLocalDate(l.end_date).getTime()
    return ms >= now && ms <= now + ninetyDaysMs
  }).length

  const monthlyRent = enriched
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.monthly_rent ?? 0), 0)

  return (
    <LeasesClient
      leases={enriched}
      stats={{ total, active, expiringSoon, monthlyRent }}
    />
  )
}
