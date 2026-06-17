'use client'

import { useState, useMemo } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tenant = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

type EnrichedLease = {
  leaseId: string
  unitId: string
  startDate: string
  endDate: string
  monthlyRent: number
  rentDueDay: number
  gracePeriodDays: number
  lateFeeFlat: number | null
  lateFeePct: number | null
  unitNumber: string
  propertyId: string
  propertyName: string
  propertyAddress: string
  propertyCity: string
  propertyState: string
  mortgageLender: string
  isCaresAct: boolean
  isHaTenant: boolean
  primaryTenant: Tenant | null
  allTenants: (Tenant | undefined)[]
  latestCharge: { total_due: number; ha_amount: number; tenant_amount: number; charge_month: string } | null
}

type NoticeType = 'nonpayment' | 'lease_violation' | 'repeat_violation' | 'substantial_violation' | 'lease_not_renewed' | 'no_fault'

type NoFaultReason = 'demolition' | 'repairs' | 'landlord_use' | 'for_sale' | 'declined_renewal' | 'late_history'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function leaseLengthMonths(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
}

function nonRenewalNoticeDays(months: number): number {
  if (months >= 12) return 91
  if (months >= 6) return 28
  if (months >= 1) return 21
  return 3
}

function deriveFormInfo(
  noticeType: NoticeType,
  isCaresAct: boolean,
  leaseMonths: number,
  noFaultReason?: NoFaultReason
): { form: string; days: number; title: string; description: string } {
  switch (noticeType) {
    case 'nonpayment':
      return { form: 'JDF 99A', days: isCaresAct ? 30 : 10, title: 'Demand for Compliance — Non-Payment', description: 'Tenant must pay past-due rent or vacate.' }
    case 'lease_violation':
      return { form: 'JDF 99A', days: isCaresAct ? 30 : 10, title: 'Demand for Compliance — Lease Violation', description: 'Tenant must cure the lease violation or vacate.' }
    case 'repeat_violation':
      return { form: 'JDF 99B', days: isCaresAct ? 30 : 10, title: 'Notice to Terminate — Repeat Violation', description: 'Prior JDF 99A was served. Tenant must vacate.' }
    case 'substantial_violation':
      return { form: 'JDF 99B', days: 3, title: 'Notice to Terminate — Substantial/Criminal Violation', description: 'No cure period. Tenant must vacate immediately.' }
    case 'lease_not_renewed':
      const noticeDays = nonRenewalNoticeDays(leaseMonths)
      return { form: 'JDF 99B', days: noticeDays, title: 'Notice to Terminate — Lease Not Renewed', description: `Lease will not be renewed. ${noticeDays} days notice required.` }
    case 'no_fault':
      return { form: 'JDF 99C', days: 90, title: 'Notice of No-Fault Eviction', description: 'Tenancy is ending without fault. Tenant must vacate.' }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] || colors.gray}`}>{children}</span>
}

function FormBadge({ form }: { form: string }) {
  const colors: Record<string, string> = {
    'JDF 99A': 'bg-[#E8F4FB] text-[#1C7BC0] border border-[#1C7BC0]',
    'JDF 99B': 'bg-orange-50 text-orange-700 border border-orange-300',
    'JDF 99C': 'bg-purple-50 text-purple-700 border border-purple-300',
  }
  return <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-semibold ${colors[form] || ''}`}>{form}</span>
}

// ─── Print Preview ────────────────────────────────────────────────────────────

