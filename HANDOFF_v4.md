# PropFlow — Complete Handoff Summary
*Updated June 17, 2026*

---

## Claude Interaction Instructions
- **Always start every response with "Jeff,"**

---

## Stack & Access
- Next.js + Supabase + Tailwind CSS + Vercel
- Live: `https://propflow-coral.vercel.app`
- Local: `C:\Users\jetgo\propflow` — `npm run dev` in VS Code CMD terminal
- GitHub: `github.com/jetg00dell/Propflow`
- Supabase: `https://supabase.com/dashboard/project/cefwvcyeriiwipyagrbb`
- Email: Resend from `noreply@jgoodellhomes.com`
- Claude Code: run `claude` in PowerShell from project folder, then `cd C:\Users\jetgo\propflow` first

---

## Key Code Patterns
- Use `createAdminClient` from `@/lib/supabase/server` for all data queries (bypasses RLS)
- `createAdminClient()` is called **synchronously** (no await)
- 5 flat queries + JS merge maps instead of nested Supabase joins
- `parseLocalDate` for all date formatting to avoid UTC timezone shift
- Client components handle sorting/search; server components handle data fetching
- Buildium color scheme: `bg-[#F5F6FA]` page, `bg-white` cards, `text-[#1A2B4A]` headings, `text-[#1C7BC0]` accent, no dark mode classes
- Always use CMD (not PowerShell) for git commands
- Always use Claude Code for code edits
- Jeff prefers Claude Code to handle builds end-to-end rather than downloading/copy-pasting files

---

## Database Tables
- `properties`: id, name, address, city, state, property_type, status, mortgage_payment, mortgage_balance, mortgage_rate, mortgage_balance_date, insurance_premium, property_tax, hoa_fee, insurance_policy, insurance_expiry, electric/gas/water/sewer/trash provider+paid_by+account, estimated_value, purchase_price, cash_invested, last_value_update, mortgage_lender, **is_cares_act** (boolean), **year_built** (integer)
- `units`: id, property_id, unit_number, status, bedrooms, bathrooms, sq_ft, market_rent
- `tenants`: id, first_name, last_name, email, phone, employer, monthly_income, credit_score, emergency_contact_name, emergency_contact_phone
- `leases`: id, unit_id, status, start_date, end_date, monthly_rent, security_deposit, pet_deposit, late_fee_flat, late_fee_pct, grace_period_days, rent_due_day, pet_rent, auto_renew, renewal_notice_days, document_url, signed_at, notes
  — Note: ha_amount and tenant_amount live on rent_charges, NOT on leases
- `lease_tenants`: id, lease_id, tenant_id, is_primary
- `rent_charges`: id, lease_id, charge_month, total_due, ha_amount, tenant_amount, notes
- `payments`: id, lease_id, charge_id, amount, paid_by (ha/tenant), method, status, type, paid_date, notes
- `maintenance_requests`: id, unit_id, tenant_id, title, description, urgency, status, notes, photo_url, created_at, updated_at
- `expenses`: id, property_id, unit_id, vendor_id, category, description, amount, date, receipt_url, is_recurring, notes, created_at, source, csv_import_id, maintenance_request_id, payee, transaction_date, created_by
- `payee_rules`: id, payee_pattern, category, property_id, created_at
- `csv_imports`: id, filename, row_count, matched_count, review_count, imported_at, imported_by
- `notices`: id, lease_id, type, title, issued_date, response_deadline, status, notes, created_at
- `lease_documents`: id, lease_id, category, filename, storage_path, uploaded_at, notes

---

## Expense Categories
rent_income, repair_maintenance, utility, mortgage, insurance, tax, advertising, management_fees, professional_fees, supplies, capital_improvement, other

---

## Properties & Ownership
| Property | City | Owner Entity | Property ID | Year Built | CARES Act | Mortgage |
|---|---|---|---|---|---|---|
| 214 Clover Lane | Fort Collins | Individual | a1000000-0000-0000-0000-000000000001 | 1951 | ❌ | Unknown |
| 2252 Anelda Court | Loveland | J Goodell Homes, Inc | a1000000-0000-0000-0000-000000000002 | 1980 | ✅ | HA tenants |
| 337 Garfield Avenue | Loveland | Individual | a1000000-0000-0000-0000-000000000003 | 1917 | ✅ | Freddie Mac + HA |
| 317 Diamond Drive | Fort Collins | Individual | a1000000-0000-0000-0000-000000000004 | 1975 | ❌ | Not federally backed |
| 1506-1508 Estrella Avenue | Loveland | 1506 Estrella, LLC | a1000000-0000-0000-0000-000000000005 | 1969 | ✅ | HA tenants |
| 8329 Medicine Bow Avenue | Fort Collins | Individual | a1000000-0000-0000-0000-000000000006 | 1985 | ✅ | Freddie Mac |
| 2616 Killdeer Drive | Fort Collins | Individual | a1000000-0000-0000-0000-000000000007 | 1967 | ✅ | Freddie Mac + HA |
| 2025 Creekwood Drive | Fort Collins | J Goodell Homes, Inc | a1000000-0000-0000-0000-000000000008 | 1982 | ❌ | Not federally backed |

