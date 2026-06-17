import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const admin = createAdminClient()

  const { data: files, error } = await admin.storage
    .from('document-templates')
    .list(category, { limit: 1 })

  if (error || !files || files.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const storagePath = `${category}/${files[0].name}`
  const { data: signed, error: signError } = await admin.storage
    .from('document-templates')
    .createSignedUrl(storagePath, 300)

  if (signError || !signed) return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })

  return NextResponse.json({ url: signed.signedUrl, filename: files[0].name })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const admin = createAdminClient()

  const { data: files } = await admin.storage
    .from('document-templates')
    .list(category)

  if (files && files.length > 0) {
    const paths = files.map((f: any) => `${category}/${f.name}`)
    await admin.storage.from('document-templates').remove(paths)
  }

  return NextResponse.json({ ok: true })
}
