import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const body = await req.json()
  const {
    charge_id: bodyChargeId,
    lease_id: bodyLeaseId,
    charge_month: bodyChargeMonth,
    amount,
    paid_by,
    method,
    paid_date,
    notes,
    ha_amount,
    tenant_amount,
  } = body

  // Resolve charge — accept charge_id OR (lease_id + charge_month)
  let chargeId: string
  let charge: { lease_id: string; charge_month: string; ha_amount: number; tenant_amount: number; total_due: number }

  if (bodyChargeId) {
    const { data, error } = await admin
      .from('rent_charges')
      .select('lease_id, charge_month, ha_amount, tenant_amount, total_due')
      .eq('id', bodyChargeId)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Charge not found' }, { status: 404 })
    chargeId = bodyChargeId
    charge = data
  } else {
    if (!bodyLeaseId || !bodyChargeMonth) {
      return NextResponse.json({ error: 'Missing charge_id or lease_id + charge_month' }, { status: 400 })
    }
    // Find or create charge
    const { data: existing } = await admin
      .from('rent_charges')
      .select('id, lease_id, charge_month, ha_amount, tenant_amount, total_due')
      .eq('lease_id', bodyLeaseId)
      .eq('charge_month', bodyChargeMonth)
      .maybeSingle()

    if (existing) {
      chargeId = existing.id
      charge = existing
    } else {
      const ha = parseFloat(ha_amount) || 0
      const tenant = parseFloat(tenant_amount) || 0
      const { data: newCharge, error: chargeError } = await admin
        .from('rent_charges')
        .insert({ lease_id: bodyLeaseId, charge_month: bodyChargeMonth, ha_amount: ha, tenant_amount: tenant, total_due: ha + tenant })
        .select('id, lease_id, charge_month, ha_amount, tenant_amount, total_due')
        .single()

      if (chargeError) {
        if ((chargeError as any).code === '23505') {
          // Race: fetch the now-existing charge
          const { data: raceCharge } = await admin
            .from('rent_charges')
            .select('id, lease_id, charge_month, ha_amount, tenant_amount, total_due')
            .eq('lease_id', bodyLeaseId)
            .eq('charge_month', bodyChargeMonth)
            .maybeSingle()
          if (!raceCharge) return NextResponse.json({ error: 'A charge already exists for this lease and month.' }, { status: 409 })
          chargeId = raceCharge.id
          charge = raceCharge
        } else {
          return NextResponse.json({ error: 'Failed to create rent charge' }, { status: 500 })
        }
      } else {
        chargeId = newCharge!.id
        charge = newCharge!
      }
    }
  }

  const { data, error } = await admin
    .from('payments')
    .insert({ charge_id: chargeId, lease_id: charge.lease_id, amount, paid_by, method, paid_date, notes, status: 'completed', type: 'rent' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build nextMonthPrompt — always attempt, errors are silent
  let nextMonthPrompt: {
    needed: boolean
    isPartial: boolean
    nextMonth: string
    nextMonthDate: string
    suggestedCharge: {
      total_due: number
      ha_amount: number
      tenant_amount: number
      late_fee_flat: number
      ha_remaining: number
      tenant_remaining: number
    }
  } | null = null

  try {
    const { data: allPayments } = await admin
      .from('payments')
      .select('amount, paid_by')
      .eq('charge_id', chargeId)

    const totalPaid = (allPayments ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
    const haPaid = (allPayments ?? []).filter((p: any) => p.paid_by === 'ha').reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
    const tenantPaid = (allPayments ?? []).filter((p: any) => p.paid_by === 'tenant').reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
    const isPartial = totalPaid < (charge.total_due ?? 0)

    const [year, month] = (charge.charge_month as string).split('-').map(Number)
    const nextDate = new Date(year, month, 1) // month is 1-based in DB → 0-based JS → correct next month
    const nextMonthDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = nextDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const { data: existing } = await admin
      .from('rent_charges')
      .select('id')
      .eq('lease_id', charge.lease_id)
      .eq('charge_month', nextMonthDate)
      .maybeSingle()

    const { data: lease } = await admin
      .from('leases')
      .select('late_fee_flat')
      .eq('id', charge.lease_id)
      .maybeSingle()

    nextMonthPrompt = {
      needed: !existing,
      isPartial,
      nextMonth,
      nextMonthDate,
      suggestedCharge: {
        total_due: charge.total_due ?? 0,
        ha_amount: charge.ha_amount ?? 0,
        tenant_amount: charge.tenant_amount ?? 0,
        late_fee_flat: (lease as any)?.late_fee_flat ?? 0,
        ha_remaining: Math.max(0, (charge.ha_amount ?? 0) - haPaid),
        tenant_remaining: Math.max(0, (charge.tenant_amount ?? 0) - tenantPaid),
      },
    }
  } catch (err) {
    console.error('[payments] nextMonthPrompt error:', err)
  }

  return NextResponse.json({ payment: data, nextMonthPrompt })
}