### Lead Paint Disclosure Required (pre-1978)
Clover Lane (1951), Garfield (1917), Diamond (1975), Estrella (1969), Killdeer (1967) — **5 of 8 properties**
NOT required: Anelda (1980), Medicine Bow (1985), Creekwood (1982)

---

## Units
| Property | Unit | Unit ID |
|---|---|---|
| 317 Diamond Drive | Main | b1000000-0000-0000-0000-000000000007 |
| 317 Diamond Drive | ADU | b1000000-0000-0000-0000-000000000008 |
| 2616 Killdeer Drive | Main | b1000000-0000-0000-0000-000000000012 |
| 2616 Killdeer Drive | ADU | b1000000-0000-0000-0000-000000000013 |

---

## Active Tenants
| Name | Unit | Property | Monthly Rent | Lease ID |
|---|---|---|---|---|
| Christina Bachman | 1506 | 1506-1508 Estrella Avenue | $2,320 | d1000000-0000-0000-0000-000000000005 |
| Forest Mangus | 1508 | 1506-1508 Estrella Avenue | $2,210 | d1000000-0000-0000-0000-000000000006 |
| Darius Bell | Main | 2025 Creekwood Drive | $2,340 | d1000000-0000-0000-0000-000000000007 |
| James Bostron | Main | 2252 Anelda Court | $1,955 | d1000000-0000-0000-0000-000000000008 |
| Lizzy Rendon | Main | 2252 Anelda Court | $1,955 | d1000000-0000-0000-0000-000000000008 |
| Sherry Garcia | ADU | 2252 Anelda Court | $1,801 | d1000000-0000-0000-0000-000000000009 |
| Ryan Miller | ADU | 2616 Killdeer Drive | $1,692 | d1000000-0000-0000-0000-000000000010 |
| Moses Brown | Main | 8329 Medicine Bow Avenue | $2,730 | d1000000-0000-0000-0000-000000000011 |
| Amanda Goodell | Main | 317 Diamond Drive | $1,745 | d1000000-0000-0000-0000-000000000001 |
| Conor O'Shea | Main | 317 Diamond Drive | $1,745 | d1000000-0000-0000-0000-000000000001 |
| Andrew Marshall | ADU | 317 Diamond Drive | $650 | d1000000-0000-0000-0000-000000000002 |
| Susan Rutledge | ADU | 317 Diamond Drive | $650 | d1000000-0000-0000-0000-000000000002 |
| Rachel Sullivan | 337 | 337 Garfield Avenue | $2,679 | d1000000-0000-0000-0000-000000000003 |
| Diona Green | 339 | 337 Garfield Avenue | $1,780 | d1000000-0000-0000-0000-000000000004 |

## Former Tenants
| Name | Unit | Property | Lease ID | Notes |
|---|---|---|---|---|
| Travis & Kristina Slack | Main | 2616 Killdeer Drive | d1000000-0000-0000-0000-000000000012 | Jan 2026 only, expired |
| Ivan Noriega | 1508 | 1506-1508 Estrella Avenue | 5059f74a-329b-4ad7-82b8-9c63c15919ea | expired |

---

## HA (Housing Authority) Tenants
- James Bostron (Anelda Main): HA pays $266, tenant pays $1,689
- Sherry Garcia (Anelda ADU): HA pays $1,715, tenant pays $86
- Ryan Miller (Killdeer ADU): HA pays $1,692, tenant pays $0 — 100% HA
- Diona Green (Garfield 339): HA pays $1,780, tenant pays $0 — 100% HA (as of June 2026)
- Rachel Sullivan (Garfield 337): HA pays $2,679, tenant pays $0 — 100% HA

---

## Payment Notes
- James Bostron: Jan 2026 HA portion ($266) never paid — tracked as outstanding
- Ryan Miller: 100% HA paid, tenant pays nothing
- Diona Green May 2026: UNPAID — to be addressed
- Wells Fargo business checking account for 1506 Estrella LLC — account 3208998413
- One bank account per property except the 2 JGH properties share one account

---

