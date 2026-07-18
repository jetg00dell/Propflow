import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const admin = createAdminClient()
  const { searchParams } = new URL(req.url)
  const leaseId = searchParams.get('lease_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!leaseId || !from || !to) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  const { data: lease, error: leaseError } = await admin
    .from('leases')
    .select('id, start_date, end_date, monthly_rent, unit_id')
    .eq('id', leaseId)
    .single()

  if (leaseError || !lease) {
    return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
  }

  const { data: unit } = await admin
    .from('units')
    .select('id, unit_number, property_id')
    .eq('id', (lease as any).unit_id)
    .single()

  const { data: property } = unit
    ? await admin.from('properties').select('id, name').eq('id', (unit as any).property_id).single()
    : { data: null }

  const { data: leaseTenants } = await admin
    .from('lease_tenants')
    .select('tenant_id, is_primary')
    .eq('lease_id', leaseId)

  const tenantIds = (leaseTenants ?? []).map((lt: any) => lt.tenant_id)

  const { data: tenants } = tenantIds.length > 0
    ? await admin.from('tenants').select('id, first_name, last_name').in('id', tenantIds)
    : { data: [] }

  const tenantMap: Record<string, any> = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]))
  const primaryLt = (leaseTenants ?? []).find((lt: any) => lt.is_primary) ?? (leaseTenants ?? [])[0]
  const primaryTenant = primaryLt ? tenantMap[primaryLt.tenant_id] : null

  const { data: charges } = await admin
    .from('rent_charges')
    .select('id, charge_month, ha_amount, tenant_amount, total_due, notes')
    .eq('lease_id', leaseId)
    .gte('charge_month', from)
    .lte('charge_month', to)
    .order('charge_month', { ascending: true })

  const chargeIds = (charges ?? []).map((c: any) => c.id)

  const { data: payments } = chargeIds.length > 0
    ? await admin
        .from('payments')
        .select('id, charge_id, amount, paid_by, method, paid_date, notes')
        .in('charge_id', chargeIds)
        .order('paid_date', { ascending: true })
    : { data: [] }

  return NextResponse.json({
    lease: {
      id: (lease as any).id,
      start_date: (lease as any).start_date ?? null,
      end_date: (lease as any).end_date ?? null,
      monthly_rent: (lease as any).monthly_rent ?? null,
      property_name: (property as any)?.name ?? null,
      unit_number: (unit as any)?.unit_number ?? null,
      tenant_name: primaryTenant
        ? `${primaryTenant.first_name} ${primaryTenant.last_name}`
        : null,
    },
    charges: charges ?? [],
    payments: payments ?? [],
  })
}
