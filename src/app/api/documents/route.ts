import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const form = await req.formData()
  const file = form.get('file') as File | null
  const lease_id = form.get('lease_id') as string
  const category = form.get('category') as string
  const notes = (form.get('notes') as string) || null

  if (!file || !lease_id || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Delete any existing document for this lease + category
  const { data: existing } = await admin
    .from('lease_documents')
    .select('id, storage_path')
    .eq('lease_id', lease_id)
    .eq('category', category)
    .maybeSingle()

  if (existing) {
    await admin.storage.from('lease-documents').remove([existing.storage_path])
    await admin.from('lease_documents').delete().eq('id', existing.id)
  }

  // Upload to storage
  const storagePath = `${lease_id}/${category}/${file.name}`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('lease-documents')
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Insert DB record
  const { data: doc, error: dbError } = await admin
    .from('lease_documents')
    .insert({ lease_id, category, filename: file.name, storage_path: storagePath, notes })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ document: doc })
}
