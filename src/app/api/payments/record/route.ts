import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Check if a rent charge exists for a lease + month, and return lease defaults
export async function GET(req: NextRequest) {
  const admin = createAdminClient()
  const { searchParams } = new URL(req.url)
  const lease_id = searchParams.get('lease_id')
  const charge_month = searchParams.get('charge_month') // YYYY-MM-DD

  if (!lease_id || !charge_month) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { data: charge } = await admin
    .from('rent_charges')
    .select('id, ha_amount, tenant_amount, total_due')
    .eq('lease_id', lease_id)
    .eq('charge_month', charge_month)
    .maybeSingle()

  const { data: lease } = await admin
    .from('leases')
    .select('monthly_rent')
    .eq('id', lease_id)
    .single()

  return NextResponse.json({
    charge: charge ?? null,
    lease_defaults: lease
      ? {
          monthly_rent: lease.monthly_rent ?? 0,
          ha_amount: 0,
          tenant_amount: lease.monthly_rent ?? 0,
        }
      : null,
  })
}

// Create a payment, auto-creating the rent charge if it doesn't exist
export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const body = await req.json()
  const { lease_id, charge_month, amount, paid_by, method, paid_date, notes, ha_amount, tenant_amount } = body

  if (!lease_id || !charge_month || !amount || !paid_by || !method || !paid_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Look for an existing charge
  let { data: charge } = await admin
    .from('rent_charges')
    .select('id')
    .eq('lease_id', lease_id)
    .eq('charge_month', charge_month)
    .maybeSingle()

  let charge_created = false

  if (!charge) {
    const ha = parseFloat(ha_amount) || 0
    const tenant = parseFloat(tenant_amount) || 0
    const { data: newCharge, error: chargeError } = await admin
      .from('rent_charges')
      .insert({
        lease_id,
        charge_month,
        ha_amount: ha,
        tenant_amount: tenant,
        total_due: ha + tenant,
      })
      .select('id')
      .single()

    if (chargeError) {
      if ((chargeError as any).code === '23505') {
        return NextResponse.json({ error: 'A charge already exists for this lease and month.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create rent charge' }, { status: 500 })
    }
    if (!newCharge) {
      return NextResponse.json({ error: 'Failed to create rent charge' }, { status: 500 })
    }
    charge = newCharge
    charge_created = true
  }

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      charge_id: charge.id,
      lease_id,
      amount: parseFloat(amount),
      paid_by,
      method,
      paid_date,
      notes: notes || null,
      status: 'completed',
      type: 'rent',
    })
    .select('id')
    .single()

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    payment_id: payment.id,
    charge_id: charge.id,
    charge_created,
  })
}
