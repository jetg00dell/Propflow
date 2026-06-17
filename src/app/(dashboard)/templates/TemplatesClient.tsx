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
]

type TemplateInfo = {
  category: string
  filename: string
}

type Props = {
  initialTemplates: TemplateInfo[]
}

export default function TemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<TemplateInfo[]>(initialTemplates)
  const [uploading, setUploading] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingCategoryRef = useRef<string>('')

  const templateByCategory = Object.fromEntries(templates.map(t => [t.category, t]))

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
    form.append('category', category)

    try {
      const res = await fetch('/api/templates', { method: 'POST', body: form })
      const json = await res.json()
      if (json.filename) {
        setTemplates(prev => {
          const filtered = prev.filter(t => t.category !== category)
          return [...filtered, { category, filename: json.filename }]
        })
      }
    } finally {
      setUploading(null)
    }
  }

  async function handleView(category: string) {
    setViewing(category)
    try {
      const res = await fetch(`/api/templates/${category}`)
      const json = await res.json()
      if (json.url) window.open(json.url, '_blank')
    } finally {
      setViewing(null)
    }
  }

  async function handleDelete(category: string) {
    const tmpl = templateByCategory[category]
    if (!confirm(`Delete ${tmpl?.filename ?? category}?`)) return
    setDeleting(category)
    try {
      await fetch(`/api/templates/${category}`, { method: 'DELETE' })
      setTemplates(prev => prev.filter(t => t.category !== category))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A2B4A]">Document Templates</h1>
        <p className="text-gray-500 text-sm mt-0.5">Blank master forms used as starting templates for new leases.</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {CATEGORIES.map(({ key, label }) => {
            const tmpl = templateByCategory[key]
            const isUploading = uploading === key

            return (
              <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={15} className={tmpl ? 'text-[#1C7BC0]' : 'text-gray-300'} />
                  <div className="min-w-0">
                    <p className="text-sm text-[#1A2B4A] font-medium">{label}</p>
                    {tmpl ? (
                      <p className="text-xs text-gray-400 truncate">{tmpl.filename}</p>
                    ) : (
                      <p className="text-xs text-gray-300 italic">No template uploaded</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {tmpl ? (
                    <>
                      <button
                        onClick={() => handleView(key)}
                        disabled={viewing === key}
                        className="flex items-center gap-1 text-xs text-[#1C7BC0] hover:text-[#1563A0] disabled:opacity-50 transition-colors"
                      >
                        <Eye size={13} />
                        {viewing === key ? 'Opening…' : 'View'}
                      </button>
                      <button
                        onClick={() => triggerUpload(key)}
                        disabled={isUploading}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1C7BC0] disabled:opacity-50 border border-gray-200 rounded px-2 py-1 transition-colors"
                      >
                        <Upload size={13} />
                        {isUploading ? 'Uploading…' : 'Replace'}
                      </button>
                      <button
                        onClick={() => handleDelete(key)}
                        disabled={deleting === key}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 size={13} />
                        {deleting === key ? 'Deleting…' : 'Delete'}
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
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
