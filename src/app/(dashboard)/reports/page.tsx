import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: properties } = await admin
    .from('properties')
    .select('id, name, address, city, state, property_type, mortgage_payment, insurance_premium, property_tax, hoa_fee, estimated_value, purchase_price, cash_invested')
    .order('name')

  const { data: units } = await admin
    .from('units')
    .select('id, property_id, status, market_rent, unit_number')

  const { data: leases } = await admin
    .from('leases')
    .select('id, unit_id, monthly_rent')
    .eq('status', 'active')

  // Merge maps
  const unitToProperty: Record<string, string> = {}
  for (const u of units ?? []) unitToProperty[u.id] = u.property_id

  const unitsByProperty: Record<string, NonNullable<typeof units>> = {}
  for (const u of units ?? []) {
    if (!unitsByProperty[u.property_id]) unitsByProperty[u.property_id] = []
    unitsByProperty[u.property_id].push(u)
  }

  const leasesByProperty: Record<string, NonNullable<typeof leases>> = {}
  for (const l of leases ?? []) {
    const propId = unitToProperty[l.unit_id]
    if (!propId) continue
    if (!leasesByProperty[propId]) leasesByProperty[propId] = []
    leasesByProperty[propId].push(l)
  }

  const propertyReports = (properties ?? []).map((p) => {
    const propUnits = unitsByProperty[p.id] ?? []
    const propLeases = leasesByProperty[p.id] ?? []

    const totalUnits = propUnits.length
    const occupiedUnits = propUnits.filter((u) => u.status === 'occupied').length
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

    const grossMonthlyIncome = propLeases.reduce((s, l) => s + (l.monthly_rent ?? 0), 0)
    const mortgagePayment = p.mortgage_payment ?? 0
    const operatingExpenses =
      (p.insurance_premium ?? 0) / 12 +
      (p.property_tax ?? 0) / 12 +
      (p.hoa_fee ?? 0)
    const totalExpenses = mortgagePayment + operatingExpenses

    const noi = grossMonthlyIncome - operatingExpenses
    const monthlyCashFlow = grossMonthlyIncome - totalExpenses
    const annualCashFlow = monthlyCashFlow * 12

    const cashOnCash =
      (p.cash_invested ?? 0) > 0
        ? (annualCashFlow / (p.cash_invested as number)) * 100
        : null

    const capRate =
      (p.estimated_value ?? 0) > 0
        ? ((noi * 12) / (p.estimated_value as number)) * 100
        : null

    return {
      id: p.id,
      name: p.name,
      address: p.address,
      city: p.city,
      state: p.state,
      property_type: p.property_type,
      totalUnits,
      occupiedUnits,
      occupancyRate,
      grossMonthlyIncome,
      operatingExpenses,
      mortgagePayment,
      totalExpenses,
      noi,
      monthlyCashFlow,
      annualCashFlow,
      cashOnCash,
      capRate,
      estimatedValue: (p.estimated_value as number | null) ?? null,
      cashInvested: (p.cash_invested as number | null) ?? null,
    }
  })

  return <ReportsClient properties={propertyReports} />
}
