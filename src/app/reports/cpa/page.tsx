'use client'

import { useEffect, useState } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  mortgage: 'Mortgage',
  utility: 'Utility',
  repair_maintenance: 'Repair / Maintenance',
  insurance: 'Insurance',
  tax: 'Tax',
  advertising: 'Advertising',
  management_fees: 'Management Fees',
  professional_fees: 'Professional Fees',
  supplies: 'Supplies',
  capital_improvement: 'Capital Improvement',
  other: 'Other',
}

const CATEGORIES = ['mortgage', 'utility', 'repair_maintenance', 'insurance', 'tax', 'advertising', 'management_fees', 'professional_fees', 'supplies', 'capital_improvement', 'other']

const OWNERSHIP_GROUPS = [
  {
    name: 'J Goodell Homes, Inc',
    property_ids: [
      'a1000000-0000-0000-0000-000000000008',
      'a1000000-0000-0000-0000-000000000002',
    ],
  },
  {
    name: 'All Other Properties',
    property_ids: [
      'a1000000-0000-0000-0000-000000000005',
      'a1000000-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000004',
      'a1000000-0000-0000-0000-000000000007',
      'a1000000-0000-0000-0000-000000000003',
      'a1000000-0000-0000-0000-000000000006',
    ],
  },
]

type PropertyRow = {
  property_id: string
  property_name: string
  city: string
  income: number
  expenses: Record<string, number>
  total_expenses: number
  net_income: number
}

type Totals = {
  income: number
  total_expenses: number
  net_income: number
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function CPAReportPage() {
  const [rows, setRows] = useState<PropertyRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/reports/cpa')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setRows(data.rows)
        setTotals(data.totals)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const activeRows = rows.filter(r => r.income > 0 || r.total_expenses > 0)

  const groups = OWNERSHIP_GROUPS.map(g => {
    const groupRows = activeRows.filter(r => g.property_ids.includes(r.property_id))
    const subtotals: Totals = {
      income: groupRows.reduce((s, r) => s + r.income, 0),
      total_expenses: groupRows.reduce((s, r) => s + r.total_expenses, 0),
      net_income: groupRows.reduce((s, r) => s + r.net_income, 0),
    }
    return { ...g, rows: groupRows, subtotals }
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A2B4A]">CPA Report</h1>
          <p className="text-sm text-gray-500 mt-1">Income and expenses by property — {new Date().getFullYear()}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-[#1C7BC0] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Print / Save PDF
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500 text-sm">Loading report...</div>
      )}

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {!loading && !error && totals && (
        <>
          {/* Portfolio summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#F5F6FA] rounded-xl p-5">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Income</div>
              <div className="text-2xl font-semibold text-green-600">{fmt(totals.income)}</div>
            </div>
            <div className="bg-[#F5F6FA] rounded-xl p-5">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Expenses</div>
              <div className="text-2xl font-semibold text-red-500">{fmt(totals.total_expenses)}</div>
            </div>
            <div className="bg-[#F5F6FA] rounded-xl p-5">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net Profit</div>
              <div className={`text-2xl font-semibold ${totals.net_income >= 0 ? 'text-[#1A2B4A]' : 'text-red-500'}`}>
                {fmt(totals.net_income)}
              </div>
            </div>
          </div>

          {/* Per-ownership-group sections */}
          {groups.map(group => (
            <div key={group.name} className="mb-12">
              <h2 className="text-lg font-semibold text-[#1A2B4A] border-b border-gray-200 pb-3 mb-4">
                {group.name}
              </h2>

              {/* Income by Property */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-[#1A2B4A]">Income by Property</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F6FA]">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Property</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Rent Income</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Total Expenses</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map(r => (
                      <tr key={r.property_id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-[#1A2B4A]">
                          {r.property_name}
                          <span className="text-xs text-gray-400 ml-2">{r.city}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(r.income)}</td>
                        <td className="px-4 py-3 text-right text-red-500">{fmt(r.total_expenses)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${r.net_income >= 0 ? 'text-[#1A2B4A]' : 'text-red-500'}`}>
                          {fmt(r.net_income)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-[#F5F6FA] font-semibold">
                      <td className="px-6 py-3 text-[#1A2B4A]">Subtotal</td>
                      <td className="px-4 py-3 text-right text-green-600">{fmt(group.subtotals.income)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{fmt(group.subtotals.total_expenses)}</td>
                      <td className={`px-4 py-3 text-right ${group.subtotals.net_income >= 0 ? 'text-[#1A2B4A]' : 'text-red-500'}`}>
                        {fmt(group.subtotals.net_income)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Expenses by Category */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-[#1A2B4A]">Expenses by Category</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F5F6FA]">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 px-6 py-3 whitespace-nowrap">Category</th>
                        {group.rows.map(r => (
                          <th key={r.property_id} className="text-right text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">
                            {r.property_name.split(' ').slice(0, 2).join(' ')}
                          </th>
                        ))}
                        <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORIES.map(cat => {
                        const rowTotal = group.rows.reduce((s, r) => s + (r.expenses[cat] ?? 0), 0)
                        if (rowTotal === 0) return null
                        return (
                          <tr key={cat} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-6 py-3 text-[#1A2B4A]">{CATEGORY_LABELS[cat]}</td>
                            {group.rows.map(r => (
                              <td key={r.property_id} className="px-4 py-3 text-right text-gray-600">
                                {r.expenses[cat] ? fmt(r.expenses[cat]) : '—'}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right font-medium text-[#1A2B4A]">{fmt(rowTotal)}</td>
                          </tr>
                        )
                      })}
                      <tr className="border-t-2 border-gray-300 bg-[#F5F6FA] font-semibold">
                        <td className="px-6 py-3 text-[#1A2B4A]">Total Expenses</td>
                        {group.rows.map(r => (
                          <td key={r.property_id} className="px-4 py-3 text-right text-red-500">{fmt(r.total_expenses)}</td>
                        ))}
                        <td className="px-4 py-3 text-right text-red-500">{fmt(group.subtotals.total_expenses)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Profit by Property */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-[#1A2B4A]">Net Profit by Property</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F6FA]">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Property</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Income</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Expenses</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Net Profit</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map(r => {
                      const margin = r.income > 0 ? Math.round((r.net_income / r.income) * 100) : 0
                      return (
                        <tr key={r.property_id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-[#1A2B4A]">{r.property_name}</td>
                          <td className="px-4 py-3 text-right text-green-600">{fmt(r.income)}</td>
                          <td className="px-4 py-3 text-right text-red-500">{fmt(r.total_expenses)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${r.net_income >= 0 ? 'text-[#1A2B4A]' : 'text-red-500'}`}>
                            {fmt(r.net_income)}
                          </td>
                          <td className={`px-4 py-3 text-right text-xs font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {margin}%
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-gray-300 bg-[#F5F6FA] font-semibold">
                      <td className="px-6 py-3 text-[#1A2B4A]">Subtotal</td>
                      <td className="px-4 py-3 text-right text-green-600">{fmt(group.subtotals.income)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{fmt(group.subtotals.total_expenses)}</td>
                      <td className={`px-4 py-3 text-right ${group.subtotals.net_income >= 0 ? 'text-[#1A2B4A]' : 'text-red-500'}`}>
                        {fmt(group.subtotals.net_income)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-green-600">
                        {group.subtotals.income > 0 ? Math.round((group.subtotals.net_income / group.subtotals.income) * 100) : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
