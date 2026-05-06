import { createAdminClient, createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'
import DashboardHome from '@/components/DashboardHome'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const now = new Date()
  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const [
    { data: units },
    { data: payments },
    { data: maintenance },
    { data: leases },
  ] = await Promise.all([
    admin.from('units').select('id, status, market_rent'),
    admin.from('payments').select('id, amount, status, paid_date, due_date, type').order('created_at', { ascending: false }).limit(5),
    admin.from('maintenance_requests').select('id, title, priority, status, created_at, category').eq('status', 'open').order('created_at', { ascending: false }).limit(4),
    admin.from('leases').select('id, end_date, unit_id').gte('end_date', now.toISOString()).lte('end_date', in90.toISOString()).order('end_date', { ascending: true }),
  ])

  // Resolve unit + property names for expiring leases
  const unitIds = [...new Set((leases ?? []).map((l: any) => l.unit_id).filter(Boolean))]
  const { data: leaseUnits } = unitIds.length > 0
    ? await admin.from('units').select('id, unit_number, property_id').in('id', unitIds)
    : { data: [] }

  const propertyIds = [...new Set((leaseUnits ?? []).map((u: any) => u.property_id).filter(Boolean))]
  const { data: properties } = propertyIds.length > 0
    ? await admin.from('properties').select('id, name').in('id', propertyIds)
    : { data: [] }

  const unitMap = Object.fromEntries((leaseUnits ?? []).map((u: any) => [u.id, u]))
  const propertyMap = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))

  const enrichedLeases = (leases ?? []).map((l: any) => {
    const unit = unitMap[l.unit_id]
    const property = unit ? propertyMap[unit.property_id] : null
    return {
      id: l.id,
      end_date: l.end_date,
      unit_number: unit?.unit_number ?? null,
      property_name: property?.name ?? null,
    }
  })

  return (
    <Dashboard>
      <DashboardHome
        units={units ?? []}
        recentPayments={payments ?? []}
        maintenanceItems={maintenance ?? []}
        expiringLeases={enrichedLeases}
      />
    </Dashboard>
  )
}