'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown } from 'lucide-react'

type LeaseTenant = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  is_primary: boolean
}

type LeaseRow = {
  id: string
  unit_id: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  monthly_rent: number | null
  unit_number: string | null
  property_id: string | null
  property_name: string | null
  tenants: LeaseTenant[]
}

type Stats = {
  total: number
  active: number
  expiringSoon: number
  monthlyRent: number
}

type SortCol = 'property' | 'rent' | 'end_date'
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

function EndDateCell({ endDate }: { endDate: string | null }) {
  if (!endDate) return <span className="text-gray-400 text-xs">—</span>
  const days = daysUntil(endDate)
  const text = formatDate(endDate)
  if (days !== null && days < 0) return <span className="text-red-600 text-xs">{text}</span>
  if (days !== null && days <= 90) return <span className="text-amber-500 text-xs">{text}</span>
  return <span className="text-gray-500 text-xs">{text}</span>
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'active')
    return <span className="bg-[#F0F7FF] text-[#1C7BC0] text-xs px-2 py-0.5 rounded-full">Active</span>
  if (status === 'expired')
    return <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full">Expired</span>
  return <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full capitalize">{status ?? '—'}</span>
}

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ArrowUp size={12} className="text-gray-400" />
  return dir === 'asc'
    ? <ArrowUp size={12} className="text-[#1C7BC0]" />
    : <ArrowDown size={12} className="text-[#1C7BC0]" />
}

function sortLeases(rows: LeaseRow[], col: SortCol, dir: SortDir): LeaseRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0
    if (col === 'property') {
      if (!a.property_name && !b.property_name) cmp = 0
      else if (!a.property_name) return 1
      else if (!b.property_name) return -1
      else cmp = a.property_name.toLowerCase().localeCompare(b.property_name.toLowerCase())
    } else if (col === 'rent') {
      if (a.monthly_rent == null && b.monthly_rent == null) cmp = 0
      else if (a.monthly_rent == null) return 1
      else if (b.monthly_rent == null) return -1
      else cmp = a.monthly_rent - b.monthly_rent
    } else {
      if (!a.end_date && !b.end_date) cmp = 0
      else if (!a.end_date) return 1
      else if (!b.end_date) return -1
      else cmp = parseLocalDate(a.end_date).getTime() - parseLocalDate(b.end_date).getTime()
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

export default function LeasesClient({ leases, stats }: { leases: LeaseRow[]; stats: Stats }) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('end_date')
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
    ? leases.filter(l => {
        const q = search.toLowerCase()
        const prop = (l.property_name ?? '').toLowerCase()
        const names = l.tenants.map(t => `${t.first_name} ${t.last_name}`.toLowerCase()).join(' ')
        return prop.includes(q) || names.includes(q)
      })
    : leases

  const sorted = sortLeases(filtered, sortCol, sortDir)

  const thBase = 'text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-5 py-3'
  const thSortable = `${thBase} cursor-pointer select-none hover:text-[#1C7BC0] transition-colors`

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A2B4A]">Leases</h1>
        <p className="text-gray-500 text-sm mt-1">{stats.total} leases</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Leases</p>
          <p className="text-[#1A2B4A] text-xl font-semibold">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Active</p>
          <p className="text-[#1C7BC0] text-xl font-semibold">{stats.active}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Expiring Soon</p>
          <p className="text-amber-500 text-xl font-semibold">{stats.expiringSoon}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Monthly Rent</p>
          <p className="text-[#1C7BC0] text-xl font-semibold">${stats.monthlyRent.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by property or tenant name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-[#1A2B4A] placeholder-gray-400 focus:outline-none focus:border-[#1C7BC0] w-full max-w-md"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">
            {search ? 'No leases match your search.' : 'No leases found.'}
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className={thSortable} onClick={() => handleSort('property')}>
                  <span className="flex items-center gap-1">
                    Property / Unit
                    <SortIcon col="property" active={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th className={thBase}>Tenants</th>
                <th
                  className={`${thSortable} text-right`}
                  onClick={() => handleSort('rent')}
                >
                  <span className="flex items-center gap-1 justify-end">
                    Monthly Rent
                    <SortIcon col="rent" active={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th className={`${thBase} hidden md:table-cell`}>Start Date</th>
                <th className={thSortable} onClick={() => handleSort('end_date')}>
                  <span className="flex items-center gap-1">
                    End Date
                    <SortIcon col="end_date" active={sortCol} dir={sortDir} />
                  </span>
                </th>
                <th className={thBase}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(l => (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-[#F0F7FF] transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/leases/${l.id}`}
                      className="text-[#1A2B4A] text-sm font-medium hover:text-[#1C7BC0] transition-colors"
                    >
                      {l.property_name ?? '—'}
                    </Link>
                    {l.unit_number && (
                      <p className="text-gray-500 text-xs">Unit {l.unit_number}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {l.tenants.length > 0 ? (
                      <div className="space-y-0.5">
                        {l.tenants.map(t => (
                          <div key={t.id}>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/tenants/${t.id}`}
                                className="text-gray-600 text-sm hover:text-[#1C7BC0] transition-colors"
                              >
                                {t.first_name} {t.last_name}
                              </Link>
                              {!t.is_primary && (
                                <span className="text-gray-500 text-xs border border-gray-200 rounded px-1 py-0.5 leading-none">Co</span>
                              )}
                            </div>
                            {t.phone && <p className="text-gray-400 text-xs">{t.phone}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[#1A2B4A] text-sm font-medium">
                      {l.monthly_rent != null ? `$${l.monthly_rent.toLocaleString()}` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className="text-gray-500 text-xs">{formatDate(l.start_date)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <EndDateCell endDate={l.end_date} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={l.status} />
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
