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
  return NextResponse.json({ payment: data })
}
