import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('expenses')
      .select('id, date, description, category, amount, property_id, payee, source, notes, created_at, maintenance_request_id')
      .order('date', { ascending: false })
    if (error) throw error
    return NextResponse.json({ expenses: data })
  } catch (err) {
    console.error('GET /api/expenses error:', err)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()

    const { date, amount, category, payee, property_id, notes, source } = body

    if (!date || !amount || !category || !property_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabase.from('expenses').insert({
      date,
      transaction_date: date,
      amount: parseFloat(amount),
      category,
      payee,
      description: payee,
      property_id,
      notes: notes || null,
      source: source ?? 'manual',
      maintenance_request_id: body.maintenance_request_id ?? null,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/expenses error:', err)
    return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 })
  }
}
