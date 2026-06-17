import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: doc, error } = await admin
    .from('lease_documents')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (error || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signed, error: signError } = await admin.storage
    .from('lease-documents')
    .createSignedUrl(doc.storage_path, 300)

  if (signError || !signed) return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })

  return NextResponse.json({ url: signed.signedUrl })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: doc, error } = await admin
    .from('lease_documents')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (error || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await admin.storage.from('lease-documents').remove([doc.storage_path])
  await admin.from('lease_documents').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
