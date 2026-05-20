import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    let { tenant_id, lease_id, amount, date, description } = await req.json()

    if (!amount || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fallback: resolve lease_id from tenant if not provided
    if (!lease_id && tenant_id) {
      const { data: leaseLink } = await supabase
        .from('lease_tenants')
        .select('lease_id, leases(id, monthly_rent, ha_amount, tenant_amount, status)')
        .eq('tenant_id', tenant_id)
        .eq('leases.status', 'active')
        .single()
      if (leaseLink?.lease_id) {
        lease_id = leaseLink.lease_id
      }
    }

    if (!lease_id) {
      return NextResponse.json({ error: 'Could not determine lease' }, { status: 400 })
    }

    // Get lease details for monthly_rent and ha/tenant split
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, monthly_rent, ha_amount, tenant_amount')
      .eq('id', lease_id)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    // Determine charge month from deposit date
    const depositDate = new Date(date)
    const chargeMonth = new Date(depositDate.getFullYear(), depositDate.getMonth(), 1)
      .toISOString().split('T')[0]

    // Check if rent charge already exists for this lease + month
    const chargeExisted = true
    let { data: charge } = await supabase
      .from('rent_charges')
      .select('id, total_due, tenant_amount, ha_amount')
      .eq('lease_id', lease_id)
      .eq('charge_month', chargeMonth)
      .single()

    let chargeAutoCreated = false

    // Auto-create charge if it doesn't exist
    if (!charge) {
      const { data: newCharge, error: chargeError } = await supabase
        .from('rent_charges')
        .insert({
          lease_id,
          charge_month: chargeMonth,
          total_due: lease.monthly_rent,
          tenant_amount: lease.tenant_amount ?? lease.monthly_rent,
          ha_amount: lease.ha_amount ?? 0,
          notes: 'Auto-created from bank statement import',
        })
        .select('id, total_due, tenant_amount, ha_amount')
        .single()

      if (chargeError || !newCharge) {
        return NextResponse.json({ error: 'Failed to create rent charge' }, { status: 500 })
      }
      charge = newCharge
      chargeAutoCreated = true
    }

    const notes = `Auto-matched from bank statement: ${description}`
    const paymentIds: string[] = []

    const haAmount = charge.ha_amount ?? 0
    const tenantAmount = charge.tenant_amount ?? 0

    if (haAmount > 0 && tenantAmount > 0) {
      // Split payment: one HA record, one tenant record
      const { data: haPayment, error: haError } = await supabase
        .from('payments')
        .insert({
          lease_id,
          charge_id: charge.id,
          amount: haAmount,
          paid_by: 'ha',
          method: 'zelle',
          status: 'completed',
          paid_date: date,
          notes,
        })
        .select('id')
        .single()

      if (haError) {
        return NextResponse.json({ error: 'Failed to create HA payment' }, { status: 500 })
      }
      paymentIds.push(haPayment.id)

      const { data: tenantPayment, error: tenantError } = await supabase
        .from('payments')
        .insert({
          lease_id,
          charge_id: charge.id,
          amount: tenantAmount,
          paid_by: 'tenant',
          method: 'zelle',
          status: 'completed',
          paid_date: date,
          notes,
        })
        .select('id')
        .single()

      if (tenantError) {
        return NextResponse.json({ error: 'Failed to create tenant payment' }, { status: 500 })
      }
      paymentIds.push(tenantPayment.id)
    } else {
      // Single tenant payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          lease_id,
          charge_id: charge.id,
          amount: parseFloat(amount),
          paid_by: 'tenant',
          method: 'zelle',
          status: 'completed',
          paid_date: date,
          notes,
        })
        .select('id')
        .single()

      if (paymentError) {
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
      }
      paymentIds.push(payment.id)
    }

    return NextResponse.json({
      success: true,
      payment_ids: paymentIds,
      charge_id: charge.id,
      charge_month: chargeMonth,
      charge_auto_created: chargeAutoCreated,
    })
  } catch (err) {
    console.error('match-rent-payment error:', err)
    return NextResponse.json({ error: 'Failed to match payment' }, { status: 500 })
  }
}
