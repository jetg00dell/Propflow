import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const body = await req.json()
  const { charge_id, amount, paid_by, method, paid_date, notes } = body

  const { data: charge, error: chargeError } = await admin
    .from('rent_charges')
    .select('lease_id')
    .eq('id', charge_id)
    .single()

  if (chargeError || !charge) return NextResponse.json({ error: 'Charge not found' }, { status: 404 })

  const { data, error } = await admin
    .from('payments')
    .insert({ charge_id, lease_id: charge.lease_id, amount, paid_by, method, paid_date, notes, status: 'completed', type: 'rent' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create next month's charge if this payment fully pays off the current charge
  try {
    const { data: fullCharge } = await admin
      .from('rent_charges')
      .select('lease_id, charge_month, ha_amount, tenant_amount, total_due')
      .eq('id', charge_id)
      .single()

    if (fullCharge) {
      const { data: allPayments } = await admin
        .from('payments')
        .select('amount')
        .eq('charge_id', charge_id)

      const totalPaid = (allPayments ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0)

      if (totalPaid >= (fullCharge.total_due ?? 0)) {
        // Advance charge_month by 1 month
        const [year, month] = (fullCharge.charge_month as string).split('-').map(Number)
        const nextDate = new Date(year, month, 1) // month is already 1-based from DB, so month+0 = next month
        const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`

        const { data: existing } = await admin
          .from('rent_charges')
          .select('id')
          .eq('lease_id', fullCharge.lease_id)
          .eq('charge_month', nextMonth)
          .maybeSingle()

        if (!existing) {
          const { error: insertError } = await admin
            .from('rent_charges')
            .insert({
              lease_id: fullCharge.lease_id,
              charge_month: nextMonth,
              ha_amount: fullCharge.ha_amount ?? 0,
              tenant_amount: fullCharge.tenant_amount ?? 0,
              total_due: fullCharge.total_due ?? 0,
              notes: null,
            })

          if (insertError) {
            // 23505 = already exists (race condition), silently ignore
            if ((insertError as any).code !== '23505') {
              console.error('[payments] auto-create next charge error:', insertError)
            }
          }
        }
      }
    }
  } catch (autoErr) {
    console.error('[payments] auto-create next charge exception:', autoErr)
  }

  return NextResponse.json({ payment: data })
}
