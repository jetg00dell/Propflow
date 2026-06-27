import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const body = await req.json()
  const { status, notes, tenant_name, tenant_email, property_name, unit_number, title } = body

  const updatePayload = { status, notes }
  console.log('[maintenance PATCH] id:', id)
  console.log('[maintenance PATCH] request body:', JSON.stringify(body))
  console.log('[maintenance PATCH] update payload sent to Supabase:', JSON.stringify(updatePayload))

  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[maintenance PATCH] Supabase update error — message:', error.message)
    console.error('[maintenance PATCH] Supabase update error — code:', error.code)
    console.error('[maintenance PATCH] Supabase update error — details:', error.details)
    console.error('[maintenance PATCH] Supabase update error — hint:', (error as any).hint)
    console.error('[maintenance PATCH] Supabase update error — full object:', JSON.stringify(error))
    return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 })
  }

  const statusLabel = { open: 'Open', in_progress: 'In Progress', completed: 'Completed' }[status as string] ?? status

  if (tenant_email && (status === 'in_progress' || status === 'completed')) {
    try {
      await resend.emails.send({
        from: 'J Goodell Homes <noreply@jgoodellhomes.com>',
        to: tenant_email,
        subject: `Update on your maintenance request — ${property_name}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1A2B4A">
            <h2 style="margin:0 0 8px;font-size:20px">Maintenance request update</h2>
            <p style="margin:0 0 24px;color:#6B7280">Hi ${tenant_name}, here's an update on your maintenance request.</p>
            <div style="background:#F5F6FA;border-radius:8px;padding:20px;margin-bottom:24px">
              <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Property</span><span style="font-weight:500">${property_name} — Unit ${unit_number}</span></div>
              <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Issue</span><span style="font-weight:500">${title}</span></div>
              <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Status</span><span style="font-weight:500;color:${status === 'completed' ? '#059669' : '#1C7BC0'}">${statusLabel}</span></div>
              ${notes ? `<div><span style="font-size:12px;color:#6B7280;display:block">Note from management</span><span>${notes}</span></div>` : ''}
            </div>
            <p style="color:#6B7280;font-size:14px">— J Goodell Homes</p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('[maintenance PATCH] Resend email error (status update still succeeded):', emailError)
    }
  }

  return NextResponse.json({ request })
}
