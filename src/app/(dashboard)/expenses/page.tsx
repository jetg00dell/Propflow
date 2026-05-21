'use client'

import { useState, useRef, useEffect, Fragment } from 'react'

type Tenant = {
  id: string
  name: string
  lease_id: string
  monthly_rent: number
  unit: string
  property_id: string
  property_name: string
}

type Transaction = {
  date: string
  description: string
  amount: number
  type: 'deposit' | 'withdrawal'
  category: string
  property_id: string | null
  property_name: string | null
  tenant_id: string | null
  tenant_name: string | null
  lease_id: string | null
  confidence: 'high' | 'low'
  needs_review: boolean
  review_reason: string | null
  suggested_match_type: string | null
  _resolved?: boolean
  _user_category?: string
  _user_match_type?: string
  _skip?: boolean
  _idx?: number
  _possible_duplicate?: boolean
  _duplicate_matches?: any[]
}

const CATEGORIES = [
  { value: 'rent_income', label: 'Rent income' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'utility', label: 'Utility' },
  { value: 'repair_maintenance', label: 'Repair / maintenance' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'tax', label: 'Tax' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'management_fees', label: 'Management fees' },
  { value: 'professional_fees', label: 'Professional fees' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'capital_improvement', label: 'Capital improvement' },
  { value: 'other', label: 'Other' },
]

const MATCH_TYPES = [
  { value: 'rent_payment', label: 'Rent payment — match to payments' },
  { value: 'tenant_reimbursement', label: 'Tenant reimbursement — offset repair' },
  { value: 'other_income', label: 'Other income' },
  { value: 'skip', label: 'Skip — do not import' },
]

const PROPERTY_LIST = [
  { id: 'a1000000-0000-0000-0000-000000000001', name: '214 Clover Lane' },
  { id: 'a1000000-0000-0000-0000-000000000002', name: '2252 Anelda Court' },
  { id: 'a1000000-0000-0000-0000-000000000003', name: '337 Garfield Avenue' },
  { id: 'a1000000-0000-0000-0000-000000000004', name: '317 Diamond Drive' },
  { id: 'a1000000-0000-0000-0000-000000000005', name: '1506-1508 Estrella Avenue' },
  { id: 'a1000000-0000-0000-0000-000000000006', name: '8329 Medicine Bow Avenue' },
  { id: 'a1000000-0000-0000-0000-000000000007', name: '2616 Killdeer Drive' },
  { id: 'a1000000-0000-0000-0000-000000000008', name: '2025 Creekwood Drive' },
]

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function categoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat
}

const categoryColor = (cat: string) => {
  const map: Record<string, string> = {
    rent_income: 'bg-[#E6F4EA] text-[#1E7E34]',
    mortgage: 'bg-[#EEF2FF] text-[#3730A3]',
    utility: 'bg-[#E6F1FB] text-[#1C7BC0]',
    repair_maintenance: 'bg-[#FFF3E0] text-[#E65100]',
    insurance: 'bg-[#FFF8E1] text-[#F57F17]',
    tax: 'bg-[#FCE4EC] text-[#C2185B]',
    advertising: 'bg-[#E6F1FB] text-[#1C7BC0]',
    management_fees: 'bg-[#EEF2FF] text-[#3730A3]',
    professional_fees: 'bg-[#FCE4EC] text-[#C2185B]',
    supplies: 'bg-[#E8F5E9] text-[#2E7D32]',
    capital_improvement: 'bg-[#E8F5E9] text-[#2E7D32]',
    other: 'bg-[#F5F6FA] text-[#4A5568]',
  }
  return map[cat] ?? 'bg-[#F5F6FA] text-[#4A5568]'
}

type Step = 'upload' | 'processing' | 'review' | 'saving' | 'done'

type Expense = {
  id: string
  date: string
  description: string
  category: string
  amount: number
  property_id: string
  payee: string
  source: string
  notes: string
  created_at: string
  maintenance_request_id?: string | null
}

