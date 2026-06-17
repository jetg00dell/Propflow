import { createAdminClient } from '@/lib/supabase/server'
import NoticesClient from './NoticesClient'

export default async function NoticesPage() {
  const supabase = createAdminClient()

  // Active leases with all lease-term fields
  const { data: leases } = await supabase
    .from('leases')
    .select('id, unit_id, start_date, end_date, monthly_rent, rent_due_day, grace_period_days, late_fee_flat')
    .eq('status', 'active')

  const unitIds = [...new Set((leases ?? []).map((l: any) => l.unit_id).filter(Boolean))]

  const { data: units } = unitIds.length > 0
    ? await supabase.from('units').select('id, unit_number, property_id').in('id', unitIds)
    : { data: [] }

  const propertyIds = [...new Set((units ?? []).map((u: any) => u.property_id).filter(Boolean))]

  // Fetch address/city/state in addition to name for the notice form
  const { data: properties } = propertyIds.length > 0
    ? await supabase.from('properties').select('id, name, address, city, state').in('id', propertyIds)
    : { data: [] }

  const leaseIds = (leases ?? []).map((l: any) => l.id).filter(Boolean)

  const { data: leaseTenants } = leaseIds.length > 0
    ? await supabase.from('lease_tenants').select('lease_id, tenant_id, is_primary').in('lease_id', leaseIds)
    : { data: [] }

  const tenantIds = [...new Set((leaseTenants ?? []).map((lt: any) => lt.tenant_id).filter(Boolean))]

  // Include email and phone — needed for the printed notice
  const { data: tenants } = tenantIds.length > 0
    ? await supabase.from('tenants').select('id, first_name, last_name, email, phone').in('id', tenantIds)
    : { data: [] }

  // Latest rent charge per lease — used to derive isHaTenant and pre-fill amount due
  const { data: charges } = leaseIds.length > 0
    ? await supabase
        .from('rent_charges')
        .select('id, lease_id, charge_month, total_due, ha_amount, tenant_amount')
        .in('lease_id', leaseIds)
        .order('charge_month', { ascending: false })
    : { data: [] }

  // Build lookup maps
  const unitMap: Record<string, any> = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]))
  const propertyMap: Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))
  const tenantMap: Record<string, any> = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]))

  // Group lease_tenants by lease_id, primary first
  const ltByLease: Record<string, any[]> = {}
  for (const lt of (leaseTenants ?? [])) {
    const lid = (lt as any).lease_id
    if (!ltByLease[lid]) ltByLease[lid] = []
    ltByLease[lid].push(lt)
  }

  // Keep only the most recent charge per lease (array already sorted desc)
  const latestChargeByLease: Record<string, any> = {}
  for (const c of (charges ?? [])) {
    const lid = (c as any).lease_id
    if (!latestChargeByLease[lid]) latestChargeByLease[lid] = c
  }

  const enrichedLeases = (leases ?? []).map((l: any) => {
    const unit = unitMap[l.unit_id]
    const property = unit ? propertyMap[unit.property_id] : null
    const lts = (ltByLease[l.id] ?? []).sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    const primaryLt = lts.find((lt: any) => lt.is_primary) ?? lts[0]
    const primaryTenant = primaryLt ? (tenantMap[primaryLt.tenant_id] ?? null) : null
    const latestCharge = latestChargeByLease[l.id] ?? null

    return {
      leaseId: l.id as string,
      unitId: (l.unit_id ?? '') as string,
      startDate: (l.start_date ?? '') as string,
      endDate: (l.end_date ?? '') as string,
      monthlyRent: (l.monthly_rent ?? 0) as number,
      rentDueDay: (l.rent_due_day ?? 1) as number,
      gracePeriodDays: (l.grace_period_days ?? 0) as number,
      lateFeeFlat: (l.late_fee_flat ?? null) as number | null,
      lateFeePct: null as number | null,
      unitNumber: (unit?.unit_number ?? '') as string,
      propertyId: (property?.id ?? '') as string,
      propertyName: (property?.name ?? '') as string,
      propertyAddress: (property?.address ?? '') as string,
      propertyCity: (property?.city ?? '') as string,
      propertyState: (property?.state ?? '') as string,
      mortgageLender: '' as string,
      isCaresAct: false as boolean,
      isHaTenant: !!(latestCharge && (latestCharge.ha_amount ?? 0) > 0) as boolean,
      primaryTenant: primaryTenant ? {
        id: primaryTenant.id as string,
        first_name: primaryTenant.first_name as string,
        last_name: primaryTenant.last_name as string,
        email: (primaryTenant.email ?? '') as string,
        phone: (primaryTenant.phone ?? '') as string,
      } : null,
      allTenants: lts.map((lt: any) => {
        const t = tenantMap[lt.tenant_id]
        return t ? {
          id: t.id as string,
          first_name: t.first_name as string,
          last_name: t.last_name as string,
          email: (t.email ?? '') as string,
          phone: (t.phone ?? '') as string,
        } : undefined
      }),
      latestCharge: latestCharge ? {
        total_due: latestCharge.total_due as number,
        ha_amount: latestCharge.ha_amount as number,
        tenant_amount: latestCharge.tenant_amount as number,
        charge_month: latestCharge.charge_month as string,
      } : null,
    }
  })

  return <NoticesClient leases={enrichedLeases} />
}