## Pages Built
- `/dashboard` — stats, occupancy, expiring leases, maintenance
- `/properties` — property grid
- `/properties/[id]` — detail with units, utilities, financial metrics
- `/tenants` — sortable/searchable list
- `/tenants/[id]` — tenant detail
- `/leases` — lease list with expiring alerts
- `/leases/[id]` — lease detail with Documents section (upload/view/delete per category, lead paint auto-hidden for post-1978 properties)
- `/payments` — rent charges + payments with HA/tenant split, month filter, by-property/by-tenant toggle, overpayment indicator, future months show as PENDING, auto-create next month charge on payment, partial payment prompt with late fee + notes
- `/financials` — per-property with amortization, portfolio value, equity
- `/expenses` — PDF bank statement import, manual add, edit, delete, CSV export, filters, maintenance linking, duplicate detection, deposit → payment recording flow
- `/maintenance` — filterable, new request, linked expenses rollup per request
- `/notices` — 3-step JDF notice generator (99A/99B/99C), CARES Act auto-detection, live preview, print to new window
- `/reports` — per-property NOI, cash flow, cap rate
- `/reports/cpa` — CPA report with income/expenses/net by property, ownership groups, year filter
- `/templates` — master blank document templates (upload/view/replace/delete per category)
- `/portal` — tenant-facing portal
- `/login` + `/reset-password` — Buildium themed

---

## Key API Routes
- `POST /api/parse-statement` — upload Wells Fargo PDF, returns categorized transactions
- `POST /api/save-statement` — saves categorized transactions, returns rent deposits for manual entry
- `GET /api/expenses` — fetch all expenses
- `POST /api/expenses` — create manual expense
- `PATCH /api/expenses` — edit expense
- `DELETE /api/expenses` — delete expense
- `POST /api/expenses/check-duplicate` — duplicate detection
- `GET /api/maintenance-requests` — fetch open/in-progress requests
- `GET /api/reports/cpa?year=YYYY` — CPA report data
- `POST /api/maintenance` — create maintenance request + send emails
- `PATCH /api/maintenance/[id]` — update status + send tenant email
- `POST /api/payments` — create payment + auto-create next month charge if needed, returns nextMonthPrompt
- `PATCH /api/payments/[id]` — edit payment
- `DELETE /api/payments/[id]` — delete payment
- `GET /api/payments/record` — check if charge exists for lease+month, return lease defaults
- `POST /api/payments/record` — create charge + payment together
- `PATCH /api/rent-charges/[id]` — edit rent charge
- `DELETE /api/rent-charges/[id]` — delete rent charge
- `GET /api/notices` — fetch notices
- `POST /api/notices` — create notice
- `PATCH /api/notices/[id]` — update notice
- `DELETE /api/notices/[id]` — delete notice
- `POST /api/documents` — upload lease document to Supabase Storage
- `GET /api/documents/[id]` — get signed URL for lease document
- `DELETE /api/documents/[id]` — delete lease document
- `POST /api/templates` — upload template to Supabase Storage
- `GET /api/templates/[category]` — get signed URL for template
- `DELETE /api/templates/[category]` — delete template

---

## Supabase Storage Buckets
- `lease-documents` — signed lease documents organized by lease_id
- `document-templates` — master blank template forms
- Both buckets have full SELECT/INSERT/UPDATE/DELETE policies enabled

---

## Document Categories (lease_documents table)
- `lease_agreement` — signed lease
- `addenda` — combined Drug-Free, Mold, Asbestos, Pet addendum
- `disclosure_lead` — Lead-Based Paint (pre-1978 properties only, auto-hidden otherwise)
- `disclosure_radon` — Radon Disclosure
- `disclosure_brokerage` — Brokerage Disclosure to Tenant
- `checklist_movein` — Move-In Checklist
- `checklist_moveout` — Move-Out Checklist

## Attorney-Prepared Documents (Tschetter Sulzer Muccio PC)
- TSM_SFL_08_07_25 — Lease Agreement
- TSM_SFL_Addenda — Combined addenda (Drug-Free, Mold, Asbestos, Pet)
- CO_CREC_Brokerage_Disclosure — Brokerage Disclosure to Tenant (always required — Jeff is a licensed CO realtor)
- TSM_Radon_Disclosure — Radon Disclosure
- Lead_Based_Paint_Disclosure (fillable) — Lead Paint (pre-1978 only)
- TSM_Addendum_A_Move-In_Move-Out_Checklist — Move-In/Out Checklist

---

