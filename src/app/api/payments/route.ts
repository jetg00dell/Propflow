import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const body = await req.json()
  const { charge_id, amount, paid_by, method, paid_date, note } = body

  const { data, error } = await admin
    .from('payments')
    .insert({ charge_id, amount, paid_by, method, paid_date, note })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payment: data })
}
