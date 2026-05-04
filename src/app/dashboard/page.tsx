import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: units, error: unitsError },
    { data: payments, error: paymentsError },
    { data: maintenance, error: maintenanceError },
    { data: leases, error: leasesError },
  ] = await Promise.all([
    supabase.from('units').select('id, status, market_rent'),
    supabase.from('payments').select('id, amount, status, paid_date, due_date, type').order('created_at', { ascending: false }).limit(5),
    supabase.from('maintenance_requests').select('id, title, priority, status, created_at, category').eq('status', 'open').order('created_at', { ascending: false }).limit(4),
    supabase.from('leases').select('id, end_date, unit_id').gte('end_date', new Date().toISOString()).lte('end_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()).order('end_date', { ascending: true }),
  ])

  console.log('UNITS:', units, 'ERROR:', unitsError)
  console.log('USER ID:', user.id)

  return (
    <Dashboard
      units={units ?? []}
      recentPayments={payments ?? []}
      maintenanceItems={maintenance ?? []}
      expiringLeases={leases ?? []}
    />
  )
}