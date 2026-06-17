import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const body = await req.json()
  const { type, title, issued_date, response_deadline, status, notes } = body

  const updates: Record<string, any> = {}
  if (type !== undefined) updates.type = type
  if (title !== undefined) updates.title = title || null
  if (issued_date !== undefined) updates.issued_date = issued_date
  if (response_deadline !== undefined) updates.response_deadline = response_deadline || null
  if (status !== undefined) updates.status = status
  if (notes !== undefined) updates.notes = notes || null

  const { data: notice, error } = await supabase
    .from('notices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ notice })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('notices').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
