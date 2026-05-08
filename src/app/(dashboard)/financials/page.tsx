import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinancialsClient from './FinancialsClient'
import { calculateCurrentBalance } from '@/lib/amortization'

function parseLocalDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default async function FinancialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // 1. All properties
  const { data: properties } = await admin
    .from('properties')
    .select('id, name, property_type, status, address, city, state, mortgage_payment, mortgage_balance, mortgage_rate, mortgage_lender, mortgage_balance_date, hoa_fee, property_tax, insurance_premium')
    .order('name')

  // 2. All units
  const { data: units } = await admin
    .from('units')
    .select('id, property_id, unit_number, status, market_rent')

  // 3. All active leases
  const { data: leases } = await admin
    .from('leases')
    .select('id, unit_id, status, start_date, end_date, monthly_rent')
    .eq('status', 'active')

  // 4. All lease_tenants (to count tenants per lease)
  const { data: leaseTenants } = await admin
    .from('lease_tenants')
    .select('lease_id, tenant_id')

  // --- JS merge ---
  const unitToProperty: Record<string, string> = {}
  for (const u of units ?? []) unitToProperty[u.id] = u.property_id

  const unitsByProperty: Record<string, typeof units> = {}
  for (const u of units ?? []) {
    if (!unitsByProperty[u.property_id]) unitsByProperty[u.property_id] = []
    unitsByProperty[u.property_id]!.push(u)
  }

  const leasesByProperty: Record<string, typeof leases> = {}
  for (const l of leases ?? []) {
    const propId = unitToProperty[l.unit_id]
    if (!propId) continue
    if (!leasesByProperty[propId]) leasesByProperty[propId] = []
    leasesByProperty[propId]!.push(l)
  }

  const unitCountByProperty: Record<string, number> = {}
  for (const u of units ?? []) {
    unitCountByProperty[u.property_id] = (unitCountByProperty[u.property_id] ?? 0) + 1
  }

  // Build per-property financials
  const propertyFinancials = (properties ?? []).map((p) => {
    const propLeases = leasesByProperty[p.id] ?? []
    const totalUnits = unitCountByProperty[p.id] ?? 0
    const activeLeaseCount = propLeases.length

    const monthlyIncome = propLeases.reduce((sum, l) => sum + (l.monthly_rent ?? 0), 0)

    const mortgagePayment = p.mortgage_payment ?? 0
    const mortgageRate = p.mortgage_rate ?? 0
    const mortgageBalanceConfirmedDate = p.mortgage_balance_date ?? null
    const mortgageBalance = calculateCurrentBalance(
      p.mortgage_balance ?? 0,
      mortgageRate,
      mortgagePayment,
      mortgageBalanceConfirmedDate
    )
    const propertyTax = (p.property_tax ?? 0) / 12
    const insurance = (p.insurance_premium ?? 0) / 12
    const hoaFee = p.hoa_fee ?? 0

    const totalExpenses = mortgagePayment + propertyTax + insurance + hoaFee
    const noi = monthlyIncome - totalExpenses

    const leaseDates = propLeases
      .map((l) => parseLocalDate(l.end_date))
      .filter(Boolean) as Date[]
    const nearestLeaseEnd = leaseDates.length > 0
      ? leaseDates.sort((a, b) => a.getTime() - b.getTime())[0]
      : null

    return {
      id: p.id,
      name: p.name,
      property_type: p.property_type,
      address: p.address,
      city: p.city,
      state: p.state,
      status: p.status,
      monthlyIncome,
      mortgagePayment,
      mortgageBalance,
      mortgageBalanceConfirmedDate,
      mortgageRate,
      mortgageLender: p.mortgage_lender ?? null,
      propertyTax,
      insurance,
      hoaFee,
      totalExpenses,
      noi,
      totalUnits,
      activeLeaseCount,
      nearestLeaseEnd: nearestLeaseEnd ? nearestLeaseEnd.toISOString() : null,
    }
  })

  const portfolio = {
    totalIncome: propertyFinancials.reduce((s, p) => s + p.monthlyIncome, 0),
    totalExpenses: propertyFinancials.reduce((s, p) => s + p.totalExpenses, 0),
    totalMortgageBalance: propertyFinancials.reduce((s, p) => s + p.mortgageBalance, 0),
    netCashFlow: propertyFinancials.reduce((s, p) => s + p.noi, 0),
  }

  return <FinancialsClient properties={propertyFinancials} portfolio={portfolio} />
}
