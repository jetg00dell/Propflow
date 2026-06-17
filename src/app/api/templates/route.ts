import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const form = await req.formData()
  const file = form.get('file') as File | null
  const category = form.get('category') as string

  if (!file || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Remove all existing files for this category
  const { data: existing } = await admin.storage
    .from('document-templates')
    .list(category)

  if (existing && existing.length > 0) {
    const paths = existing.map((f: any) => `${category}/${f.name}`)
    await admin.storage.from('document-templates').remove(paths)
  }

  const storagePath = `${category}/${file.name}`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('document-templates')
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  return NextResponse.json({ path: storagePath, filename: file.name })
}
