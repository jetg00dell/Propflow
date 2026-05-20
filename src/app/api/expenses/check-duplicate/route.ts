import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { amount, date, property_id, exclude_id } = await req.json()

    if (!amount || !date || !property_id) {
      return NextResponse.json({ duplicates: [] })
    }

    const checkDate = new Date(date)
    const dateMinus3 = new Date(checkDate)
    const datePlus3 = new Date(checkDate)
    dateMinus3.setDate(dateMinus3.getDate() - 3)
    datePlus3.setDate(datePlus3.getDate() + 3)

    const fromDate = dateMinus3.toISOString().split('T')[0]
    const toDate = datePlus3.toISOString().split('T')[0]

    let query = supabase
      .from('expenses')
      .select('id, date, description, payee, amount, category, property_id')
      .eq('property_id', property_id)
      .eq('amount', parseFloat(amount))
      .gte('date', fromDate)
      .lte('date', toDate)

    if (exclude_id) {
      query = query.neq('id', exclude_id)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ duplicates: data ?? [] })
  } catch (err) {
    console.error('check-duplicate error:', err)
    return NextResponse.json({ duplicates: [] })
  }
}
