// src/app/api/parse-statement/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PROPERTIES = [
  { id: 'a1000000-0000-0000-0000-000000000001', name: '214 Clover Lane', city: 'Fort Collins' },
  { id: 'a1000000-0000-0000-0000-000000000002', name: '2252 Anelda Court', city: 'Loveland' },
  { id: 'a1000000-0000-0000-0000-000000000003', name: '337 Garfield Avenue', city: 'Loveland' },
  { id: 'a1000000-0000-0000-0000-000000000004', name: '317 Diamond Drive', city: 'Fort Collins' },
  { id: 'a1000000-0000-0000-0000-000000000005', name: '1506-1508 Estrella Avenue', city: 'Loveland' },
  { id: 'a1000000-0000-0000-0000-000000000006', name: '8329 Medicine Bow Avenue', city: 'Fort Collins' },
  { id: 'a1000000-0000-0000-0000-000000000007', name: '2616 Killdeer Drive', city: 'Fort Collins' },
  { id: 'a1000000-0000-0000-0000-000000000008', name: '2025 Creekwood Drive', city: 'Fort Collins' },
]

const TENANTS = [
  { id: 'c1000000-0000-0000-0000-000000000007', name: 'Christina Bachman', lease_id: 'd1000000-0000-0000-0000-000000000005', monthly_rent: 2320, unit: '1506', property_id: 'a1000000-0000-0000-0000-000000000005', property_name: '1506-1508 Estrella Avenue' },
  { id: 'c1000000-0000-0000-0000-000000000009', name: 'Darius Bell', lease_id: 'd1000000-0000-0000-0000-000000000007', monthly_rent: 2340, unit: 'Main', property_id: 'a1000000-0000-0000-0000-000000000008', property_name: '2025 Creekwood Drive' },
  { id: 'c1000000-0000-0000-0000-000000000010', name: 'Celia Bell', lease_id: 'd1000000-0000-0000-0000-000000000007', monthly_rent: 2340, unit: 'Main', property_id: 'a1000000-0000-0000-0000-000000000008', property_name: '2025 Creekwood Drive' },
  { id: 'c1000000-0000-0000-0000-000000000011', name: 'James Bostron', lease_id: 'd1000000-0000-0000-0000-000000000008', monthly_rent: 1955, unit: 'Main', property_id: 'a1000000-0000-0000-0000-000000000002', property_name: '2252 Anelda Court' },
  { id: 'c1000000-0000-0000-0000-000000000015', name: 'Moses Brown', lease_id: 'd1000000-0000-0000-0000-000000000011', monthly_rent: 2730, unit: 'Main', property_id: 'a1000000-0000-0000-0000-000000000006', property_name: '8329 Medicine Bow Avenue' },
  { id: 'c1000000-0000-0000-0000-000000000013', name: 'Sherry Garcia', lease_id: 'd1000000-0000-0000-0000-000000000009', monthly_rent: 1801, unit: 'ADU', property_id: 'a1000000-0000-0000-0000-000000000002', property_name: '2252 Anelda Court' },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Amanda Goodell', lease_id: 'd1000000-0000-0000-0000-000000000001', monthly_rent: 1745, unit: 'Main', property_id: 'a1000000-0000-0000-0000-000000000004', property_name: '317 Diamond Drive' },
  { id: 'c1000000-0000-0000-0000-000000000006', name: 'Diona Green', lease_id: 'd1000000-0000-0000-0000-000000000004', monthly_rent: 1780, unit: '339', property_id: 'a1000000-0000-0000-0000-000000000003', property_name: '337 Garfield Avenue' },
  { id: 'c1000000-0000-0000-0000-000000000008', name: 'Forest Mangus', lease_id: 'd1000000-0000-0000-0000-000000000006', monthly_rent: 2210, unit: '1508', property_id: 'a1000000-0000-0000-0000-000000000005', property_name: '1506-1508 Estrella Avenue' },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Andrew Marshall', lease_id: 'd1000000-0000-0000-0000-000000000002', monthly_rent: 1355, unit: 'ADU', property_id: 'a1000000-0000-0000-0000-000000000004', property_name: '317 Diamond Drive' },
  { id: 'c1000000-0000-0000-0000-000000000014', name: 'Ryan Miller', lease_id: 'd1000000-0000-0000-0000-000000000010', monthly_rent: 1692, unit: 'ADU', property_id: 'a1000000-0000-0000-0000-000000000007', property_name: '2616 Killdeer Drive' },
  { id: 'c1000000-0000-0000-0000-000000000001', name: "Conor O'Shea", lease_id: 'd1000000-0000-0000-0000-000000000001', monthly_rent: 1745, unit: 'Main', property_id: 'a1000000-0000-0000-0000-000000000004', property_name: '317 Diamond Drive' },
  { id: 'c1000000-0000-0000-0000-000000000012', name: 'Lizzy Rendon', lease_id: 'd1000000-0000-0000-0000-000000000008', monthly_rent: 1955, unit: 'Main', property_id: 'a1000000-0000-0000-0000-000000000002', property_name: '2252 Anelda Court' },
  { id: 'c1000000-0000-0000-0000-000000000004', name: 'Susan Rutledge', lease_id: 'd1000000-0000-0000-0000-000000000002', monthly_rent: 1355, unit: 'ADU', property_id: 'a1000000-0000-0000-0000-000000000004', property_name: '317 Diamond Drive' },
  { id: 'c1000000-0000-0000-0000-000000000005', name: 'Rachel Sullivan', lease_id: 'd1000000-0000-0000-0000-000000000003', monthly_rent: 2679, unit: '337', property_id: 'a1000000-0000-0000-0000-000000000003', property_name: '337 Garfield Avenue' },
]

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const propertyList = PROPERTIES.map(p => `${p.id} | ${p.name}, ${p.city}`).join('\n')
    const tenantList = TENANTS.map(t =>
      `${t.id} | ${t.name} | unit ${t.unit} | rent $${t.monthly_rent}/mo | lease ${t.lease_id} | property ${t.property_id} (${t.property_name})`
    ).join('\n')

    const prompt = `You are a bookkeeper for a property management company. Extract and categorize every transaction from this Wells Fargo bank statement.

PROPERTIES:
${propertyList}

ACTIVE TENANTS (name | unit | monthly rent | lease_id | property):
${tenantList}

For each transaction return a JSON array. Each item must have exactly these fields:
- date: string (YYYY-MM-DD)
- description: string (full description from statement)
- amount: number (positive for deposits/credits, negative for withdrawals/debits)
- type: "deposit" | "withdrawal"
- category: one of: "rent_income" | "mortgage" | "utility" | "repair_maintenance" | "insurance" | "tax" | "advertising" | "management_fees" | "professional_fees" | "supplies" | "capital_improvement" | "other"
- property_id: UUID from properties list if matched, otherwise null
- property_name: property name if matched, otherwise null
- tenant_id: UUID from tenants list if you can match a tenant name in the description, otherwise null
- tenant_name: tenant full name if matched, otherwise null
- lease_id: lease UUID from tenants list if tenant matched, otherwise null
- confidence: "high" | "low"
- needs_review: boolean
- review_reason: string or null (explain why it needs review)
- suggested_match_type: for deposits only: "rent_payment" | "tenant_reimbursement" | "other_income" | null

Tenant matching rules:
- If a Zelle or payment description contains a person's name, look it up in the ACTIVE TENANTS list
- Match on first name, last name, or both
- When matching a name, try BOTH "First Last" and "Last First" orderings — e.g. "Brown Moses" should match tenant "Moses Brown"
- If tenant matched, also set property_id and property_name from that tenant's property
- Christina Bachman = unit 1506, Forest Mangus = unit 1508 — both at 1506-1508 Estrella Avenue
- If amount is close to a tenant's monthly_rent (within $200), confidence is "high" for rent_payment

Categorization rules:
- Selene Finance = mortgage. Match property from description keyword (e.g. "Estrella")
- City of Loveland BILLPAY = utility for a Loveland property
- Zelle with "rent" in memo = rent_income, needs_review: true, suggested_match_type: "rent_payment"
- Zelle with non-rent memo (TV mount, repair, installation, etc) = needs_review: true, suggested_match_type: "tenant_reimbursement", category: "other"
- Mobile Deposit with no identifying info = needs_review: true
- All deposits = needs_review: true (must be matched to payments table)
- Withdrawals with uncertain property = needs_review: true, confidence: "low"
- Payments to Zillow, Apartments.com, Facebook Ads, or any listing service = advertising
- Payments to a property management company = management_fees
- Payments to a CPA, accountant, attorney, or law firm = professional_fees
- Hardware store purchases under $50 (Home Depot, Lowes, Ace Hardware) = supplies
- Hardware store purchases over $50 = repair_maintenance

Return ONLY a valid JSON array, no markdown, no explanation.`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const transactions = JSON.parse(clean)

    const needsReview = transactions.filter((t: any) => t.needs_review)
    const autoApproved = transactions.filter((t: any) => !t.needs_review)

    // Return tenant list so the UI can populate the tenant dropdown
    return NextResponse.json({
      transactions,
      tenants: TENANTS,
      summary: {
        total: transactions.length,
        needsReview: needsReview.length,
        autoApproved: autoApproved.length,
      },
    })
  } catch (err) {
    console.error('parse-statement error:', err)
    return NextResponse.json({ error: 'Failed to parse statement' }, { status: 500 })
  }
}
