'use client'

import { useState, useMemo } from 'react'
import FinancialUploadModal from '@/components/FinancialUploadModal'

type PropertyFinancial = {
  id: string
  name: string
  property_type: string
  address: string
  city: string
  state: string
  status: string
  monthlyIncome: number
  mortgagePayment: number
  mortgageBalance: number
  mortgageRate: number
  mortgageLender: string | null
  propertyTax: number
  insurance: number
  hoaFee: number
  totalExpenses: number
  noi: number
  totalUnits: number
  activeLeaseCount: number
  nearestLeaseEnd: string | null
  mortgageBalanceConfirmedDate: string | null
  estimatedValue: number | null
}

type Portfolio = {
  totalIncome: number
  totalExpenses: number
  totalMortgageBalance: number
  netCashFlow: number
  portfolioValue: number | null
  totalEquity: number | null
}

type Props = {
  properties: PropertyFinancial[]
  portfolio: Portfolio
}

type SortKey = 'name' | 'income' | 'expenses' | 'noi' | 'balance'

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatLargeBalance(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return formatCurrency(n)
}

function formatDate(isoStr: string | null): string {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPropertyType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function FinancialsClient({ properties, portfolio }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingProperty, setEditingProperty] = useState<{
    id: string
    name: string
    currentData: {
      mortgage_payment: number | null
      mortgage_balance: number | null
      mortgage_rate: number | null
      mortgage_lender: string | null
      property_tax: number | null
      insurance_premium: number | null
    }
  } | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sorted = useMemo(() => {
    return [...properties].sort((a, b) => {
      let valA: string | number, valB: string | number
      if (sortKey === 'name') { valA = a.name; valB = b.name }
      else if (sortKey === 'income') { valA = a.monthlyIncome; valB = b.monthlyIncome }
      else if (sortKey === 'expenses') { valA = a.totalExpenses; valB = b.totalExpenses }
      else if (sortKey === 'noi') { valA = a.noi; valB = b.noi }
      else { valA = a.mortgageBalance; valB = b.mortgageBalance }

      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA)
      }
      return sortDir === 'asc' ? valA - (valB as number) : (valB as number) - valA
    })
  }, [properties, sortKey, sortDir])

  function SortBtn({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => handleSort(k)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          active
            ? 'bg-[#1C7BC0] text-white border-[#1C7BC0]'
            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1C7BC0] hover:text-[#1C7BC0]'
        }`}
      >
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1A2B4A]">Financials</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly snapshot across your portfolio</p>
        </div>

        {/* Portfolio summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total income</p>
            <p className="text-xl font-semibold text-[#1C7BC0]">{formatCurrency(portfolio.totalIncome)}</p>
            <p className="text-xs text-gray-400 mt-0.5">per month</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total expenses</p>
            <p className="text-xl font-semibold text-[#1A2B4A]">{formatCurrency(portfolio.totalExpenses)}</p>
            <p className="text-xs text-gray-400 mt-0.5">per month</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net cash flow</p>
            <p className={`text-xl font-semibold ${portfolio.netCashFlow >= 0 ? 'text-[#1C7BC0]' : 'text-[#DC2626]'}`}>
              {formatCurrency(portfolio.netCashFlow)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">per month</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mortgage balance</p>
            <p className="text-xl font-semibold text-[#1A2B4A]">{formatLargeBalance(portfolio.totalMortgageBalance)}</p>
            <p className="text-xs text-gray-400 mt-0.5">total outstanding</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Portfolio value</p>
            <p className="text-xl font-semibold text-[#1A2B4A]">
              {portfolio.portfolioValue != null ? formatLargeBalance(portfolio.portfolioValue) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">estimated</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total equity</p>
            <p className={`text-xl font-semibold ${
              portfolio.totalEquity == null ? 'text-[#1A2B4A]' :
              portfolio.totalEquity >= 0 ? 'text-[#1C7BC0]' : 'text-[#DC2626]'
            }`}>
              {portfolio.totalEquity != null ? formatLargeBalance(portfolio.totalEquity) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">value minus mortgage</p>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 mr-1">Sort:</span>
          <SortBtn label="Name" k="name" />
          <SortBtn label="Income" k="income" />
          <SortBtn label="Expenses" k="expenses" />
          <SortBtn label="NOI" k="noi" />
          <SortBtn label="Balance" k="balance" />
        </div>

        {/* Expandable property rows */}
        <div className="flex flex-col gap-2">
          {sorted.map((p) => {
            const isExpanded = expandedIds.has(p.id)
            const noiPositive = p.noi >= 0

            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Collapsed header row */}
                <div
                  onClick={() => toggleExpand(p.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F0F7FF] transition-colors text-left cursor-pointer"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-semibold text-[#1A2B4A] truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatPropertyType(p.property_type)}
                      {p.totalUnits > 1 ? ` · ${p.totalUnits} units` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Income</p>
                      <p className="text-sm font-semibold text-[#1C7BC0]">{formatCurrency(p.monthlyIncome)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Expenses</p>
                      <p className="text-sm font-semibold text-gray-700">{formatCurrency(p.totalExpenses)}</p>
                    </div>
                    <div className="text-right min-w-[72px]">
                      <p className="text-xs text-gray-400">NOI</p>
                      <p className={`text-sm font-semibold ${noiPositive ? 'text-[#1C7BC0]' : 'text-[#DC2626]'}`}>
                        {formatCurrency(p.noi)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProperty({ id: p.id, name: p.name, currentData: {
                        mortgage_payment: p.mortgagePayment,
                        mortgage_balance: p.mortgageBalance,
                        mortgage_rate: p.mortgageRate,
                        mortgage_lender: p.mortgageLender ?? null,
                        property_tax: p.propertyTax ? p.propertyTax * 12 : null,
                        insurance_premium: p.insurance ? p.insurance * 12 : null,
                      } }) }}
                      className="px-3 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:border-[#1C7BC0] hover:text-[#1C7BC0] bg-white transition-colors mr-2"
                    >
                      Edit
                    </button>
                    <span className={`text-gray-400 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-[#F8FAFC]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Mortgage */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Mortgage</p>
                        <div className="space-y-1.5">
                          {p.mortgageLender && (
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-500">Lender</span>
                              <span className="text-xs font-medium text-[#1A2B4A]">{p.mortgageLender}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Payment</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">{formatCurrency(p.mortgagePayment)}/mo</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Rate</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">{p.mortgageRate ? `${p.mortgageRate}%` : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Balance</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">
                              {p.mortgageBalance ? formatCurrency(p.mortgageBalance) : '—'}
                              {p.mortgageBalanceConfirmedDate && (
                                <span className="block text-[10px] text-gray-400 mt-0.5">
                                  est. as of {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} · confirmed {formatDate(p.mortgageBalanceConfirmedDate)}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Other expenses */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Other expenses</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Property tax</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">{p.propertyTax ? formatCurrency(p.propertyTax) + '/mo' : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Insurance</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">{p.insurance ? formatCurrency(p.insurance) + '/mo' : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">HOA fee</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">{p.hoaFee ? formatCurrency(p.hoaFee) + '/mo' : '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Income breakdown */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Income</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Monthly rent</span>
                            <span className="text-xs font-medium text-[#1C7BC0]">{formatCurrency(p.monthlyIncome)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Active leases</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">{p.activeLeaseCount} of {p.totalUnits}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Vacancy</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">
                              {p.totalUnits > 0 ? `${Math.round(((p.totalUnits - p.activeLeaseCount) / p.totalUnits) * 100)}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* NOI summary */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Summary</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Total expenses</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">{formatCurrency(p.totalExpenses)}/mo</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">NOI</span>
                            <span className={`text-xs font-semibold ${noiPositive ? 'text-[#1C7BC0]' : 'text-[#DC2626]'}`}>
                              {formatCurrency(p.noi)}/mo
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Next lease end</span>
                            <span className="text-xs font-medium text-[#1A2B4A]">{formatDate(p.nearestLeaseEnd)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {editingProperty && (
        <FinancialUploadModal
          propertyId={editingProperty.id}
          propertyName={editingProperty.name}
          currentData={editingProperty.currentData}
          onClose={() => setEditingProperty(null)}
          onSaved={() => { setEditingProperty(null); window.location.reload() }}
        />
      )}
    </div>
  )
}