export default function ExpensesPage() {
  const [step, setStep] = useState<Step>('upload')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [filename, setFilename] = useState('')
  const [error, setError] = useState('')
  const [saveResult, setSaveResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'review' | 'all'>('review')
  const fileRef = useRef<HTMLInputElement>(null)

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [maintenanceRequests, setMaintenanceRequests] = useState<{id: string, title: string, property_id: string, property_name: string, unit_number: string}[]>([])
  const [filterProperty, setFilterProperty] = useState('')
  const [filterCategory, setFilterCategory] = useState('no_mortgage')
  const [filterTab, setFilterTab] = useState<'period' | 'year'>('period')
  const [filterPeriod, setFilterPeriod] = useState('ytd')
  const [filterPeriodYear, setFilterPeriodYear] = useState('2026')
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set())
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false)

  async function refreshExpenses() {
    setExpensesLoading(true)
    try {
      const res = await fetch('/api/expenses')
      const data = await res.json()
      if (res.ok) {
        const expList: Expense[] = data.expenses ?? []
        setExpenses(expList)
        const dupeIds = new Set<string>()
        for (let i = 0; i < expList.length; i++) {
          for (let j = i + 1; j < expList.length; j++) {
            const a = expList[i]
            const b = expList[j]
            if (a.property_id === b.property_id && a.amount === b.amount) {
              const diff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime())
              if (diff <= 7 * 24 * 60 * 60 * 1000) {
                dupeIds.add(a.id)
                dupeIds.add(b.id)
              }
            }
          }
        }
        setDuplicateIds(dupeIds)
      }
    } finally {
      setExpensesLoading(false)
    }
  }

  useEffect(() => {
    refreshExpenses()
    fetch('/api/maintenance-requests')
      .then(r => r.json())
      .then(data => setMaintenanceRequests(data.requests ?? []))
  }, [])

  const [addOpen, setAddOpen] = useState(false)
  const [addDate, setAddDate] = useState(() => new Date().toISOString().split('T')[0])
  const [addAmount, setAddAmount] = useState('')
  const [addPayee, setAddPayee] = useState('')
  const [addCategory, setAddCategory] = useState('repair_maintenance')
  const [addPropertyId, setAddPropertyId] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const [formMaintenanceRequestId, setFormMaintenanceRequestId] = useState('')
  const [toast, setToast] = useState(false)
  const [toastFading, setToastFading] = useState(false)

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editPayee, setEditPayee] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editPropertyId, setEditPropertyId] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editMaintenanceRequestId, setEditMaintenanceRequestId] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addDuplicateWarning, setAddDuplicateWarning] = useState<any[]>([])
  const [editDuplicateWarning, setEditDuplicateWarning] = useState<any[]>([])

  async function handleUpload(file: File) {
    setFilename(file.name)
    setStep('processing')
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const txns: Transaction[] = data.transactions ?? []
      const withDupes = await Promise.all(
        txns.map(async t => {
          if (t.type === 'withdrawal' && t.property_id) {
            const dupes = await checkForDuplicates(Math.abs(t.amount).toString(), t.date, t.property_id)
            if (dupes.length > 0) return { ...t, _possible_duplicate: true, _duplicate_matches: dupes }
          }
          return t
        })
      )
      setTransactions(withDupes)
      setTenants(data.tenants ?? [])
      setSummary(data.summary)
      setStep('review')
      setActiveTab(data.summary.needsReview > 0 ? 'review' : 'all')
    } catch (e: any) {
      setError(e.message ?? 'Failed to parse statement')
      setStep('upload')
    }
  }

  function updateTransaction(idx: number, updates: Partial<Transaction>) {
    setTransactions(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t))
  }

  function handleTenantChange(idx: number, tenantId: string) {
    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant) {
      updateTransaction(idx, {
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        lease_id: tenant.lease_id,
        property_id: tenant.property_id,
        property_name: tenant.property_name,
      })
    } else {
      updateTransaction(idx, {
        tenant_id: null,
        tenant_name: null,
        lease_id: null,
      })
    }
  }

  function resolveAll() {
    setTransactions(prev => prev.map(t => ({ ...t, _resolved: true })))
  }

  const reviewItems = transactions
    .map((t, i) => ({ ...t, _idx: i }))
    .filter(t => t.needs_review && !t._resolved && !t._skip)

  const unresolvedCount = reviewItems.length

  async function handleAddExpense() {
    if (!addAmount || !addPayee) {
      setAddError('Amount and payee are required.')
      return
    }
    setAddSaving(true)
    setAddError('')
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: addDate,
          amount: parseFloat(addAmount),
          category: addCategory,
          payee: addPayee,
          property_id: addPropertyId || null,
          notes: addNotes || null,
          source: 'manual',
          maintenance_request_id: formMaintenanceRequestId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setAddOpen(false)
      setAddDate(new Date().toISOString().split('T')[0])
      setAddAmount('')
      setAddPayee('')
      setAddCategory('repair_maintenance')
      setAddPropertyId('')
      setAddNotes('')
      setFormMaintenanceRequestId('')
      setAddDuplicateWarning([])
      setToast(true)
      setToastFading(false)
      setTimeout(() => setToastFading(true), 2500)
      setTimeout(() => { setToast(false); setToastFading(false) }, 3000)
      refreshExpenses()
    } catch (e: any) {
      setAddError(e.message)
    } finally {
      setAddSaving(false)
    }
  }

  async function handleEditExpense() {
    if (!editingExpense) return
    if (!editAmount || !editPayee) { setEditError('Amount and payee are required.'); return }
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingExpense.id,
          date: editDate,
          amount: parseFloat(editAmount),
          category: editCategory,
          payee: editPayee,
          property_id: editPropertyId || null,
          notes: editNotes || null,
          maintenance_request_id: editMaintenanceRequestId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setEditingExpense(null)
      setEditDuplicateWarning([])
      refreshExpenses()
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm('Delete this expense? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) refreshExpenses()
    } finally {
      setDeletingId(null)
    }
  }

  async function checkForDuplicates(amount: string, date: string, property_id: string, exclude_id?: string): Promise<any[]> {
    if (!amount || !date || !property_id) return []
    try {
      const res = await fetch('/api/expenses/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date, property_id, exclude_id }),
      })
      const data = await res.json()
      return data.duplicates ?? []
    } catch {
      return []
    }
  }

  async function handleSave() {
    setStep('saving')
    try {
      const toSave = transactions
        .filter(t => !t._skip)
        .map(t => ({
          ...t,
          category: t._user_category ?? t.category,
          suggested_match_type: t._user_match_type ?? t.suggested_match_type,
        }))

      const res = await fetch('/api/save-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: toSave, filename }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaveResult(data)
      refreshExpenses()
      setStep('done')
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
      setStep('review')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A2B4A]">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Import bank statements and track property expenses</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-[#1C7BC0] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {/* STEP: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-[#1C7BC0] hover:bg-blue-50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleUpload(f)
            }}
          >
            <div className="text-4xl mb-3">📄</div>
            <div className="text-base font-medium text-[#1A2B4A] mb-1">Upload Wells Fargo statement</div>
            <div className="text-sm text-gray-500">Drop a PDF bank statement here or click to browse</div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
            />
          </div>
          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
        </div>
      )}

      {/* STEP: Processing */}
      {step === 'processing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-3xl mb-4">⏳</div>
          <div className="text-base font-medium text-[#1A2B4A] mb-2">Reading statement with Claude...</div>
          <div className="text-sm text-gray-500">Categorizing transactions and matching to tenants and properties</div>
          <div className="mt-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1C7BC0] rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* STEP: Review */}
      {(step === 'review' || step === 'saving') && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total transactions', value: summary?.total ?? 0 },
              { label: 'Auto-categorized', value: summary?.autoApproved ?? 0 },
              { label: 'Needs review', value: unresolvedCount, highlight: unresolvedCount > 0 },
              { label: 'Skipped', value: transactions.filter(t => t._skip).length },
            ].map(s => (
              <div key={s.label} className="bg-[#F5F6FA] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className={`text-2xl font-semibold ${s.highlight ? 'text-amber-600' : 'text-[#1A2B4A]'}`}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {[
              { key: 'review', label: `Needs review (${unresolvedCount})` },
              { key: 'all', label: `All transactions (${transactions.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#1C7BC0] text-[#1C7BC0]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Review queue */}
          {activeTab === 'review' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              {unresolvedCount === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  ✅ All transactions reviewed
                </div>
              ) : (
                reviewItems.map(t => (
                  <div key={t._idx} className="border-b border-gray-100 last:border-0 p-4">
                    <div className="flex items-start gap-3 flex-wrap">
                      {/* Left: date + description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400">{t.date}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'deposit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {t.type === 'deposit' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-[#1A2B4A] truncate">{t.description}</div>
                        {t.review_reason && (
                          <div className="text-xs text-amber-600 mt-0.5">{t.review_reason}</div>
                        )}
                        {t._possible_duplicate && t._duplicate_matches && t._duplicate_matches.length > 0 && (
                          <div className="mt-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                            <div className="font-medium mb-1">⚠️ Possible duplicate — a similar expense already exists:</div>
                            {t._duplicate_matches.map((d: any) => (
                              <div key={d.id} className="mt-0.5">
                                {d.date} · {d.payee || d.description || '—'} · ${parseFloat(d.amount).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: controls */}
                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Tenant dropdown — deposits only */}
                        {t.type === 'deposit' && (
                          <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-[#1A2B4A] bg-white min-w-[160px]"
                            value={t.tenant_id ?? ''}
                            onChange={e => handleTenantChange(t._idx!, e.target.value)}
                          >
                            <option value="">No tenant</option>
                            {tenants.map(tn => (
                              <option key={tn.id} value={tn.id}>
                                {tn.name} — {tn.property_name.split(' ').slice(0, 2).join(' ')}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Match type (deposits) or category (withdrawals) */}
                        {t.type === 'deposit' ? (
                          <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-[#1A2B4A] bg-white"
                            value={t._user_match_type ?? t.suggested_match_type ?? ''}
                            onChange={e => updateTransaction(t._idx!, { _user_match_type: e.target.value })}
                          >
                            <option value="">Select type...</option>
                            {MATCH_TYPES.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        ) : (
                          <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-[#1A2B4A] bg-white"
                            value={t._user_category ?? t.category}
                            onChange={e => updateTransaction(t._idx!, { _user_category: e.target.value })}
                          >
                            {CATEGORIES.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        )}

                        {/* Property dropdown */}
                        <select
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-[#1A2B4A] bg-white"
                          value={t.property_id ?? ''}
                          onChange={e => updateTransaction(t._idx!, {
                            property_id: e.target.value || null,
                            property_name: PROPERTY_LIST.find(p => p.id === e.target.value)?.name ?? null,
                          })}
                        >
                          <option value="">No property</option>
                          {PROPERTY_LIST.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => updateTransaction(t._idx!, { _resolved: true })}
                          className="text-xs bg-[#1C7BC0] text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateTransaction(t._idx!, { _skip: true })}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
                        >
                          Skip
                        </button>
                      </div>
                    </div>

                    {/* Tenant + property auto-fill confirmation */}
                    {t.tenant_id && (
                      <div className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                        ✓ Matched to {t.tenant_name} · {t.property_name}
                        {t.lease_id && <span className="text-green-500 ml-1">· lease linked</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* All transactions */}
          {activeTab === 'all' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F6FA]">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Description</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Tenant</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Property</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Category</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Amount</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <Fragment key={i}>
                      <tr className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{t.date}</td>
                        <td className="px-4 py-3 text-[#1A2B4A] max-w-xs truncate">{t.description}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.tenant_name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.property_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(t._user_category ?? t.category)}`}>
                            {categoryLabel(t._user_category ?? t.category)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${t.type === 'deposit' ? 'text-green-600' : 'text-[#1A2B4A]'}`}>
                          {t.type === 'deposit' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t._skip ? (
                            <span className="text-xs text-gray-400">Skipped</span>
                          ) : t.needs_review && !t._resolved ? (
                            <span className="text-xs text-amber-600 font-medium">Review</span>
                          ) : (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </td>
                      </tr>
                      {t._possible_duplicate && t._duplicate_matches && t._duplicate_matches.length > 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 pb-3">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                              <div className="font-medium mb-1">⚠️ Possible duplicate — a similar expense already exists:</div>
                              {t._duplicate_matches.map((d: any) => (
                                <div key={d.id} className="mt-0.5">
                                  {d.date} · {d.payee || d.description || '—'} · ${parseFloat(d.amount).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-500">
              {unresolvedCount > 0
                ? `${unresolvedCount} transaction${unresolvedCount > 1 ? 's' : ''} still need review`
                : 'All transactions reviewed — ready to save'}
            </div>
            <div className="flex gap-3">
              {unresolvedCount > 0 && (
                <button
                  onClick={resolveAll}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 border border-gray-200 rounded-lg"
                >
                  Confirm all as-is
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={step === 'saving'}
                className="text-sm bg-[#1C7BC0] text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {step === 'saving' ? 'Saving...' : 'Save to PropFlow'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* STEP: Done */}
      {step === 'done' && saveResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-[#1A2B4A] mb-2">Statement imported</h2>
          <div className="text-sm text-gray-500 space-y-1 mb-6">
            <p>{saveResult.savedExpenses} expense{saveResult.savedExpenses !== 1 ? 's' : ''} saved</p>
            {saveResult.rentMatchCount > 0 && (
              <p className="text-amber-600 font-medium">
                {saveResult.rentMatchCount} rent deposit{saveResult.rentMatchCount !== 1 ? 's' : ''} received — record these in the Payments page
              </p>
            )}
          </div>
          {saveResult.rentMatches?.length > 0 && (
            <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 max-w-lg mx-auto">
              <div className="text-xs font-medium text-amber-700 mb-3">Rent deposits received — enter these manually in the Payments page:</div>
              {saveResult.rentMatches.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-amber-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-900 truncate">{r.description}</p>
                    {r.tenant_name && <p className="text-xs text-amber-600">{r.tenant_name}</p>}
                  </div>
                  <div className="text-sm font-medium text-green-700 whitespace-nowrap">+${Number(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setStep('upload'); setTransactions([]); setTenants([]); setSummary(null); setSaveResult(null) }}
              className="text-sm border border-gray-200 text-gray-600 px-5 py-2 rounded-lg hover:bg-gray-50"
            >
              Upload another statement
            </button>
            <a
              href="/payments"
              className="text-sm bg-[#1C7BC0] text-white px-5 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to Payments →
            </a>
          </div>
        </div>
      )}
      {/* All Expenses section — visible on upload and done steps */}
      {(step === 'upload' || step === 'done') && (() => {
        const currentYear = new Date().getFullYear().toString()
        const filtered = expenses
          .filter(e => !filterProperty || e.property_id === filterProperty)
          .filter(e => filterCategory === 'no_mortgage' ? e.category !== 'mortgage' : !filterCategory || e.category === filterCategory)
          .filter(e => {
            const [year, month] = e.date.split('-')
            if (filterTab === 'year') {
              if (filterPeriod === 'all') return true
              return year === filterPeriod
            }
            // period tab
            if (filterPeriod === 'ytd') return year === filterPeriodYear
            return year === filterPeriodYear && month === filterPeriod
          })
          .filter(e => !showDuplicatesOnly || duplicateIds.has(e.id))
          .sort((a, b) => b.date.localeCompare(a.date))
        const totalExp = filtered.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)
        const totalCred = filtered.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0)
        const net = totalExp - totalCred
        const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        function exportCSV() {
          const header = ['Date', 'Payee', 'Property', 'Category', 'Amount', 'Source', 'Notes']
          const escape = (val: string) => val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val
          const rows = filtered.map(e => [
            formatDate(e.date),
            e.payee,
            PROPERTY_LIST.find(p => p.id === e.property_id)?.name ?? '',
            categoryLabel(e.category),
            e.amount.toFixed(2),
            e.source === 'csv_import' ? 'Import' : 'Manual',
            e.notes ?? '',
          ].map(escape).join(','))
          const csv = [header.join(','), ...rows].join('\n')
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `propflow-expenses-${new Date().toISOString().split('T')[0]}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }

        return (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1A2B4A]">All Expenses</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDuplicatesOnly(v => !v)}
                  className={`text-sm px-4 py-2 rounded-lg border border-yellow-300 text-yellow-700 ${showDuplicatesOnly ? 'bg-yellow-50' : 'hover:bg-yellow-50'}`}
                >
                  {duplicateIds.size > 0 ? `Duplicates (${duplicateIds.size})` : 'Duplicates'}
                </button>
                <button
                  onClick={exportCSV}
                  className="border border-gray-200 text-[#1A2B4A] text-sm px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Date tab toggle */}
            <div className="flex items-center gap-1 mb-3">
              {([['period', 'Month / YTD'], ['year', 'By Year']] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => { setFilterTab(tab); setFilterPeriod(tab === 'period' ? 'ytd' : 'all') }}
                  className={filterTab === tab
                    ? 'bg-[#1C7BC0] text-white rounded-full px-3 py-1 text-xs'
                    : 'text-[#1C7BC0] px-3 py-1 text-xs border border-[#1C7BC0] rounded-full'}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <select
                value={filterProperty}
                onChange={e => setFilterProperty(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] bg-white focus:outline-none focus:border-[#1C7BC0]"
              >
                <option value="">All properties</option>
                {PROPERTY_LIST.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] bg-white focus:outline-none focus:border-[#1C7BC0]"
              >
                <option value="">All categories</option>
                <option value="no_mortgage">All except mortgage</option>
                <option value="mortgage">Mortgage</option>
                {CATEGORIES.filter(c => c.value !== 'mortgage').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {filterTab === 'period' ? (
                <>
                  <select
                    value={filterPeriod}
                    onChange={e => setFilterPeriod(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] bg-white focus:outline-none focus:border-[#1C7BC0]"
                  >
                    <option value="ytd">Year to date</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <select
                    value={filterPeriodYear}
                    onChange={e => setFilterPeriodYear(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] bg-white focus:outline-none focus:border-[#1C7BC0]"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </>
              ) : (
                <select
                  value={filterPeriod}
                  onChange={e => setFilterPeriod(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] bg-white focus:outline-none focus:border-[#1C7BC0]"
                >
                  <option value="all">All years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#F5F6FA] rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Expenses</div>
                <div className="text-xl font-semibold text-[#1A2B4A]">${fmt(totalExp)}</div>
              </div>
              <div className="bg-[#F5F6FA] rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Credits</div>
                <div className="text-xl font-semibold text-green-600">${fmt(totalCred)}</div>
              </div>
              <div className="bg-[#F5F6FA] rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net</div>
                <div className={`text-xl font-semibold ${net > 0 ? 'text-[#1A2B4A]' : 'text-green-600'}`}>${fmt(net)}</div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {expensesLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#1C7BC0] rounded-full animate-spin mb-2" />
                  <div>Loading…</div>
                </div>
              ) : expenses.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  No expenses yet — upload a statement or add one manually.
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">No expenses found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F6FA]">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Payee</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Property</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Category</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Amount</th>
                      <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Source</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => {
                      const propName = PROPERTY_LIST.find(p => p.id === e.property_id)?.name ?? '—'
                      const isManual = e.source === 'manual'
                      return (
                        <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(e.date)}</td>
                          <td className="px-4 py-3 text-[#1A2B4A] text-sm max-w-[200px]">
                            <div className="flex items-center">
                              <span className="truncate">{e.payee || e.description || '—'}</span>
                              {e.maintenance_request_id && (
                                <span className="bg-[#E6F1FB] text-[#1C7BC0] text-xs px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">linked</span>
                              )}
                              {duplicateIds.has(e.id) && (
                                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">⚠️ dup</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{propName}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(e.category)}`}>
                              {categoryLabel(e.category)}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-medium ${e.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {e.amount < 0 ? `-$${Math.abs(e.amount).toFixed(2)}` : `$${e.amount.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isManual ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-[#1C7BC0]'}`}>
                              {isManual ? 'Manual' : 'Import'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingExpense(e)
                                setEditDate(e.date)
                                setEditAmount(String(e.amount))
                                setEditPayee(e.payee || e.description || '')
                                setEditCategory(e.category)
                                setEditPropertyId(e.property_id ?? '')
                                setEditNotes(e.notes ?? '')
                                setEditMaintenanceRequestId(e.maintenance_request_id ?? '')
                                setEditError('')
                              }}
                              className="text-[#1C7BC0] text-xs hover:underline mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(e.id)}
                              disabled={deletingId === e.id}
                              className="text-red-400 text-xs hover:underline disabled:opacity-50"
                            >
                              {deletingId === e.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      })()}

      {/* Add Expense Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-[#1A2B4A] mb-5">Add Expense</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={e => setAddDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                  onBlur={async () => {
                    const dupes = await checkForDuplicates(addAmount, addDate, addPropertyId)
                    setAddDuplicateWarning(dupes)
                  }}
                  placeholder="$0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  value={addPayee}
                  onChange={e => setAddPayee(e.target.value)}
                  placeholder="e.g. Home Depot"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                <select
                  value={addCategory}
                  onChange={e => setAddCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                >
                  <option value="mortgage">Mortgage</option>
                  <option value="utility">Utility</option>
                  <option value="repair_maintenance">Repair / Maintenance</option>
                  <option value="insurance">Insurance</option>
                  <option value="tax">Tax</option>
                  <option value="advertising">Advertising</option>
                  <option value="management_fees">Management fees</option>
                  <option value="professional_fees">Professional fees</option>
                  <option value="supplies">Supplies</option>
                  <option value="capital_improvement">Capital Improvement</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Property</label>
                <select
                  value={addPropertyId}
                  onChange={async e => {
                    setAddPropertyId(e.target.value)
                    const dupes = await checkForDuplicates(addAmount, addDate, e.target.value)
                    setAddDuplicateWarning(dupes)
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                >
                  <option value="">No property</option>
                  {PROPERTY_LIST.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {addDuplicateWarning.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                  <div className="font-medium mb-1">⚠️ Possible duplicate — a similar expense already exists:</div>
                  {addDuplicateWarning.map(d => (
                    <div key={d.id} className="mt-0.5">
                      {d.date} · {d.payee || d.description || '—'} · ${parseFloat(d.amount).toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
              {(addCategory === 'repair_maintenance' || addCategory === 'supplies') && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Link to maintenance request (optional)</label>
                  <select
                    value={formMaintenanceRequestId}
                    onChange={e => setFormMaintenanceRequestId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                  >
                    <option value="">None</option>
                    {(addPropertyId
                      ? maintenanceRequests.filter(r => r.property_id === addPropertyId)
                      : maintenanceRequests
                    ).map(r => (
                      <option key={r.id} value={r.id}>{r.title} · Unit {r.unit_number}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Notes <span className="text-gray-300 font-normal">(optional)</span>
                </label>
                <textarea
                  value={addNotes}
                  onChange={e => setAddNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30 resize-none"
                />
              </div>
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <div className="flex gap-3 pt-1">
                <div
                  onClick={() => { setAddOpen(false); setAddError(''); setFormMaintenanceRequestId(''); setAddDuplicateWarning([]) }}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors text-center cursor-pointer"
                >
                  Cancel
                </div>
                <div
                  onClick={addSaving ? undefined : handleAddExpense}
                  className={`flex-1 py-2 rounded-lg bg-[#1C7BC0] text-white text-sm font-medium text-center transition-colors ${addSaving ? 'opacity-50 cursor-default' : 'hover:bg-blue-700 cursor-pointer'}`}
                >
                  {addSaving ? 'Saving...' : 'Save Expense'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-[#1A2B4A] mb-5">Edit Expense</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  onBlur={async () => {
                    const dupes = await checkForDuplicates(editAmount, editDate, editPropertyId, editingExpense?.id)
                    setEditDuplicateWarning(dupes)
                  }}
                  placeholder="$0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  value={editPayee}
                  onChange={e => setEditPayee(e.target.value)}
                  placeholder="e.g. Home Depot"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Property</label>
                <select
                  value={editPropertyId}
                  onChange={async e => {
                    setEditPropertyId(e.target.value)
                    const dupes = await checkForDuplicates(editAmount, editDate, e.target.value, editingExpense?.id)
                    setEditDuplicateWarning(dupes)
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                >
                  <option value="">No property</option>
                  {PROPERTY_LIST.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {editDuplicateWarning.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                  <div className="font-medium mb-1">⚠️ Possible duplicate — a similar expense already exists:</div>
                  {editDuplicateWarning.map(d => (
                    <div key={d.id} className="mt-0.5">
                      {d.date} · {d.payee || d.description || '—'} · ${parseFloat(d.amount).toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
              {(editCategory === 'repair_maintenance' || editCategory === 'supplies') && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Link to maintenance request (optional)</label>
                  <select
                    value={editMaintenanceRequestId}
                    onChange={e => setEditMaintenanceRequestId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30"
                  >
                    <option value="">None</option>
                    {(editPropertyId
                      ? maintenanceRequests.filter(r => r.property_id === editPropertyId)
                      : maintenanceRequests
                    ).map(r => (
                      <option key={r.id} value={r.id}>{r.title} · Unit {r.unit_number}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Notes <span className="text-gray-300 font-normal">(optional)</span>
                </label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2B4A] focus:outline-none focus:ring-2 focus:ring-[#1C7BC0]/30 resize-none"
                />
              </div>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div className="flex gap-3 pt-1">
                <div
                  onClick={() => { setEditingExpense(null); setEditError(''); setEditDuplicateWarning([]) }}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors text-center cursor-pointer"
                >
                  Cancel
                </div>
                <div
                  onClick={editSaving ? undefined : handleEditExpense}
                  className={`flex-1 py-2 rounded-lg bg-[#1C7BC0] text-white text-sm font-medium text-center transition-colors ${editSaving ? 'opacity-50 cursor-default' : 'hover:bg-blue-700 cursor-pointer'}`}
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg transition-opacity duration-500 ${toastFading ? 'opacity-0' : 'opacity-100'}`}>
          Expense saved
        </div>
      )}
    </div>
  )
}
