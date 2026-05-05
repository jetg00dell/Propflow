import { createAdminClient } from '@/lib/supabase/server'
import MaintenanceClient from './MaintenanceClient'

export default async function MaintenancePage() {
  const supabase = createAdminClient()

  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number, property_id')

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, email')

  const unitMap: Record<string, { unit_number: string; property_id: string }> = {}
  for (const u of units ?? []) unitMap[u.id] = { unit_number: u.unit_number, property_id: u.property_id }

  const propertyMap: Record<string, string> = {}
  for (const p of properties ?? []) propertyMap[p.id] = p.name

  const tenantMap: Record<string, { name: string; email: string }> = {}
  for (const t of tenants ?? []) tenantMap[t.id] = { name: `${t.first_name} ${t.last_name}`, email: t.email }

  const enriched = (requests ?? []).map((r) => {
    const unit = unitMap[r.unit_id] ?? null
    const propertyName = unit ? propertyMap[unit.property_id] ?? '—' : '—'
    const unitNumber = unit?.unit_number ?? '—'
    const tenant = r.tenant_id ? tenantMap[r.tenant_id] ?? null : null
    return {
      ...r,
      property_name: propertyName,
      unit_number: unitNumber,
      tenant_name: tenant?.name ?? 'Unknown',
      tenant_email: tenant?.email ?? null,
    }
  })

  return <MaintenanceClient requests={enriched} />
}
