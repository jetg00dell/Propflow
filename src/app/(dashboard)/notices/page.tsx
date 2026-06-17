import { createAdminClient } from '@/lib/supabase/server'
import NoticesClient from './NoticesClient'

export default async function NoticesPage() {
  const supabase = createAdminClient()

  const { data: notices, error: noticesError } = await supabase
    .from('notices')
    .select('id, lease_id, type, title, issued_date, response_deadline, status, notes, created_at')
    .order('issued_date', { ascending: false })

  if (noticesError) console.error('[notices] query error:', noticesError)

  const noticeLeaseIds = [...new Set((notices ?? []).map((n: any) => n.lease_id).filter(Boolean))]

  const { data: noticeLeases } = noticeLeaseIds.length > 0
    ? await supabase.from('leases').select('id, unit_id').in('id', noticeLeaseIds)
    : { data: [] }

  const { data: activeLeases } = await supabase
    .from('leases')
    .select('id, unit_id')
    .eq('status', 'active')

  // Merge: notice leases (any status) + active leases (for modal selector)
  const leasesMap = new Map<string, any>()
  for (const l of (noticeLeases ?? [])) leasesMap.set(l.id, l)
  for (const l of (activeLeases ?? [])) leasesMap.set(l.id, l)
  const allLeases = [...leasesMap.values()]

  const unitIds = [...new Set(allLeases.map((l: any) => l.unit_id).filter(Boolean))]

  const { data: units } = unitIds.length > 0
    ? await supabase.from('units').select('id, unit_number, property_id').in('id', unitIds)
    : { data: [] }

  const propertyIds = [...new Set((units ?? []).map((u: any) => u.property_id).filter(Boolean))]

  const { data: properties } = propertyIds.length > 0
    ? await supabase.from('properties').select('id, name').in('id', propertyIds)
    : { data: [] }

  const allLeaseIds = allLeases.map((l: any) => l.id)

  const { data: leaseTenants } = allLeaseIds.length > 0
    ? await supabase.from('lease_tenants').select('lease_id, tenant_id, is_primary').in('lease_id', allLeaseIds)
    : { data: [] }

  const tenantIds = [...new Set((leaseTenants ?? []).map((lt: any) => lt.tenant_id).filter(Boolean))]

  const { data: tenants } = tenantIds.length > 0
    ? await supabase.from('tenants').select('id, first_name, last_name').in('id', tenantIds)
    : { data: [] }

  const unitMap: Record<string, any> = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]))
  const propertyMap: Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))
  const tenantMap: Record<string, any> = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]))
  const leaseUnitMap: Record<string, string> = Object.fromEntries(allLeases.map((l: any) => [l.id, l.unit_id]))

  const primaryTenantByLease: Record<string, any> = {}
  for (const lt of (leaseTenants ?? [])) {
    const lid = (lt as any).lease_id
    if (!primaryTenantByLease[lid] || (lt as any).is_primary) {
      primaryTenantByLease[lid] = tenantMap[(lt as any).tenant_id]
    }
  }

  const enrichedNotices = (notices ?? []).map((n: any) => {
    const unit = unitMap[leaseUnitMap[n.lease_id]]
    const property = unit ? propertyMap[unit.property_id] : null
    const tenant = primaryTenantByLease[n.lease_id]
    return {
      id: n.id as string,
      lease_id: n.lease_id as string,
      type: n.type as string,
      title: (n.title ?? null) as string | null,
      issued_date: n.issued_date as string,
      response_deadline: (n.response_deadline ?? null) as string | null,
      status: n.status as string,
      notes: (n.notes ?? null) as string | null,
      property_name: (property?.name ?? null) as string | null,
      unit_number: (unit?.unit_number ?? null) as string | null,
      tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : null as string | null,
    }
  })

  const enrichedActiveLeases = (activeLeases ?? []).map((l: any) => {
    const unit = unitMap[l.unit_id]
    const property = unit ? propertyMap[unit.property_id] : null
    const tenant = primaryTenantByLease[l.id]
    return {
      id: l.id as string,
      property_name: (property?.name ?? null) as string | null,
      unit_number: (unit?.unit_number ?? null) as string | null,
      tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : null as string | null,
    }
  })

  return <NoticesClient notices={enrichedNotices} leases={enrichedActiveLeases} />
}
