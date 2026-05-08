import { createClient, createAdminClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'
import PaymentsClient from './PaymentsClient'
import { redirect } from 'next/navigation'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Step 1: active leases — select only columns that exist on the leases table.
  // ha_amount/tenant_amount live on rent_charges, not leases; monthly_rent is the
  // lease-level default used for AddChargeModal auto-populate.
  const { data: leases, error: leasesError } = await admin
    .from('leases')
    .select('id, unit_id, monthly_rent')
    .eq('status', 'active')

  if (leasesError) console.error('[payments] leases query error:', leasesError)

  const leaseIds = (leases ?? []).map((l: any) => l.id)
  const unitIds = [...new Set((leases ?? []).map((l: any) => l.unit_id).filter(Boolean))]

  // Step 2: units
  const { data: units, error: unitsError } = unitIds.length > 0
    ? await admin.from('units').select('id, unit_number, property_id').in('id', unitIds)
    : { data: [], error: null }

  if (unitsError) console.error('[payments] units query error:', unitsError)

  const propertyIds = [...new Set((units ?? []).map((u: any) => u.property_id).filter(Boolean))]

  // Step 3: properties
  const { data: properties, error: propertiesError } = propertyIds.length > 0
    ? await admin.from('properties').select('id, name').in('id', propertyIds)
    : { data: [], error: null }

  if (propertiesError) console.error('[payments] properties query error:', propertiesError)

  // Step 4: primary tenants
  const { data: leaseTenants, error: leaseTenantsError } = leaseIds.length > 0
    ? await admin.from('lease_tenants').select('lease_id, tenant_id, is_primary').in('lease_id', leaseIds)
    : { data: [], error: null }

  if (leaseTenantsError) console.error('[payments] lease_tenants query error:', leaseTenantsError)

  const tenantIds = [...new Set((leaseTenants ?? []).map((lt: any) => lt.tenant_id).filter(Boolean))]

  const { data: tenants, error: tenantsError } = tenantIds.length > 0
    ? await admin.from('tenants').select('id, first_name, last_name').in('id', tenantIds)
    : { data: [], error: null }

  if (tenantsError) console.error('[payments] tenants query error:', tenantsError)

  // Step 5: rent charges
  const { data: charges, error: chargesError } = leaseIds.length > 0
    ? await admin
        .from('rent_charges')
        .select('id, lease_id, charge_month, ha_amount, tenant_amount, total_due, notes')
        .in('lease_id', leaseIds)
        .order('charge_month', { ascending: false })
    : { data: [], error: null }

  if (chargesError) console.error('[payments] rent_charges query error:', chargesError)

  const chargeIds = (charges ?? []).map((c: any) => c.id)

  // Step 6: payments for those charges
  const { data: payments, error: paymentsError } = chargeIds.length > 0
    ? await admin
        .from('payments')
        .select('id, charge_id, amount, paid_by, method, paid_date, notes')
        .in('charge_id', chargeIds)
    : { data: [], error: null }

  if (paymentsError) console.error('[payments] payments query error:', paymentsError)

  // Build lookup maps
  const unitMap: Record<string, any> = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]))
  const propertyMap: Record<string, any> = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))
  const tenantMap: Record<string, any> = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]))
  const leaseUnitMap: Record<string, string> = Object.fromEntries((leases ?? []).map((l: any) => [l.id, l.unit_id]))

  const primaryTenantByLease: Record<string, any> = {}
  for (const lt of (leaseTenants ?? [])) {
    const lid = (lt as any).lease_id
    if (!primaryTenantByLease[lid] || (lt as any).is_primary) {
      primaryTenantByLease[lid] = tenantMap[(lt as any).tenant_id]
    }
  }

  const paymentsByCharge: Record<string, any[]> = {}
  for (const p of (payments ?? [])) {
    const cid = (p as any).charge_id
    if (!paymentsByCharge[cid]) paymentsByCharge[cid] = []
    paymentsByCharge[cid].push(p)
  }

  const enrichedCharges = (charges ?? []).map((c: any) => {
    const unit = unitMap[leaseUnitMap[c.lease_id]]
    const property = unit ? propertyMap[unit.property_id] : null
    const tenant = primaryTenantByLease[c.lease_id]
    return {
      id: c.id,
      lease_id: c.lease_id,
      charge_month: c.charge_month as string,
      ha_amount: (c.ha_amount ?? 0) as number,
      tenant_amount: (c.tenant_amount ?? 0) as number,
      total_due: (c.total_due ?? (c.ha_amount ?? 0) + (c.tenant_amount ?? 0)) as number,
      notes: (c.notes ?? null) as string | null,
      property_name: (property?.name ?? null) as string | null,
      unit_number: (unit?.unit_number ?? null) as string | null,
      tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : null as string | null,
      payments: (paymentsByCharge[c.id] ?? []) as any[],
    }
  })

  const enrichedLeases = (leases ?? []).map((l: any) => {
    const unit = unitMap[l.unit_id]
    const property = unit ? propertyMap[unit.property_id] : null
    const tenant = primaryTenantByLease[l.id]
    return {
      id: l.id as string,
      property_name: (property?.name ?? null) as string | null,
      unit_number: (unit?.unit_number ?? null) as string | null,
      tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : null as string | null,
      ha_amount: null,
      tenant_amount: null,
      monthly_rent: (l.monthly_rent ?? null) as number | null,
    }
  })

  return (
    <Dashboard>
      <PaymentsClient charges={enrichedCharges} leases={enrichedLeases} />
    </Dashboard>
  )
}
