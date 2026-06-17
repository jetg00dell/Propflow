'use client'

import { useState, useRef } from 'react'
import { Upload, Eye, Trash2, FileText } from 'lucide-react'

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'lease_agreement', label: 'Lease Agreement' },
  { key: 'addenda', label: 'Addenda' },
  { key: 'disclosure_lead', label: 'Lead Paint Disclosure' },
  { key: 'disclosure_radon', label: 'Radon Disclosure' },
  { key: 'disclosure_brokerage', label: 'Brokerage Disclosure' },
  { key: 'checklist_movein', label: 'Move-In Checklist' },
  { key: 'checklist_moveout', label: 'Move-Out Checklist' },
]

type DocRecord = {
  id: string
  category: string
  filename: string
  uploaded_at: string
  notes: string | null
}

type Props = {
  leaseId: string
  initialDocs: DocRecord[]
  hideLeadDisclosure: boolean
}

export default function DocumentsSection({ leaseId, initialDocs, hideLeadDisclosure }: Props) {
  const [docs, setDocs] = useState<DocRecord[]>(initialDocs)
  const [uploading, setUploading] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingCategoryRef = useRef<string>('')

  const categories = CATEGORIES.filter(c => !(hideLeadDisclosure && c.key === 'disclosure_lead'))

  const docByCategory = Object.fromEntries(docs.map(d => [d.category, d]))

  function triggerUpload(category: string) {
    pendingCategoryRef.current = category
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const category = pendingCategoryRef.current
    if (!file || !category) return

    setUploading(category)
    const form = new FormData()
    form.append('file', file)
    form.append('lease_id', leaseId)
    form.append('category', category)

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: form })
      const json = await res.json()
      if (json.document) {
        setDocs(prev => {
          const filtered = prev.filter(d => d.category !== category)
          return [...filtered, json.document]
        })
      }
    } finally {
      setUploading(null)
    }
  }

  async function handleView(doc: DocRecord) {
    setViewing(doc.id)
    try {
      const res = await fetch(`/api/documents/${doc.id}`)
      const json = await res.json()
      if (json.url) window.open(json.url, '_blank')
    } finally {
      setViewing(null)
    }
  }

  async function handleDelete(doc: DocRecord) {
    if (!confirm(`Delete ${doc.filename}?`)) return
    setDeleting(doc.id)
    try {
      await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
      <h2 className="text-[#1A2B4A] font-semibold text-base mb-4">Documents</h2>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />

      <div className="divide-y divide-gray-100">
        {categories.map(({ key, label }) => {
          const doc = docByCategory[key]
          const isUploading = uploading === key

          return (
            <div key={key} className="flex items-center justify-between py-3 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={15} className="text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-[#1A2B4A] font-medium">{label}</p>
                  {doc && (
                    <p className="text-xs text-gray-400 truncate">{doc.filename}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {doc ? (
                  <>
                    <button
                      onClick={() => handleView(doc)}
                      disabled={viewing === doc.id}
                      className="flex items-center gap-1 text-xs text-[#1C7BC0] hover:text-[#1563A0] disabled:opacity-50 transition-colors"
                    >
                      <Eye size={13} />
                      {viewing === doc.id ? 'Opening…' : 'View'}
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deleting === doc.id}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={13} />
                      {deleting === doc.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => triggerUpload(key)}
                    disabled={isUploading}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1C7BC0] disabled:opacity-50 border border-gray-200 rounded px-2 py-1 transition-colors"
                  >
                    <Upload size={13} />
                    {isUploading ? 'Uploading…' : 'Upload'}
                  </button>
                )}
                {doc && (
                  <button
                    onClick={() => triggerUpload(key)}
                    disabled={isUploading}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1C7BC0] disabled:opacity-50 border border-gray-200 rounded px-2 py-1 transition-colors"
                  >
                    <Upload size={13} />
                    {isUploading ? 'Uploading…' : 'Replace'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
