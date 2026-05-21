import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const body = await req.json()
  const { charge_id, amount, paid_by, method, paid_date, notes } = body

  const { data: charge, error: chargeError } = await admin
    .from('rent_charges')
    .select('lease_id, charge_month, ha_amount, tenant_amount, total_due')
    .eq('id', charge_id)
    .single()

  if (chargeError || !charge) return NextResponse.json({ error: 'Charge not found' }, { status: 404 })

  const { data, error } = await admin
    .from('payments')
    .insert({ charge_id, lease_id: charge.lease_id, amount, paid_by, method, paid_date, notes, status: 'completed', type: 'rent' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build nextMonthPrompt — always attempt, errors are silent
  let nextMonthPrompt: {
    needed: boolean
    isPartial: boolean
    nextMonth: string
    nextMonthDate: string
    suggestedCharge: { total_due: number; ha_amount: number; tenant_amount: number; late_fee_flat: number }
  } | null = null

  try {
    const { data: allPayments } = await admin
      .from('payments')
      .select('amount')
      .eq('charge_id', charge_id)

    const totalPaid = (allPayments ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0)
    const isPartial = totalPaid < (charge.total_due ?? 0)

    // charge_month is stored as YYYY-MM-DD; month field is 1-based in DB
    const [year, month] = (charge.charge_month as string).split('-').map(Number)
    const nextDate = new Date(year, month, 1) // JS months are 0-based: month (1-based) → correct next month
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

    const lateFeeFlat = (lease as any)?.late_fee_flat ?? 0

    nextMonthPrompt = {
      needed: !existing,
      isPartial,
      nextMonth,
      nextMonthDate,
      suggestedCharge: {
        total_due: charge.total_due ?? 0,
        ha_amount: charge.ha_amount ?? 0,
        tenant_amount: charge.tenant_amount ?? 0,
        late_fee_flat: lateFeeFlat,
      },
    }
  } catch (err) {
    console.error('[payments] nextMonthPrompt error:', err)
  }

  return NextResponse.json({ payment: data, nextMonthPrompt })
}
