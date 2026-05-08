// src/app/api/save-statement/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { transactions, filename } = body

    // Log the import
    const { data: importLog } = await supabase
      .from('csv_imports')
      .insert({
        filename: filename ?? 'statement.pdf',
        row_count: transactions.length,
        matched_count: transactions.filter((t: any) => t.property_id).length,
        review_count: transactions.filter((t: any) => t.needs_review).length,
      })
      .select('id')
      .single()

    const importId = importLog?.id

    const expenses = []
    const rentMatches = []
    const skipped = []

    for (const t of transactions) {
      // Deposits that are rent payments go to a separate return list
      // for Tammy to match in the payments table
      if (t.type === 'deposit' && t.suggested_match_type === 'rent_payment') {
        rentMatches.push({
          date: t.date,
          description: t.description,
          amount: t.amount,
          property_id: t.property_id,
          property_name: t.property_name,
        })
        continue
      }

      // Deposits that are tenant reimbursements go to expenses as negative amount
      // (they offset repair costs)
      if (t.type === 'deposit' && t.suggested_match_type === 'tenant_reimbursement') {
        expenses.push({
          property_id: t.property_id,
          category: 'repair_maintenance',
          description: t.description,
          payee: 'Tenant reimbursement',
          amount: -Math.abs(t.amount), // negative = reduces expense
          date: t.date,
          transaction_date: t.date,
          source: 'csv_import',
          csv_import_id: importId,
          notes: `Tenant reimbursement - ${t.description}`,
        })
        continue
      }

      // Other income deposits
      if (t.type === 'deposit' && t.suggested_match_type === 'other_income') {
        expenses.push({
          property_id: t.property_id,
          category: 'other',
          description: t.description,
          payee: t.description,
          amount: -Math.abs(t.amount), // negative = income offset
          date: t.date,
          transaction_date: t.date,
          source: 'csv_import',
          csv_import_id: importId,
          notes: 'Other income from bank statement',
        })
        continue
      }

      // Withdrawals go to expenses
      if (t.type === 'withdrawal') {
        expenses.push({
          property_id: t.property_id,
          category: t.category,
          description: t.description,
          payee: t.description,
          amount: Math.abs(t.amount),
          date: t.date,
          transaction_date: t.date,
          source: 'csv_import',
          csv_import_id: importId,
          notes: null,
        })
        continue
      }

      skipped.push(t)
    }

    // Insert expenses
    let savedExpenses = 0
    if (expenses.length > 0) {
      const { error } = await supabase.from('expenses').insert(expenses)
      if (error) throw error
      savedExpenses = expenses.length
    }

    return NextResponse.json({
      success: true,
      savedExpenses,
      rentMatchCount: rentMatches.length,
      rentMatches, // return these so UI can show them for payment matching
      skippedCount: skipped.length,
    })
  } catch (err) {
    console.error('save-statement error:', err)
    return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 })
  }
}
