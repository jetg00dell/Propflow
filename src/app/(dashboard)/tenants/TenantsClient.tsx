'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown } from 'lucide-react'

type TenantRow = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  credit_score: number | null
  employer: string | null
  is_primary: boolean | null
  lease_id: string | null
  monthly_rent: number | null
  start_date: string | null
  end_date: string | null
  lease_status: string | null
  unit_number: string | null
  property_name: string | null
  property_id: string | null
}

type Stats = {
  totalTenants: number
  activeLeases: number
  avgCreditScore: number | null
  monthlyRevenue: number
}

type SortCol = 'tenant' | 'property' | 'lease_end'
type SortDir = 'asc' | 'desc'

function parseLocalDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((parseLocalDate(dateStr).getTime() - Date.now()) / 86400000)
}

function LeaseEndCell({ endDate }: { endDate: string | null }) {
  if (!endDate) return <span className="text-gray-400 text-xs">—</span>
  const days = daysUntil(endDate)
  const text = formatDate(endDate)
  if (days !== null && days < 0) return <span className="text-red-600 text-xs">{text}</span>
  if (days !== null && days <= 90) return <span className="text-amber-500 text-xs">{text}</span>
  return <span className="text-gray-500 text-xs">{text}</span>
}

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ArrowUp size={12} className="text-gray-400" />
  return dir === 'asc'
    ? <ArrowUp size={12} className="text-[#1C7BC0]" />
    : <ArrowDown size={12} className="text-[#1C7BC0]" />
}

function sortTenants(rows: TenantRow[], col: SortCol, dir: SortDir): TenantRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0
    if (col === 'tenant') {
      const aName = `${a.last_name ?? ''} ${a.first_name ?? ''}`.toLowerCase()
      const bName = `${b.last_name ?? ''} ${b.first_name ?? ''}`.toLowerCase()
      cmp = aName.localeCompare(bName)
    } else if (col === 'property') {
      const aP = (a.property_name ?? '').toLowerCase()
      const bP = (b.property_name ?? '').toLowerCase()
      if (!a.property_name && !b.property_name) cmp = 0
      else if (!a.property_name) return 1
      else if (!b.property_name) return -1
      else cmp = aP.localeCompare(bP)
    } else {
      if (!a.end_date && !b.end_date) cmp = 0
      else if (!a.end_date) return 1
      else if (!b.end_date) return -1
      else cmp = new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

export default function TenantsClient({ tenants, stats }: { tenants: TenantRow[]; stats: Stats }) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('tenant')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const filtered = search.trim()
    ? tenants.filter(t => {
        const name = `${t.first_name} ${t.last_name}`.toLowerCase()
        const prop = (t.property_name ?? '').toLowerCase()
        const q = search.toLowerCase()
        return name.includes(q) || prop.includes(q)
      })
    : tenants

  const sorted = sortTenants(filtered, sortCol, sortDir)

  const thBase = 'text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-5 py-3'
  const thSortable = `${thBase} cursor-pointer select-none hover:text-[#1C7BC0] transition-colors`

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A2B4A]">Tenants</h1>
          <p className="text-gray-500 text-sm mt-1">{stats.totalTenants} tenants</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Tenants</p>
          <p className="text-[#1A2B4A] text-xl font-semibold">{stats.totalTenants}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Active Leases</p>
          <p className="text-[#1A2B4A] text-xl font-semibold">{stats.activeLeases}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Avg Credit Score</p>
          <p className="text-[#1A2B4A] text-xl font-semibold">
            {stats.avgCreditScore !== null ? Math.round(stats.avgCreditScore) : '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Monthly Revenue</p>
          <p className="text-[#1C7BC0] text-xl font-semibold">${stats.monthlyRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by tenant name or property..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-[#1A2B4A] placeholder-gray-400 focus:outline-none focus:border-[#1C7BC0] w-full max-w-md"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">
            {search ? 'No tenants match your search.' : 'No tenants found.'}
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className={thSortable} onClick={() => handleSort('tenant')}>
                  <span className="flex items-center gap-1">
                    Tenant
                    <SortIcon col="tenant" active={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th className={thSortable} onClick={() => handleSort('property')}>
                  <span className="flex items-center gap-1">
                    Property / Unit
                    <SortIcon col="property" active={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th className={`${thBase} text-right`}>Rent</th>
                <th className={thSortable} onClick={() => handleSort('lease_end')}>
                  <span className="flex items-center gap-1">
                    Lease End
                    <SortIcon col="lease_end" active={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th className={`${thBase} text-right`}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-[#F0F7FF] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tenants/${t.id}`}
                        className="text-[#1A2B4A] text-sm font-medium hover:text-[#1C7BC0] transition-colors"
                      >
                        {t.first_name} {t.last_name}
                      </Link>
                      {t.is_primary === false && (
                        <span className="text-gray-500 text-xs border border-gray-200 rounded px-1.5 py-0.5 leading-none">
                          Co-tenant
                        </span>
                      )}
                    </div>
                    {t.email && <p className="text-gray-500 text-xs mt-0.5">{t.email}</p>}
                  </td>
                  <td className="px-5 py-3">
                    {t.property_name ? (
                      <div>
                        <p className="text-gray-700 text-sm">{t.property_name}</p>
                        {t.unit_number && (
                          <p className="text-gray-500 text-xs">Unit {t.unit_number}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[#1A2B4A] text-sm font-medium">
                      {t.monthly_rent ? `$${t.monthly_rent.toLocaleString()}` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <LeaseEndCell endDate={t.end_date} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-gray-600 text-sm">{t.credit_score ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