## Key Files
- `src/components/Dashboard.tsx` — sidebar layout wrapper
- `src/components/DashboardHome.tsx` — dashboard home content
- `src/components/RecordRentPaymentModal.tsx` — unified payment modal
- `src/app/(dashboard)/expenses/page.tsx` — full expense tracking page
- `src/app/(dashboard)/reports/cpa/page.tsx` — CPA report page
- `src/app/(dashboard)/maintenance/MaintenanceClient.tsx` — maintenance UI
- `src/app/(dashboard)/notices/NoticesClient.tsx` — JDF notice generator UI
- `src/app/(dashboard)/notices/page.tsx` — notices server component
- `src/app/(dashboard)/templates/TemplatesClient.tsx` — templates UI
- `src/app/payments/PaymentsClient.tsx` — payments UI
- `src/app/payments/page.tsx` — payments server component
- `src/app/(dashboard)/leases/[id]/DocumentsSection.tsx` — lease document upload UI
- `src/lib/amortization.ts` — mortgage balance calculator
- `src/middleware.ts` — tenant vs owner routing

---

## Notice Generator — How It Works
- 3-step wizard: Select Tenant → Notice Type → Details & Preview
- Auto-detects CARES Act from `properties.is_cares_act` and HA status from `rent_charges.ha_amount`
- CARES Act tenants get 30-day notices instead of 10-day
- Form selection: JDF 99A (non-payment/violation), JDF 99B (repeat/substantial/non-renewal), JDF 99C (no-fault)
- Live preview updates as you type
- Print opens a clean new window with just the notice, auto-triggers print dialog
- Colorado law reference: HB25-1240 (effective May 29, 2025) — all landlords must accept Section 8, 30-day notice required for HA tenants

---

## Payments Tab — How It Works
- Month filter dropdown (defaults to current month, "All months" option available)
- View toggle: "By Property" (default) or "By Tenant" (sorted by last name)
- Summary cards: Expected | Total Collected | HA Collected | Tenant Collected | Outstanding
- One row per lease/charge showing HA split, tenant split, total, status
- Status badges: PAID (green), PARTIAL (orange), UNPAID (red), PENDING (gray — future months only), OVERPAID (teal)
- Auto-create next month charge on payment saved — skips if lease is expired
- Partial payment prompt: late fee field + notes before creating next month charge

---

## Financial Calculations
- Monthly expenses = `mortgage_payment` + `hoa_fee` ONLY
- `property_tax` and `insurance_premium` are display-only (PITI already in mortgage_payment)
- NOI = Gross Income - Operating Expenses (excl. mortgage)
- Cash Flow = Gross Income - All Expenses (incl. mortgage)
- Portfolio Equity = estimated_value sum - mortgage balance sum

---

## Payment Enum Values
- `payment_method`: ach, credit_card, debit_card, cash, check, other, zelle, venmo
- `payment_status`: pending, completed, failed, refunded
- `paid_by`: ha, tenant (lowercase only)

---

## Users
- `jetgoodell@gmail.com` — owner (Jeff)
- `tjgoodell04@gmail.com` — Tammy (property manager, full dashboard access)
- `jgoodellhomes@gmail.com` — test tenant (portal only)

---

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL=https://propflow-coral.vercel.app`

---

## Known Issues / Watch Out
- Middleware deprecation warning — non-breaking for now
- Unit status and active lease existence can diverge — occupancy calculated from `units.status`
- Payments entered manually sometimes have charge_id: null — enforced in RecordRentPaymentModal but watch for legacy data
- 1506-1508 Estrella Avenue is a duplex — two separate leases under one property ID
- Edit forms for properties, units, tenants, leases not yet built — edit buttons are stubs
- Diona Green May 2026 rent charge is UNPAID — to be addressed

---

## Roadmap — Next Up (in order)
1. **Add/edit forms** — for properties, units, tenants, leases
2. **HA delinquency alerts** — flag when HA hasn't paid in 30+ days
3. **Automation** — auto-generate monthly charges on 1st, auto late fees after grace period, shortage carryover
4. **Profitability** — enter estimated_value and cash_invested on each property for cap rate and cash-on-cash return

---

## Completed This Session (June 17, 2026)
- Colorado eviction notice research (HB25-1240, CARES Act, JDF forms)
- Uploaded official JDF 99A, 99B, 99C forms and mapped all fields
- Built `/notices` — 3-step JDF generator with live preview and clean print window
- Added `is_cares_act` boolean to properties table, populated all 8 properties
- Added `year_built` to properties table, populated all 8 (from Larimer County Assessor)
- Identified Freddie Mac mortgages: Garfield, Medicine Bow, Killdeer
- Built `/templates` — master blank document storage with upload/view/replace/delete
- Built lease Documents section on `/leases/[id]` — per-category upload/view/delete, lead paint auto-hidden for post-1978 properties
- Created Supabase Storage buckets: `lease-documents` and `document-templates`
- Created `lease_documents` and `notices` DB tables
- Added `is_cares_act` CARES Act detection to notice generator
- Fixed print function to open clean window instead of printing full page
- Diona Green confirmed 100% HA as of June 2026
- Uploaded all 6 master template PDFs to `/templates`