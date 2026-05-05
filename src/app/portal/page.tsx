import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalClient from './PortalClient'

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!tenant) {
    return (
      <div className="text-center py-16">
        <p className="text-[#1A2B4A] font-semibold text-lg">No tenant record found</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your property manager.</p>
      </div>
    )
  }

  const { data: leaseTenant } = await admin
    .from('lease_tenants')
    .select('lease_id, is_primary')
    .eq('tenant_id', tenant.id)
    .single()

  let lease = null
  let unit = null
  let property = null

  if (leaseTenant) {
    const { data: l } = await admin
      .from('leases')
      .select('*')
      .eq('id', leaseTenant.lease_id)
      .eq('status', 'active')
      .single()
    lease = l

    if (lease) {
      const { data: u } = await admin
        .from('units')
        .select('*, properties(id, name, address, city, state)')
        .eq('id', lease.unit_id)
        .single()
      unit = u
      property = (u as any)?.properties ?? null
    }
  }

  const { data: requests } = await admin
    .from('maintenance_requests')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <PortalClient
      tenant={tenant}
      lease={lease}
      unit={unit}
      property={property}
      requests={requests ?? []}
    />
  )
}
