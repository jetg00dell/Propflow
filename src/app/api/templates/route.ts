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

  console.log('[templates/upload] category:', category, 'filename:', file.name, 'size:', file.size, 'type:', file.type)

  // Remove all existing files for this category
  const { data: existing, error: listError } = await admin.storage
    .from('document-templates')
    .list(category)

  if (listError) console.error('[templates/upload] list error:', listError)
  console.log('[templates/upload] existing files:', existing)

  if (existing && existing.length > 0) {
    const paths = existing.map((f: any) => `${category}/${f.name}`)
    const { error: removeError } = await admin.storage.from('document-templates').remove(paths)
    if (removeError) console.error('[templates/upload] remove error:', removeError)
  }

  const storagePath = `${category}/${file.name}`
  const bytes = await file.arrayBuffer()
  console.log('[templates/upload] uploading to path:', storagePath, 'bytes:', bytes.byteLength)

  const { data: uploadData, error: uploadError } = await admin.storage
    .from('document-templates')
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[templates/upload] upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  console.log('[templates/upload] upload success:', uploadData)
  return NextResponse.json({ path: storagePath, filename: file.name })
}
