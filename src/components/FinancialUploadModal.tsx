'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type ExtractedData = {
  mortgage_payment: number | null
  mortgage_balance: number | null
  mortgage_rate: number | null
  property_tax: number | null
  insurance_premium: number | null
  electric_provider: string | null
  electric_account: string | null
  gas_provider: string | null
  gas_account: string | null
  water_provider: string | null
  water_account: string | null
  document_type: string | null
}

type Props = {
  propertyId: string
  propertyName: string
  onClose: () => void
  onSaved: () => void
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  mortgage_statement: 'Mortgage Statement',
  tax_assessment: 'Tax Assessment',
  insurance_declaration: 'Insurance Declaration',
  utility_bill: 'Utility Bill',
  other: 'Document',
}

const FIELD_LABELS: Record<string, string> = {
  mortgage_payment: 'Monthly mortgage payment ($)',
  mortgage_balance: 'Mortgage balance ($)',
  mortgage_rate: 'Mortgage rate (%)',
  property_tax: 'Annual property tax ($)',
  insurance_premium: 'Annual insurance premium ($)',
  electric_provider: 'Electric provider',
  electric_account: 'Electric account #',
  gas_provider: 'Gas provider',
  gas_account: 'Gas account #',
  water_provider: 'Water provider',
  water_account: 'Water account #',
}

export default function FinancialUploadModal({ propertyId, propertyName, onClose, onSaved }: Props) {
  const [step, setStep] = useState<'upload' | 'extracting' | 'review' | 'saving' | 'done' | 'error'>('upload')
  const [errorMsg, setErrorMsg] = useState('')
  const [fileName, setFileName] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [form, setForm] = useState<Partial<ExtractedData>>({})
  const [extractedFields, setExtractedFields] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setFileName(file.name)
    setStep('extracting')

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/extract-financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType: file.type, fileName: file.name }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed')

      const extracted: ExtractedData = data.extracted
      setDocumentType(extracted.document_type ?? 'other')

      const nonNull: Partial<ExtractedData> = {}
      const foundFields: string[] = []
      for (const [k, v] of Object.entries(extracted)) {
        if (k === 'document_type') continue
        if (v !== null && v !== undefined) {
          ;(nonNull as Record<string, unknown>)[k] = v
          foundFields.push(k)
        }
      }

      setForm(nonNull)
      setExtractedFields(foundFields)
      setStep('review')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('error')
    }
  }

  async function handleSave() {
    setStep('saving')
    const supabase = createClient()

    const updatePayload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(form)) {
      if (v === '' || v === null || v === undefined) continue
      const numericFields = ['mortgage_payment', 'mortgage_balance', 'mortgage_rate', 'property_tax', 'insurance_premium']
      if (numericFields.includes(k)) {
        const n = parseFloat(String(v))
        if (!isNaN(n)) updatePayload[k] = n
      } else {
        updatePayload[k] = v
      }
    }

    // If a mortgage balance was saved, record today as the confirmed date
    if (updatePayload.mortgage_balance) {
      updatePayload.mortgage_balance_date = new Date().toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', propertyId)

    if (error) {
      setErrorMsg(error.message)
      setStep('error')
    } else {
      setStep('done')
      setTimeout(() => {
        onSaved()
        onClose()
      }, 1200)
    }
  }

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1A2B4A]">Update financials</h2>
            <p className="text-xs text-gray-400 mt-0.5">{propertyName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5">
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Upload a mortgage statement, tax assessment, insurance declaration, or utility bill. Claude will extract the relevant numbers automatically.
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#1C7BC0] hover:bg-[#F0F7FF] transition-colors"
              >
                <p className="text-2xl mb-2">📄</p>
                <p className="text-sm font-medium text-[#1A2B4A]">Click to upload a document</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG — mortgage statements, tax bills, insurance docs, utility bills</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-2">Prefer to enter numbers manually?</p>
                <button
                  onClick={() => { setForm({}); setExtractedFields([]); setStep('review') }}
                  className="text-xs text-[#1C7BC0] hover:underline"
                >
                  Skip to manual entry →
                </button>
              </div>
            </div>
          )}

          {/* STEP: Extracting */}
          {step === 'extracting' && (
            <div className="py-8 text-center">
              <div className="inline-block w-8 h-8 border-2 border-[#1C7BC0] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-[#1A2B4A]">Reading {fileName}…</p>
              <p className="text-xs text-gray-400 mt-1">Claude is extracting financial data</p>
            </div>
          )}

          {/* STEP: Review */}
          {step === 'review' && (
            <div>
              {documentType && extractedFields.length > 0 && (
                <div className="mb-4 px-3 py-2 bg-[#F0F7FF] rounded-lg border border-[#1C7BC0]/20">
                  <p className="text-xs text-[#1C7BC0] font-medium">
                    ✓ Detected: {DOCUMENT_TYPE_LABELS[documentType] ?? 'Document'} — {extractedFields.length} field{extractedFields.length !== 1 ? 's' : ''} extracted
                  </p>
                </div>
              )}
              {extractedFields.length === 0 && (
                <p className="text-sm text-gray-500 mb-4">Enter the financial details you want to save for this property.</p>
              )}

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const val = (form as Record<string, unknown>)[key]
                  const wasExtracted = extractedFields.includes(key)
                  return (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {label}
                        {wasExtracted && (
                          <span className="ml-2 text-[#1C7BC0] font-normal">extracted</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={val !== null && val !== undefined ? String(val) : ''}
                        onChange={(e) => updateField(key, e.target.value)}
                        placeholder={label}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1C7BC0] text-[#1A2B4A]"
                      />
                    </div>
                  )
                })}

              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 text-sm bg-[#1C7BC0] text-white rounded-lg hover:bg-[#1669A8] font-medium"
                >
                  Save to property
                </button>
              </div>
            </div>
          )}

          {/* STEP: Saving */}
          {step === 'saving' && (
            <div className="py-8 text-center">
              <div className="inline-block w-8 h-8 border-2 border-[#1C7BC0] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-[#1A2B4A]">Saving…</p>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="py-8 text-center">
              <p className="text-3xl mb-3">✓</p>
              <p className="text-sm font-medium text-[#1A2B4A]">Saved successfully</p>
            </div>
          )}

          {/* STEP: Error */}
          {step === 'error' && (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-red-600 mb-2">Something went wrong</p>
              <p className="text-xs text-gray-400 mb-4">{errorMsg}</p>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm bg-[#1C7BC0] text-white rounded-lg hover:bg-[#1669A8]"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
