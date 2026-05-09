import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('id, title, status, unit_id, units(unit_number, property_id, properties(id, name))')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) throw error

    const requests = (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      unit_number: r.units?.unit_number,
      property_id: r.units?.properties?.id,
      property_name: r.units?.properties?.name,
    }))

    return NextResponse.json({ requests })
  } catch (err) {
    console.error('GET /api/maintenance-requests error:', err)
    return NextResponse.json({ error: 'Failed to fetch maintenance requests' }, { status: 500 })
  }
}
