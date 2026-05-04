import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType, fileName } = await req.json()

    const isImage = mediaType.startsWith('image/')
    const isPdf = mediaType === 'application/pdf'

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or image.' }, { status: 400 })
    }

    const contentBlock = isPdf
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType as 'application/pdf',
            data: base64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            data: base64,
          },
        }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: `You are a financial data extraction assistant for a property management system.

Extract the following financial information from this document. Return ONLY a valid JSON object with these exact keys — use null for any field not found in the document:

{
  "mortgage_payment": <monthly payment amount as number, e.g. 1842.50>,
  "mortgage_balance": <outstanding principal balance as number, e.g. 245000>,
  "mortgage_rate": <interest rate as number, e.g. 4.25 for 4.25%>,
  "property_tax": <annual property tax amount as number, e.g. 3600>,
  "insurance_premium": <annual insurance premium as number, e.g. 1200>,
  "electric_provider": <utility company name as string or null>,
  "electric_account": <account number as string or null>,
  "gas_provider": <gas company name as string or null>,
  "gas_account": <account number as string or null>,
  "water_provider": <water company name as string or null>,
  "water_account": <account number as string or null>,
  "document_type": <one of: "mortgage_statement", "tax_assessment", "insurance_declaration", "utility_bill", "other">
}

Return only the JSON object, no explanation, no markdown fences.`,
            },
          ],
        },
      ],
    })

    const text = response.content.find((b) => b.type === 'text')?.text ?? ''

    let extracted: Record<string, unknown> = {}
    try {
      extracted = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Could not parse extracted data. Try a clearer document.' }, { status: 422 })
    }

    return NextResponse.json({ extracted })
  } catch (err) {
    console.error('Extract financials error:', err)
    return NextResponse.json({ error: 'Extraction failed. Please try again.' }, { status: 500 })
  }
}
