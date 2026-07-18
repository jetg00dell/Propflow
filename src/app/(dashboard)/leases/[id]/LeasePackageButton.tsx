'use client'

export type LeasePackageData = {
  tenants: Array<{ first_name: string; last_name: string; is_primary: boolean }>
  property: {
    address: string | null
    city: string | null
    state: string | null
    owner_entity: string | null
    is_cares_act: boolean | null
    year_built: number | null
  } | null
  unit: { unit_number: string | null } | null
  lease: {
    start_date: string | null
    end_date: string | null
    monthly_rent: number | null
    security_deposit: number | null
    pet_rent: number | null
    pet_deposit: number | null
    rent_due_day: number | null
    grace_period_days: number | null
    late_fee_flat: number | null
  }
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return `$${n.toLocaleString()}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:7px 0;color:#6B7280;width:200px;vertical-align:top;font-size:13px;padding-right:16px">${label}</td>
    <td style="padding:7px 0;color:#1A2B4A;font-weight:500;font-size:13px">${value}</td>
  </tr>`
}

function buildHTML(data: LeasePackageData): string {
  const { tenants, property, unit, lease } = data

  const tenantNames = tenants.length > 0
    ? tenants.map(t => `${t.first_name} ${t.last_name}${t.is_primary ? ' <span style="color:#9CA3AF;font-weight:400;font-size:12px">(Primary)</span>' : ''}`).join(', ')
    : '—'

  const showLeadPaint = typeof property?.year_built === 'number' && property.year_built < 1978
  const isCares = property?.is_cares_act === true
  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const ALWAYS_REQUIRED = [
    'Lease Agreement',
    'Lease Addenda',
    'Radon Disclosure',
    'Brokerage Disclosure',
    'Move-In Checklist',
  ]
  const docs = [
    ...ALWAYS_REQUIRED,
    ...(showLeadPaint ? ['Lead Paint Disclosure <span style="color:#9CA3AF;font-size:12px">(pre-1978 property)</span>'] : []),
  ]

  const checklist = docs.map(label => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #F3F4F6">
      <div style="width:18px;height:18px;border:2px solid #D1D5DB;border-radius:3px;background:white;flex-shrink:0;margin-top:1px"></div>
      <span style="font-size:13px;color:#1A2B4A">${label}</span>
    </div>`).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <title>Lease Package — ${property?.address ?? 'Property'}</title>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: white;
      color: #1A2B4A;
      padding: 48px;
      max-width: 780px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 24px; }
      @page { margin: 0.75in; }
    }
    .section { margin-bottom: 32px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #6B7280;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #F3F4F6;
    }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:3px solid #1C7BC0">
    <div>
      <h1 style="font-size:22px;font-weight:700;color:#1A2B4A">Lease Package Summary</h1>
      <p style="color:#6B7280;font-size:13px;margin-top:5px">
        ${property?.address ?? ''}${unit?.unit_number ? ` &middot; Unit ${unit.unit_number}` : ''}
        &middot; Larimer County, ${property?.state ?? 'CO'}
      </p>
    </div>
    <p style="color:#9CA3AF;font-size:12px;white-space:nowrap;padding-top:4px;flex-shrink:0;margin-left:24px">Generated ${generatedDate}</p>
  </div>

  <!-- Tenant & Lease Info -->
  <div class="section">
    <p class="section-title">Tenant &amp; Lease Info</p>
    <table>
      ${row('Tenant(s)', tenantNames)}
      ${row('Property', `${property?.address ?? '—'}, Larimer County, ${property?.state ?? 'CO'}`)}
      ${unit?.unit_number ? row('Unit', `Unit ${unit.unit_number}`) : ''}
      ${row('Lease Term', `${formatDate(lease.start_date)} &ndash; ${formatDate(lease.end_date)}`)}
      ${row('Monthly Rent', fmt(lease.monthly_rent))}
      ${row('Security Deposit', fmt(lease.security_deposit))}
      ${(lease.pet_deposit ?? 0) > 0 ? row('Pet Deposit', fmt(lease.pet_deposit)) : ''}
      ${(lease.pet_rent ?? 0) > 0 ? row('Pet Rent', `${fmt(lease.pet_rent)}/mo`) : ''}
      ${row('Rent Due', lease.rent_due_day != null ? `Day ${lease.rent_due_day} of each month` : '—')}
      ${row('Grace Period', lease.grace_period_days != null ? `${lease.grace_period_days} days` : '—')}
      ${row('Late Fee', (lease.late_fee_flat ?? 0) > 0 ? `${fmt(lease.late_fee_flat)} flat` : '—')}
    </table>
  </div>

  <!-- Landlord Info -->
  <div class="section">
    <p class="section-title">Landlord Info</p>
    <table>
      ${row('Landlord Name', 'Jeff Goodell')}
      ${row('Owner Entity', property?.owner_entity ?? 'Individual')}
      ${row('Property Address', `${property?.address ?? '—'}, ${property?.city ?? ''}, ${property?.state ?? ''}`)}
    </table>
  </div>

  <!-- Document Checklist -->
  <div class="section">
    <p class="section-title">Document Checklist</p>
    ${checklist}
    ${isCares ? `
    <div style="margin-top:14px;padding:12px 16px;background:#FEF3C7;border-left:3px solid #D97706;border-radius:4px">
      <p style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:2px">CARES Act Property</p>
      <p style="font-size:12px;color:#92400E">This property is subject to CARES Act protections. Confirm the CARES Act addendum is included in the lease package.</p>
    </div>` : ''}
  </div>

  <!-- Footer -->
  <div style="margin-top:48px;padding-top:14px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center">
    <span style="color:#9CA3AF;font-size:11px">PropFlow &middot; J Goodell Homes</span>
    <span style="color:#9CA3AF;font-size:11px">Confidential — Internal use only</span>
  </div>

  <script>
    window.onload = function() {
      window.print()
      window.onafterprint = function() { window.close() }
    }
  <\/script>
</body>
</html>`
}

export default function LeasePackageButton({ data }: { data: LeasePackageData }) {
  function handleClick() {
    const html = buildHTML(data)
    const win = window.open('', '_blank', 'width=860,height=1100')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  return (
    <button
      onClick={handleClick}
      className="bg-[#1C7BC0] hover:bg-[#1669A8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
    >
      Generate Lease Package
    </button>
  )
}
