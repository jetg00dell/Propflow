import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const { lease_id, type, title, issued_date, response_deadline, notes } = body

  const { data: notice, error } = await supabase
    .from('notices')
    .insert({
      lease_id,
      type,
      title: title || null,
      issued_date,
      response_deadline: response_deadline || null,
      status: 'active',
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ notice })
}
