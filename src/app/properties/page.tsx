import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function getPropertyTypeLabel(type: string) {
  const labels: Record<string, string> = {
    single_family: 'Single Family',
    multi_family: 'Multi Family',
    condo: 'Condo',
    townhouse: 'Townhouse',
    commercial: 'Commercial',
    sfh_adu: 'SFH + ADU',
  }
  return labels[type] ?? type
}

function getOccupancyColor(occupied: number, total: number) {
  const rate = total === 0 ? 0 : occupied / total
  if (rate === 1) return 'text-emerald-400'
  if (rate >= 0.5) return 'text-amber-400'
  return 'text-red-400'
}

export default async function PropertiesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: properties, error } = await supabase
    .from('properties')
    .select(`
      id,
      address,
      city,
      state,
      property_type,
      units (
        id,
        unit_number,
        status,
        market_rent
      )
    `)
    .order('address')

  if (error) {
    console.error('Error fetching properties:', error)
  }

  const allUnitIds = (properties ?? []).flatMap((p) => (p.units ?? []).map((u: any) => u.id))

  const admin = createAdminClient()
  const { data: activeLeases } = allUnitIds.length > 0
    ? await admin
        .from('leases')
        .select('unit_id, monthly_rent')
        .in('unit_id', allUnitIds)
        .eq('status', 'active')
    : { data: [] }

  const leaseRentByUnit: Record<string, number> = {}
  for (const lease of (activeLeases ?? [])) {
    leaseRentByUnit[(lease as any).unit_id] = (lease as any).monthly_rent ?? 0
  }

  const propertiesWithStats = (properties ?? []).map((p) => {
    const units = p.units ?? []
    const total = units.length
    const occupied = units.filter((u: any) => u.status === 'occupied').length
    const vacant = units.filter((u: any) => u.status === 'vacant').length
    const monthlyRevenue = units.reduce((sum: number, u: any) => sum + (leaseRentByUnit[u.id] ?? 0), 0)
    return { ...p, total, occupied, vacant, monthlyRevenue }
  })

  const totalRevenue = propertiesWithStats.reduce((s, p) => s + p.monthlyRevenue, 0)
  const totalUnits = propertiesWithStats.reduce((s, p) => s + p.total, 0)
  const totalOccupied = propertiesWithStats.reduce((s, p) => s + p.occupied, 0)

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Properties</h1>
          <p className="text-gray-400 text-sm mt-1">
            {propertiesWithStats.length} properties · {totalUnits} units
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Add Property
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Monthly Revenue</p>
          <p className="text-white text-xl font-bold">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Occupancy</p>
          <p className="text-white text-xl font-bold">
            {totalUnits === 0 ? '—' : Math.round((totalOccupied / totalUnits) * 100)}%
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Vacant Units</p>
          <p className="text-white text-xl font-bold">{totalUnits - totalOccupied}</p>
        </div>
      </div>

      {/* Property grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {propertiesWithStats.map((property) => (
          <Link
            key={property.id}
            href={`/properties/${property.id}`}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 hover:bg-gray-800/50 transition-all group"
          >
            {/* Address */}
            <div className="mb-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-white font-semibold text-sm leading-snug group-hover:text-blue-400 transition-colors">
                  {property.address}
                </h2>
                <span className="text-gray-500 text-xs whitespace-nowrap mt-0.5">→</span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                {property.city}, {property.state}
              </p>
            </div>

            {/* Type badge */}
            <div className="mb-4">
              <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-md border border-gray-700">
                {getPropertyTypeLabel(property.property_type ?? '')}
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-800">
              <div>
                <p className="text-gray-500 text-xs">Units</p>
                <p className="text-white text-sm font-semibold">{property.total}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Occupancy</p>
                <p className={`text-sm font-semibold ${getOccupancyColor(property.occupied, property.total)}`}>
                  {property.total === 0 ? '—' : `${property.occupied}/${property.total}`}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Revenue</p>
                <p className="text-white text-sm font-semibold">
                  {property.monthlyRevenue === 0 ? '—' : `$${property.monthlyRevenue.toLocaleString()}`}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
