import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TenantFormClient from './TenantFormClient'

export default async function AddTenantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: properties }, { data: allUnits }, { data: activeLeases }] = await Promise.all([
    admin.from('properties').select('id, name').order('name'),
    admin.from('units').select('id, unit_number, property_id').eq('status', 'vacant').order('unit_number'),
    admin.from('leases').select('id, unit_id').eq('status', 'active'),
  ])

  return (
    <TenantFormClient
      properties={properties ?? []}
      allUnits={allUnits ?? []}
      activeLeases={activeLeases ?? []}
    />
  )
}
