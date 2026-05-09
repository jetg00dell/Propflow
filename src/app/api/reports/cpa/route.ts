import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const year = req.nextUrl.searchParams.get('year') ?? 'all'

    let expQuery = supabase.from('expenses').select('property_id, category, amount, date')
    if (year !== 'all') {
      expQuery = expQuery.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
    }
    const { data: expenses, error: expError } = await expQuery

    if (expError) throw expError

    let payQuery = supabase
      .from('payments')
      .select('amount, lease_id, status, paid_date, leases(unit_id, units(property_id))')
      .eq('status', 'completed')
    if (year !== 'all') {
      payQuery = payQuery.gte('paid_date', `${year}-01-01`).lte('paid_date', `${year}-12-31`)
    }
    const { data: payments, error: payError } = await payQuery

    if (payError) throw payError

    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, city')
      .order('name')

    if (propError) throw propError

    const incomeByProperty: Record<string, number> = {}
    for (const pay of payments ?? []) {
      const propertyId = (pay.leases as any)?.units?.property_id
      if (propertyId) {
        incomeByProperty[propertyId] = (incomeByProperty[propertyId] ?? 0) + Number(pay.amount)
      }
    }

    const expensesByProperty: Record<string, Record<string, number>> = {}
    for (const exp of expenses ?? []) {
      if (!exp.property_id) continue
      if (!expensesByProperty[exp.property_id]) expensesByProperty[exp.property_id] = {}
      const cat = exp.category
      expensesByProperty[exp.property_id][cat] = (expensesByProperty[exp.property_id][cat] ?? 0) + Number(exp.amount)
    }

    const CATEGORIES = ['mortgage', 'utility', 'repair_maintenance', 'insurance', 'tax', 'capital_improvement', 'other']

    const rows = (properties ?? []).map(p => {
      const income = incomeByProperty[p.id] ?? 0
      const expCats = expensesByProperty[p.id] ?? {}
      const totalExpenses = CATEGORIES.reduce((sum, cat) => sum + (expCats[cat] ?? 0), 0)
      const netIncome = income - totalExpenses
      return {
        property_id: p.id,
        property_name: p.name,
        city: p.city,
        income,
        expenses: expCats,
        total_expenses: totalExpenses,
        net_income: netIncome,
      }
    })

    const totals = {
      income: rows.reduce((s, r) => s + r.income, 0),
      total_expenses: rows.reduce((s, r) => s + r.total_expenses, 0),
      net_income: rows.reduce((s, r) => s + r.net_income, 0),
    }

    return NextResponse.json({ rows, totals, categories: CATEGORIES })
  } catch (err) {
    console.error('CPA report error:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