function PrintPreview({
  lease, noticeType, formInfo, servedDate, cureDeadline, amountDue, dueMonths,
  violationTerm, violationDescription, priorNoticeDate, substantialChecks,
  noFaultReason, repairsCompletionDate, noFaultExplanation, signerRole,
}: {
  lease: EnrichedLease; noticeType: NoticeType; formInfo: ReturnType<typeof deriveFormInfo>
  servedDate: Date; cureDeadline: Date; amountDue: string; dueMonths: string
  violationTerm: string; violationDescription: string; priorNoticeDate: string
  substantialChecks: string[]; noFaultReason: NoFaultReason; repairsCompletionDate: string
  noFaultExplanation: string; signerRole: string
}) {
  const tenantNames = lease.allTenants.filter(Boolean).map(t => `${t!.first_name} ${t!.last_name}`).join(' & ')
  const county = 'Larimer'

  const noFaultLabels: Record<NoFaultReason, string> = {
    demolition: 'Demolition or Conversion', repairs: 'Substantial Repairs',
    landlord_use: 'Landlord/Family Use', for_sale: 'Home for Sale',
    declined_renewal: 'Tenant Declined New Rental Agreement', late_history: 'History of Late Payments',
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-8 font-serif text-sm leading-relaxed text-gray-900 max-w-2xl">
      <div className="border-2 border-gray-900 mb-6">
        <div className="flex">
          <div className="border-r-2 border-gray-900 px-4 py-3 font-bold text-xs w-28 flex items-center justify-center text-center">{formInfo.form}</div>
          <div className="px-4 py-3 text-center flex-1">
            <div className="font-bold text-lg">{formInfo.form === 'JDF 99A' ? 'Demand for Compliance' : formInfo.form === 'JDF 99B' ? 'Notice to Terminate Tenancy' : 'Notice of No-Fault Eviction'}</div>
            <div className="text-xs">Residential Eviction Notice</div>
            <div className="text-xs">{formInfo.form === 'JDF 99A' ? 'C.R.S. § 13-40-104, 106' : formInfo.form === 'JDF 99B' ? 'C.R.S. § 13-40-104, 107, 107.5' : 'C.R.S. § 38-12-1303'}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mb-4">
        <div><span className="text-xs text-gray-500 italic">To: </span><span className="font-medium border-b border-gray-900 px-2">{tenantNames}</span></div>
        <div className="text-xs">☑ And any other occupants.</div>
      </div>

      {formInfo.form === 'JDF 99A' && (
        <div className="mb-4">
          <div className="font-bold text-[#1C7BC0] mb-1">1. Time to Comply</div>
          <p className="text-xs mb-2">The Landlord is starting the eviction process. You can avoid eviction, but you have a limited time to move or fix the problem.</p>
          <div className="flex justify-between text-xs">
            <span>☑ {lease.isCaresAct ? 'CARES Act Property:' : 'Residential Agreement:'}</span>
            <span className="font-bold">{formInfo.days} days</span>
          </div>
        </div>
      )}

      {(formInfo.form === 'JDF 99B' || formInfo.form === 'JDF 99C') && (
        <div className="mb-4">
          <div className="font-bold text-[#1C7BC0] mb-1">1. Move-Out Date</div>
          <p className="text-xs mb-2">The Landlord is ending your tenancy and starting the eviction process. You must move out by:</p>
          <div className="text-xs">
            <span className="font-medium">Date: </span><span className="border-b border-gray-900 px-4">{formatDate(cureDeadline)}</span>
            {'  '}<span className="border-b border-gray-900 px-4">11:59</span>{' '}☑ PM
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="font-bold text-[#1C7BC0] mb-1">
          {formInfo.form === 'JDF 99A' ? '2. Grounds for Eviction' : formInfo.form === 'JDF 99C' ? '2. Cause for Termination' : '2. Reason for Termination'}
        </div>
        {noticeType === 'nonpayment' && (
          <div className="text-xs">
            <div className="mb-1">☑ <strong>a) Pay Your Rent</strong> — C.R.S. § 13-40-104(d)</div>
            <div className="ml-4">
              <div>Past rent due: <span className="border-b border-gray-900 px-2">${amountDue}</span></div>
              <div>This is for missed payments due on: <span className="border-b border-gray-900 px-2">{dueMonths}</span></div>
            </div>
          </div>
        )}
        {noticeType === 'lease_violation' && (
          <div className="text-xs">
            <div className="mb-1">☑ <strong>b) Comply with the Lease</strong> — C.R.S. § 13-40-104(e)</div>
            <div className="ml-4">
              <div>Lease Term violated: <span className="border-b border-gray-900 px-2">{violationTerm}</span></div>
              <div className="mt-1">Explanation: {violationDescription}</div>
            </div>
          </div>
        )}
        {noticeType === 'repeat_violation' && (
          <div className="text-xs">
            <div className="mb-1">☑ <strong>c) Repeat Violation</strong> — Move Out in {formInfo.days} Days</div>
            <div className="ml-4">
              <div>{violationDescription}</div>
              <div className="mt-1">A Demand for Compliance (JDF 99A) detailing the prior violation was served on: <span className="border-b border-gray-900 px-2">{priorNoticeDate}</span></div>
              {lease.isCaresAct && <div className="mt-1">☑ CARES Act Property — Tenant entitled to 30 days.</div>}
            </div>
          </div>
        )}
        {noticeType === 'substantial_violation' && (
          <div className="text-xs">
            <div className="mb-1">☑ <strong>b) Substantial Violation (criminal behavior)</strong> — Move Out in 3 Days</div>
            <div className="ml-4">
              {substantialChecks.includes('endanger') && <div>☑ Willfully and substantially endangered the property or other tenants.</div>}
              {substantialChecks.includes('felony') && <div>☑ Committed a violent or drug-related felony crime.</div>}
              {substantialChecks.includes('nuisance') && <div>☑ Committed a criminal act that was a public nuisance under law and could result in jail time of 180 days or more.</div>}
              <div className="mt-1">Details: {violationDescription}</div>
            </div>
          </div>
        )}
        {noticeType === 'lease_not_renewed' && (
          <div className="text-xs">
            <div className="mb-1">☑ <strong>a) Lease Not Renewed</strong></div>
            <div className="ml-4">Your periodic tenancy will end, or the Landlord will not renew the fixed-term tenancy.</div>
          </div>
        )}
        {noticeType === 'no_fault' && (
          <div className="text-xs">
            <div className="mb-1">☑ <strong>{noFaultLabels[noFaultReason]}</strong></div>
            {noFaultReason === 'repairs' && repairsCompletionDate && (
              <div className="ml-4">Expected Completion Date: <span className="border-b border-gray-900 px-2">{repairsCompletionDate}</span></div>
            )}
            {noFaultExplanation && <div className="ml-4 mt-1">{noFaultExplanation}</div>}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="font-bold text-[#1C7BC0] mb-1">{formInfo.form === 'JDF 99A' ? '3. Description of Premises' : '4. Description of Premises'}</div>
        <div className="text-xs space-y-1">
          <div>Street Address: <span className="border-b border-gray-900 px-2">{lease.propertyAddress}{lease.unitNumber && lease.unitNumber !== 'Main' ? `, Unit ${lease.unitNumber}` : ''}</span></div>
          <div className="flex gap-8">
            <span>City: <span className="border-b border-gray-900 px-2">{lease.propertyCity}</span></span>
            <span>County: <span className="border-b border-gray-900 px-2">{county}</span></span>
          </div>
          {formInfo.form === 'JDF 99A' && (
            <div>The rent for the premises is <span className="border-b border-gray-900 px-2">${lease.monthlyRent.toLocaleString()}</span> per <span className="border-b border-gray-900 px-2">month</span></div>
          )}
        </div>
      </div>

      {formInfo.form === 'JDF 99A' && (
        <div className="mb-4">
          <div className="font-bold text-[#1C7BC0] mb-1">4. Time to Cure</div>
          <div className="text-xs">
            <p className="mb-1">If you don't fix the problems listed above, you must move out by:</p>
            <div>Date: <span className="border-b border-gray-900 px-4">{formatDate(cureDeadline)}</span>{'  '}Time: <span className="border-b border-gray-900 px-2">11:59</span> ☑ PM</div>
          </div>
        </div>
      )}

      <div className="mb-4 border border-gray-200 rounded p-3 bg-gray-50">
        <div className="font-bold text-[#1C7BC0] mb-1 text-xs">{formInfo.form === 'JDF 99A' ? '7. Tenant\'s Rights' : '7. Right to Mediation'}</div>
        <div className="text-xs space-y-1">
          <p className="font-medium">To Tenants, if you receive:</p>
          <p>• Supplemental Security Income (SSI)</p>
          <p>• Social Security Disability Insurance (SSDI)</p>
          <p>• Cash Assistance through the Colorado Works Program</p>
          <p className="mt-1">You may have a right to mandatory mediation at no cost before the landlord can start an eviction case. Contact: <strong>www.ColoradoODR.org</strong></p>
          {formInfo.form === 'JDF 99A' && (
            <p className="mt-1">If you are a victim-survivor of unlawful sexual behavior, stalking, or domestic violence, you may be entitled to a repayment plan. See C.R.S. § 13-40-104(4)(a).</p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="font-bold text-[#1C7BC0] mb-1">5. Signature</div>
        <div className="text-xs flex gap-8 items-center">
          <div>Signature: <span className="border-b border-gray-900 inline-block w-40">&nbsp;</span></div>
          <div>☑ {signerRole}</div>
        </div>
        <div className="text-xs mt-1">Dated: <span className="border-b border-gray-900 px-4">{formatDate(new Date())}</span></div>
      </div>

      <div className="mb-2">
        <div className="font-bold text-[#1C7BC0] mb-1">6. Service — C.R.S. § 13-40-108</div>
        <div className="text-xs space-y-1">
          <div>Date Served: <span className="border-b border-gray-900 px-4">___/___/______</span></div>
          <div>Service Method (check one):</div>
          <div className="ml-2">○ a) Personal service under C.R.S. § 13-40-108.</div>
          <div className="ml-2">○ b) Posting on the Property. Failed Attempt Date(s): ___________</div>
          <div className="ml-4 text-gray-500">Posted after the 2nd (or 3rd) failed attempt.</div>
          <div>Signature: <span className="border-b border-gray-900 inline-block w-40">&nbsp;</span></div>
        </div>
      </div>

      <div className="border-t border-gray-300 mt-4 pt-2 text-xs text-gray-400 flex justify-between">
        <span>{formInfo.form} – {formInfo.title} | R: {formInfo.form === 'JDF 99A' ? 'September 4, 2025' : 'May 1, 2025'}</span>
        <span>www.coloradojudicial.gov</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NoticesClient({ leases }: { leases: EnrichedLease[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedLeaseId, setSelectedLeaseId] = useState('')
  const [noticeType, setNoticeType] = useState<NoticeType | ''>('')
  const [noFaultReason, setNoFaultReason] = useState<NoFaultReason>('demolition')
  const [substantialChecks, setSubstantialChecks] = useState<string[]>([])
  const [amountDue, setAmountDue] = useState('')
  const [dueMonths, setDueMonths] = useState('')
  const [violationTerm, setViolationTerm] = useState('')
  const [violationDescription, setViolationDescription] = useState('')
  const [priorNoticeDate, setPriorNoticeDate] = useState('')
  const [repairsCompletionDate, setRepairsCompletionDate] = useState('')
  const [noFaultExplanation, setNoFaultExplanation] = useState('')
  const [servedDate] = useState(new Date())
  const [signerRole, setSignerRole] = useState('Landlord')

  const selectedLease = leases.find(l => l.leaseId === selectedLeaseId)
  const leaseMonths = selectedLease ? leaseLengthMonths(selectedLease.startDate, selectedLease.endDate) : 12
  const formInfo = useMemo(() => {
    if (!noticeType || !selectedLease) return null
    return deriveFormInfo(noticeType, selectedLease.isCaresAct, leaseMonths, noFaultReason)
  }, [noticeType, selectedLease, leaseMonths, noFaultReason])

  const cureDeadline = formInfo ? addDays(servedDate, formInfo.days + 1) : new Date()

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A2B4A]">Notice Generator</h1>
          <p className="text-sm text-gray-500 mt-1">Generate Colorado JDF eviction notices pre-filled from tenant and property data.</p>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[{ n: 1, label: 'Select Tenant' }, { n: 2, label: 'Notice Type' }, { n: 3, label: 'Details & Preview' }].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2">
              <button onClick={() => { if (n < step || (n === 2 && selectedLeaseId)) setStep(n as 1 | 2 | 3) }} className={`flex items-center gap-2 ${n <= step ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === n ? 'bg-[#1C7BC0] text-white' : step > n ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step > n ? '✓' : n}
                </div>
                <span className={`text-sm font-medium ${step === n ? 'text-[#1A2B4A]' : 'text-gray-400'}`}>{label}</span>
              </button>
              {i < 2 && <div className="w-8 h-px bg-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-[#1A2B4A] mb-4">Select Tenant</h2>
            <div className="grid gap-3">
              {leases.map(lease => {
                const tenantName = lease.primaryTenant ? `${lease.primaryTenant.first_name} ${lease.primaryTenant.last_name}` : 'Unknown'
                const coTenants = lease.allTenants.filter(t => t?.id !== lease.primaryTenant?.id)
                const isSelected = selectedLeaseId === lease.leaseId
                return (
                  <button key={lease.leaseId} onClick={() => setSelectedLeaseId(lease.leaseId)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-[#1C7BC0] bg-[#E8F4FB]' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-[#1A2B4A]">
                          {tenantName}
                          {coTenants.length > 0 && <span className="text-gray-500 font-normal"> & {coTenants.map(t => `${t!.first_name} ${t!.last_name}`).join(', ')}</span>}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">{lease.propertyName} {lease.unitNumber && `· Unit ${lease.unitNumber}`}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{lease.propertyAddress}, {lease.propertyCity} · ${lease.monthlyRent.toLocaleString()}/mo</div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {lease.isHaTenant && <Badge color="blue">HA Tenant</Badge>}
                        {lease.isCaresAct && <Badge color="orange">CARES Act</Badge>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button disabled={!selectedLeaseId} onClick={() => setStep(2)}
                className="px-6 py-2 bg-[#1C7BC0] text-white rounded-md text-sm font-medium disabled:opacity-40 hover:bg-[#1568a3] transition-colors">
                Next: Choose Notice Type →
              </button>
            </div>
          </div>
        )}

        {step === 2 && selectedLease && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-[#1A2B4A]">{selectedLease.primaryTenant?.first_name} {selectedLease.primaryTenant?.last_name}</div>
                <div className="text-sm text-gray-500">{selectedLease.propertyName} · {selectedLease.propertyAddress}</div>
              </div>
              <div className="flex gap-2">
                {selectedLease.isHaTenant && <Badge color="blue">HA Tenant</Badge>}
                {selectedLease.isCaresAct && <Badge color="orange">CARES Act · 30-day notice</Badge>}
              </div>
            </div>
            <h2 className="text-base font-semibold text-[#1A2B4A] mb-4">What is the reason for this notice?</h2>
            <div className="grid gap-3">
              {([
                { value: 'nonpayment', label: 'Non-Payment of Rent', sub: 'Tenant has not paid rent that is due.', form: 'JDF 99A', days: selectedLease.isCaresAct ? 30 : 10 },
                { value: 'lease_violation', label: 'Lease Violation (first offense)', sub: 'Tenant violated a lease term and has not yet received a prior notice.', form: 'JDF 99A', days: selectedLease.isCaresAct ? 30 : 10 },
                { value: 'repeat_violation', label: 'Repeat Violation', sub: 'A prior JDF 99A was already served for this type of violation.', form: 'JDF 99B', days: selectedLease.isCaresAct ? 30 : 10 },
                { value: 'substantial_violation', label: 'Substantial / Criminal Violation', sub: 'Dangerous, violent, or drug-related felony activity.', form: 'JDF 99B', days: 3 },
                { value: 'lease_not_renewed', label: 'Lease Not Renewed', sub: 'Ending a periodic tenancy or declining to renew a fixed-term lease.', form: 'JDF 99B', days: nonRenewalNoticeDays(leaseMonths) },
                { value: 'no_fault', label: 'No-Fault Termination', sub: 'Demolition, repairs, landlord use, sale, or other no-fault reasons.', form: 'JDF 99C', days: 90 },
              ] as const).map(option => (
                <button key={option.value} onClick={() => setNoticeType(option.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${noticeType === option.value ? 'border-[#1C7BC0] bg-[#E8F4FB]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-[#1A2B4A]">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{option.sub}</div>
                    </div>
                    <div className="flex gap-2 items-center shrink-0">
                      <FormBadge form={option.form} />
                      <span className="text-xs text-gray-500 font-medium">{option.days}d</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {noticeType === 'no_fault' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-[#1A2B4A] mb-2">No-Fault Reason</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'demolition', label: 'Demolition or Conversion' },
                    { value: 'repairs', label: 'Substantial Repairs' },
                    { value: 'landlord_use', label: 'Landlord / Family Use' },
                    { value: 'for_sale', label: 'Home for Sale' },
                    { value: 'declined_renewal', label: 'Tenant Declined New Agreement' },
                    { value: 'late_history', label: 'History of Late Payments' },
                  ] as const).map(r => (
                    <button key={r.value} onClick={() => setNoFaultReason(r.value)}
                      className={`p-2 text-xs rounded border text-left transition-colors ${noFaultReason === r.value ? 'border-[#1C7BC0] bg-[#E8F4FB] text-[#1C7BC0] font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">← Back</button>
              <button disabled={!noticeType} onClick={() => setStep(3)}
                className="px-6 py-2 bg-[#1C7BC0] text-white rounded-md text-sm font-medium disabled:opacity-40 hover:bg-[#1568a3] transition-colors">
                Next: Fill Details →
              </button>
            </div>
          </div>
        )}

        {step === 3 && selectedLease && noticeType && formInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                <FormBadge form={formInfo.form} />
                <div>
                  <div className="font-semibold text-[#1A2B4A] text-sm">{formInfo.title}</div>
                  <div className="text-xs text-gray-500">{formInfo.days}-day notice · Deadline: {formatDateLong(cureDeadline)}</div>
                </div>
              </div>

              {selectedLease.isCaresAct && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                  <strong>CARES Act property:</strong> {selectedLease.isHaTenant ? 'HA tenant — federally subsidized.' : 'Federally backed mortgage.'} 30-day notice required.
                </div>
              )}

              <div className="space-y-4">
                {noticeType === 'nonpayment' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Total Amount Due ($)</label>
                      <input type="text" value={amountDue} onChange={e => setAmountDue(e.target.value)}
                        placeholder={selectedLease.latestCharge?.tenant_amount?.toString() || selectedLease.monthlyRent.toString()}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]" />
                      {selectedLease.latestCharge && (
                        <p className="text-xs text-gray-400 mt-1">Latest charge: ${selectedLease.latestCharge.tenant_amount?.toLocaleString()} tenant / ${selectedLease.latestCharge.ha_amount?.toLocaleString()} HA</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Missed Payment Month(s)</label>
                      <input type="text" value={dueMonths} onChange={e => setDueMonths(e.target.value)}
                        placeholder="e.g. June 2026"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]" />
                    </div>
                  </>
                )}

                {(noticeType === 'lease_violation' || noticeType === 'repeat_violation') && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lease Term Violated</label>
                      <input type="text" value={violationTerm} onChange={e => setViolationTerm(e.target.value)}
                        placeholder="e.g. No Unauthorized Occupants"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Explanation</label>
                      <textarea value={violationDescription} onChange={e => setViolationDescription(e.target.value)}
                        placeholder="Describe how the lease term was violated..." rows={3}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]" />
                    </div>
                    {noticeType === 'repeat_violation' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date Prior JDF 99A Was Served</label>
                        <input type="date" value={priorNoticeDate} onChange={e => setPriorNoticeDate(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]" />
                      </div>
                    )}
                  </>
                )}

                {noticeType === 'substantial_violation' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Check all that apply</label>
                      {[
                        { value: 'endanger', label: 'Willfully and substantially endangered the property or other tenants' },
                        { value: 'felony', label: 'Committed a violent or drug-related felony crime' },
                        { value: 'nuisance', label: 'Committed a criminal act that was a public nuisance (potential 180+ day jail time)' },
                      ].map(opt => (
                        <label key={opt.value} className="flex items-start gap-2 mb-2 cursor-pointer">
                          <input type="checkbox" checked={substantialChecks.includes(opt.value)}
                            onChange={e => setSubstantialChecks(prev => e.target.checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value))}
                            className="mt-0.5" />
                          <span className="text-xs text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description of What Happened</label>
                      <textarea value={violationDescription} onChange={e => setViolationDescription(e.target.value)} rows={3}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]" />
                    </div>
                  </>
                )}

                {noticeType === 'no_fault' && (
                  <>
                    {noFaultReason === 'repairs' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Expected Completion Date</label>
                        <input type="date" value={repairsCompletionDate} onChange={e => setRepairsCompletionDate(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Explanation</label>
                      <textarea value={noFaultExplanation} onChange={e => setNoFaultExplanation(e.target.value)}
                        placeholder="Describe the reason for termination..." rows={3}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]" />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Signing As</label>
                  <select value={signerRole} onChange={e => setSignerRole(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1C7BC0]">
                    <option>Landlord</option>
                    <option>Landlord&apos;s Agent</option>
                    <option>Landlord&apos;s Attorney</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">← Back</button>
                <button onClick={() => window.print()}
                  className="px-6 py-2 bg-[#1C7BC0] text-white rounded-md text-sm font-medium hover:bg-[#1568a3] transition-colors">
                  🖨 Print Notice
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Live Preview</div>
              <div className="overflow-auto max-h-[800px]">
                <PrintPreview
                  lease={selectedLease} noticeType={noticeType} formInfo={formInfo}
                  servedDate={servedDate} cureDeadline={cureDeadline}
                  amountDue={amountDue || selectedLease.latestCharge?.tenant_amount?.toString() || selectedLease.monthlyRent.toString()}
                  dueMonths={dueMonths} violationTerm={violationTerm} violationDescription={violationDescription}
                  priorNoticeDate={priorNoticeDate} substantialChecks={substantialChecks}
                  noFaultReason={noFaultReason} repairsCompletionDate={repairsCompletionDate}
                  noFaultExplanation={noFaultExplanation} signerRole={signerRole}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
