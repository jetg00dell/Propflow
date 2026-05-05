import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const { unit_id, tenant_id, title, description, urgency, tenant_name, tenant_email, property_name, unit_number } = body

  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .insert({ unit_id, tenant_id, title, description, urgency, status: 'open' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const urgencyLabel = { low: 'Low', medium: 'Medium', high: 'High', emergency: 'Emergency' }[urgency as string] ?? urgency
  const submittedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  await resend.emails.send({
    from: 'J Goodell Homes <noreply@jgoodellhomes.com>',
    to: tenant_email,
    subject: `Maintenance request received — ${property_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1A2B4A">
        <h2 style="margin:0 0 8px;font-size:20px">Maintenance request received</h2>
        <p style="margin:0 0 24px;color:#6B7280">Hi ${tenant_name}, we've received your request and will be in touch shortly.</p>
        <div style="background:#F5F6FA;border-radius:8px;padding:20px;margin-bottom:24px">
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Property</span><span style="font-weight:500">${property_name} — Unit ${unit_number}</span></div>
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Issue</span><span style="font-weight:500">${title}</span></div>
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Description</span><span>${description}</span></div>
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Urgency</span><span style="font-weight:500">${urgencyLabel}</span></div>
          <div><span style="font-size:12px;color:#6B7280;display:block">Submitted</span><span>${submittedAt}</span></div>
        </div>
        <p style="color:#6B7280;font-size:14px">If this is an emergency, please call us immediately. We'll follow up with an update as soon as your request is being addressed.</p>
        <p style="color:#6B7280;font-size:14px;margin-top:24px">— J Goodell Homes</p>
      </div>
    `
  })

  await resend.emails.send({
    from: 'PropFlow <noreply@jgoodellhomes.com>',
    to: ['jetgoodell@gmail.com', 'tjgoodell04@gmail.com'],
    subject: `[${urgencyLabel}] New maintenance request — ${property_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1A2B4A">
        <h2 style="margin:0 0 8px;font-size:20px">New maintenance request</h2>
        <div style="background:#F5F6FA;border-radius:8px;padding:20px;margin-bottom:24px">
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Tenant</span><span style="font-weight:500">${tenant_name}</span></div>
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Property</span><span style="font-weight:500">${property_name} — Unit ${unit_number}</span></div>
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Issue</span><span style="font-weight:500">${title}</span></div>
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Description</span><span>${description}</span></div>
          <div style="margin-bottom:12px"><span style="font-size:12px;color:#6B7280;display:block">Urgency</span><span style="font-weight:500;color:${urgency === 'emergency' ? '#DC2626' : urgency === 'high' ? '#D97706' : '#1A2B4A'}">${urgencyLabel}</span></div>
          <div><span style="font-size:12px;color:#6B7280;display:block">Submitted</span><span>${submittedAt}</span></div>
        </div>
        <a href="https://propflow-drnhm1i5i-jetg00dells-projects.vercel.app/maintenance" style="display:inline-block;background:#1C7BC0;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500">View in PropFlow</a>
      </div>
    `
  })

  return NextResponse.json({ request })
}
