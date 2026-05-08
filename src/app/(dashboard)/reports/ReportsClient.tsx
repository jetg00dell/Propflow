'use client'

import { Printer } from 'lucide-react'

type PropertyReport = {
  id: string
  name: string
  address: string
  city: string
  state: string
  property_type: string
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
  grossMonthlyIncome: number
  operatingExpenses: number
  mortgagePayment: number
  totalExpenses: number
  noi: number
  monthlyCashFlow: number
  annualCashFlow: number
  cashOnCash: number | null
  capRate: number | null
  estimatedValue: number | null
  cashInvested: number | null
}

type Props = {
  properties: PropertyReport[]
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function pct(n: number | null, decimals = 1): string {
  if (n == null) return '—'
  return `${n.toFixed(decimals)}%`
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: 'Single Family',
  multi_family: 'Multi Family',
  condo: 'Condo',
  townhouse: 'Townhouse',
  commercial: 'Commercial',
  sfh_adu: 'SFH + ADU',
}

function formatPropertyType(t: string): string {
  return PROPERTY_TYPE_LABELS[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function cashFlowClass(n: number): string {
  if (n > 0) return 'text-green-600'
  if (n < 0) return 'text-red-600'
  return 'text-gray-700'
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-semibold ${accent ? 'text-[#1C7BC0]' : 'text-[#1A2B4A]'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function MetricRow({
  label,
  value,
  valueClass,
  border = true,
}: {
  label: string
  value: string
  valueClass?: string
  border?: boolean
}) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${border ? 'border-b border-gray-100 last:border-0' : ''}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-semibold ${valueClass ?? 'text-[#1A2B4A]'}`}>{value}</span>
    </div>
  )
}

export default function ReportsClient({ properties }: Props) {
  const totalIncome = properties.reduce((s, p) => s + p.grossMonthlyIncome, 0)
  const totalExpenses = properties.reduce((s, p) => s + p.totalExpenses, 0)
  const totalNOI = properties.reduce((s, p) => s + p.noi, 0)
  const totalCashFlow = properties.reduce((s, p) => s + p.monthlyCashFlow, 0)

  const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#1A2B4A]">Profitability Report</h1>
            <p className="text-sm text-gray-500 mt-1">
              Per-property financial performance · {reportDate}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white hover:border-[#1C7BC0] hover:text-[#1C7BC0] transition-colors"
          >
            <Printer size={14} />
            Print / Export
          </button>
        </div>

        {/* Portfolio summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <SummaryCard label="Total income" value={fmt(totalIncome)} sub="per month" accent />
          <SummaryCard label="Total expenses" value={fmt(totalExpenses)} sub="per month" />
          <SummaryCard label="Total NOI" value={fmt(totalNOI)} sub="excl. debt service" accent={totalNOI >= 0} />
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net cash flow</p>
            <p className={`text-xl font-semibold ${cashFlowClass(totalCashFlow)}`}>{fmt(totalCashFlow)}</p>
            <p className="text-xs text-gray-400 mt-0.5">per month</p>
          </div>
        </div>

        {/* Property cards */}
        {properties.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">No properties found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {properties.map((p) => {
              const cfPositive = p.monthlyCashFlow > 0
              const cfNegative = p.monthlyCashFlow < 0

              return (
                <div
                  key={p.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Card header */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A2B4A] truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {p.address}, {p.city}, {p.state}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500 bg-[#F5F6FA] border border-gray-200 px-2 py-0.5 rounded-md">
                          {formatPropertyType(p.property_type ?? '')}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                            p.occupancyRate === 100
                              ? 'bg-[#F0F7FF] text-[#1C7BC0]'
                              : p.occupancyRate === 0
                              ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {p.occupiedUnits}/{p.totalUnits} occupied
                        </span>
                      </div>
                    </div>

                    {/* Cash flow highlight */}
                    <div
                      className={`mt-3 flex items-center justify-between px-3 py-2 rounded-lg ${
                        cfPositive
                          ? 'bg-green-50 border border-green-100'
                          : cfNegative
                          ? 'bg-red-50 border border-red-100'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <span className={`text-xs font-medium ${cfPositive ? 'text-green-700' : cfNegative ? 'text-red-700' : 'text-gray-600'}`}>
                        Monthly Cash Flow
                      </span>
                      <span className={`text-sm font-bold ${cashFlowClass(p.monthlyCashFlow)}`}>
                        {fmt(p.monthlyCashFlow)}/mo
                      </span>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="px-5 py-4 grid grid-cols-2 gap-x-8">
                    {/* Left: income & expenses */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Income & Expenses</p>
                      <MetricRow label="Gross income" value={`${fmt(p.grossMonthlyIncome)}/mo`} valueClass="text-[#1C7BC0]" />
                      <MetricRow label="Operating costs" value={`${fmt(p.operatingExpenses)}/mo`} />
                      <MetricRow label="Mortgage" value={p.mortgagePayment > 0 ? `${fmt(p.mortgagePayment)}/mo` : '—'} />
                      <MetricRow label="Total expenses" value={`${fmt(p.totalExpenses)}/mo`} border={false} />
                    </div>

                    {/* Right: returns */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Performance</p>
                      <MetricRow label="NOI" value={`${fmt(p.noi)}/mo`} />
                      <MetricRow
                        label="Annual cash flow"
                        value={fmt(p.annualCashFlow)}
                        valueClass={cashFlowClass(p.annualCashFlow)}
                      />
                      <MetricRow
                        label="Cash-on-cash"
                        value={pct(p.cashOnCash)}
                        valueClass={
                          p.cashOnCash == null
                            ? 'text-gray-400'
                            : p.cashOnCash >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      />
                      <MetricRow
                        label="Cap rate"
                        value={pct(p.capRate)}
                        valueClass={p.capRate == null ? 'text-gray-400' : 'text-[#1A2B4A]'}
                        border={false}
                      />
                    </div>
                  </div>

                  {/* Footer: occupancy rate */}
                  <div className="px-5 pb-4">
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Occupancy rate</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              p.occupancyRate === 100 ? 'bg-[#1C7BC0]' : p.occupancyRate === 0 ? 'bg-red-400' : 'bg-amber-400'
                            }`}
                            style={{ width: `${p.occupancyRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#1A2B4A]">{pct(p.occupancyRate, 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Print footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">PropFlow · Generated {reportDate}</p>
        </div>
      </div>
    </div>
  )
}
