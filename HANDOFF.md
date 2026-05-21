# PropFlow — Complete Handoff Summary
*Updated May 20, 2026*

---

## Stack & Access
- Next.js + Supabase + Tailwind CSS + Vercel
- Live: `https://propflow-coral.vercel.app`
- Local: `C:\Users\jetgo\propflow` — `npm run dev` in VS Code CMD terminal
- GitHub: `github.com/jetg00dell/Propflow`
- Supabase: `https://supabase.com/dashboard/project/cefwvcyeriiwipyagrbb`
- Email: Resend from `noreply@jgoodellhomes.com`
- Claude Code: run `claude` in PowerShell from project folder

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

---

## Database Tables
- `properties`: id, name, address, city, state, property_type, status, mortgage_payment, mortgage_balance, mortgage_rate, mortgage_balance_date, insurance_premium, property_tax, hoa_fee, insurance_policy, insurance_expiry, electric/gas/water/sewer/trash provider+paid_by+account, estimated_value, purchase_price, cash_invested, last_value_update, mortgage_lender
- `units`: id, property_id, unit_number, status, bedrooms, bathrooms, sq_ft, market_rent
- `tenants`: id, first_name, last_name, email, phone, employer, monthly_income, credit_score, emergency_contact_name, emergency_contact_phone
- `leases`: id, unit_id, status, start_date, end_date, monthly_rent, security_deposit, late_fee_flat, late_fee_pct, grace_period_days, rent_due_day, pet_rent, pet_deposit, ha_amount, tenant_amount
- `lease_tenants`: id, lease_id, tenant_id, is_primary
- `rent_charges`: id, lease_id, charge_month, total_due, ha_amount, tenant_amount, notes
- `payments`: id, lease_id, charge_id, amount, paid_by (ha/tenant), method, status, type, paid_date, notes
- `maintenance_requests`: id, unit_id, tenant_id, title, description, urgency, status, notes, photo_url, created_at, updated_at
- `expenses`: id, property_id, unit_id, vendor_id, category, description, amount, date, receipt_url, is_recurring, notes, created_at, source, csv_import_id, maintenance_request_id, payee, transaction_date, created_by
- `payee_rules`: id, payee_pattern, category, property_id, created_at
- `csv_imports`: id, filename, row_count, matched_count, review_count, imported_at, imported_by

---

## Expense Categories (full list — matches DB constraint)
rent_income, repair_maintenance, utility, mortgage, insurance, tax, advertising, management_fees, professional_fees, supplies, capital_improvement, other

---

## Properties & Ownership
| Property | City | Owner Entity | Property ID |
|---|---|---|---|
| 214 Clover Lane | Fort Collins | Individual | a1000000-0000-0000-0000-000000000001 |
| 2252 Anelda Court | Loveland | J Goodell Homes, Inc | a1000000-0000-0000-0000-000000000002 |
| 337 Garfield Avenue | Loveland | Individual | a1000000-0000-0000-0000-000000000003 |
| 317 Diamond Drive | Fort Collins | Individual | a1000000-0000-0000-0000-000000000004 |
| 1506-1508 Estrella Avenue | Loveland | 1506 Estrella, LLC | a1000000-0000-0000-0000-000000000005 |
| 8329 Medicine Bow Avenue | Fort Collins | Individual | a1000000-0000-0000-0000-000000000006 |
| 2616 Killdeer Drive | Fort Collins | Individual | a1000000-0000-0000-0000-000000000007 |
| 2025 Creekwood Drive | Fort Collins | J Goodell Homes, Inc | a1000000-0000-0000-0000-000000000008 |

---

## Active Tenants
| Name | Unit | Property | Monthly Rent | Lease ID |
|---|---|---|---|---|
| Christina Bachman | 1506 | 1506-1508 Estrella Avenue | $2,320 | d1000000-0000-0000-0000-000000000005 |
| Forest Mangus | 1508 | 1506-1508 Estrella Avenue | $2,210 | d1000000-0000-0000-0000-000000000006 |
| Darius Bell | Main | 2025 Creekwood Drive | $2,340 | d1000000-0000-0000-0000-000000000007 |
| Celia Bell | Main | 2025 Creekwood Drive | $2,340 | d1000000-0000-0000-0000-000000000007 |
| James Bostron | Main | 2252 Anelda Court | $1,955 | d1000000-0000-0000-0000-000000000008 |
| Lizzy Rendon | Main | 2252 Anelda Court | $1,955 | d1000000-0000-0000-0000-000000000008 |
| Sherry Garcia | ADU | 2252 Anelda Court | $1,801 | d1000000-0000-0000-0000-000000000009 |
| Ryan Miller | ADU | 2616 Killdeer Drive | $1,692 | d1000000-0000-0000-0000-000000000010 |
| Moses Brown | Main | 8329 Medicine Bow Avenue | $2,730 | d1000000-0000-0000-0000-000000000011 |
| Amanda Goodell | Main | 317 Diamond Drive | $1,745 | d1000000-0000-0000-0000-000000000001 |
| Conor O'Shea | Main | 317 Diamond Drive | $1,745 | d1000000-0000-0000-0000-000000000001 |
| Andrew Marshall | ADU | 317 Diamond Drive | $1,355 | d1000000-0000-0000-0000-000000000002 |
| Susan Rutledge | ADU | 317 Diamond Drive | $1,355 | d1000000-0000-0000-0000-000000000002 |
| Rachel Sullivan | 337 | 337 Garfield Avenue | $2,679 | d1000000-0000-0000-0000-000000000003 |
| Diona Green | 339 | 337 Garfield Avenue | $1,780 | d1000000-0000-0000-0000-000000000004 |

---

## Pages Built
- `/dashboard` — stats, occupancy, expiring leases, maintenance
- `/properties` — property grid
- `/properties/[id]` — detail with units, utilities, financial metrics
- `/tenants` — sortable/searchable list
- `/tenants/[id]` — tenant detail
- `/leases` — lease list with expiring alerts
- `/leases/[id]` — lease detail
- `/payments` — rent charges + payments with HA/tenant split, month filter, expandable rows, edit/delete
- `/financials` — per-property with amortization, portfolio value, equity
- `/expenses` — PDF bank statement import, manual add, edit, delete, CSV export, filters, maintenance linking, duplicate detection
- `/maintenance` — filterable, new request, linked expenses rollup per request
- `/reports` — per-property NOI, cash flow, cap rate
- `/reports/cpa` — CPA report with income/expenses/net by property, ownership groups, year filter
- `/portal` — tenant-facing portal
- `/login` + `/reset-password` — Buildium themed

---

## Key API Routes
- `POST /api/parse-statement` — upload Wells Fargo PDF, returns categorized transactions with tenant + property matching
- `POST /api/save-statement` — saves categorized transactions to expenses table, returns rent deposits for manual entry
- `GET /api/expenses` — fetch all expenses
- `POST /api/expenses` — create manual expense
- `PATCH /api/expenses` — edit expense
- `DELETE /api/expenses` — delete expense
- `POST /api/expenses/check-duplicate` — check for duplicate expenses by amount/date/property
- `GET /api/maintenance-requests` — fetch open/in-progress maintenance requests for linking
- `GET /api/reports/cpa?year=YYYY` — CPA report data with optional year filter
- `POST /api/maintenance` — create maintenance request + send emails
- `PATCH /api/maintenance/[id]` — update status + send tenant email
- `POST /api/payments` — create payment
- `PATCH /api/payments/[id]` — edit payment
- `DELETE /api/payments/[id]` — delete payment
- `PATCH /api/rent-charges/[id]` — edit rent charge
- `DELETE /api/rent-charges/[id]` — delete rent charge

---

## Key Files
- `src/components/Dashboard.tsx` — sidebar layout wrapper
- `src/components/DashboardHome.tsx` — dashboard home content
- `src/app/(dashboard)/expenses/page.tsx` — full expense tracking page (client component, ~1200 lines)
- `src/app/(dashboard)/reports/cpa/page.tsx` — CPA report page
- `src/app/(dashboard)/maintenance/MaintenanceClient.tsx` — maintenance UI with linked expenses
- `src/app/payments/PaymentsClient.tsx` — payments UI (712 lines)
- `src/app/payments/page.tsx` — payments server component
- `src/lib/amortization.ts` — mortgage balance calculator
- `src/middleware.ts` — tenant vs owner routing

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
- All seeded demo data uses UUIDs starting with `b1000000...` (units) and `d1000000...` (leases)
- Ivan Noriega — previous tenant at 1508 Estrella, expired lease ID: `5059f74a-329b-4ad7-82b8-9c63c15919ea`
- Wells Fargo business checking account for 1506 Estrella LLC — account 3208998413
- 1506-1508 Estrella Avenue is a duplex — two separate leases (Christina Bachman unit 1506, Forest Mangus unit 1508) under one property ID
- Payments entered manually sometimes have charge_id: null — need to enforce charge linking in RecordPaymentModal

---

## Expense Import Workflow (how it works today)
1. Tammy uploads Wells Fargo PDF at `/expenses`
2. Claude reads and categorizes all transactions
3. Review queue shows deposits and any low-confidence withdrawals
4. Withdrawals save to `expenses` table with property/category
5. Deposits show in amber box on done screen — Tammy enters these manually in `/payments`
6. Duplicate detection warns on manual add, edit, and import if same amount/property/date exists

---

## Roadmap — Next Up (in order)
1. **Payments page fixes** — auto-create rent charge when payment entered for month with no charge; enforce charge_id linking in RecordPaymentModal
2. **Document uploads** — lease docs, security deposit check images on lease detail page
3. **Add/edit forms** — for properties, units, tenants, leases
4. **Colorado notice forms + Section 8 eviction rules** — before building delinquency notice generator
5. **Automation** — auto-generate monthly charges on 1st, auto late fees after grace period, shortage carryover
6. **Profitability** — enter estimated_value and cash_invested on each property for cap rate and cash-on-cash return

## Completed This Session
- Full expense tracking module (PDF import, Claude categorization, tenant/property matching, review queue)
- Manual Add Expense form with maintenance request linking
- Edit + delete on all expenses
- CSV export of filtered expenses
- Linked expenses rollup on maintenance request detail
- CPA report with ownership groups and year filter
- Schedule E expense categories (advertising, management fees, professional fees, supplies)
- Duplicate expense detection on import, manual add, and edit
- Sidebar added to expenses and CPA report pages
- Expense import simplified — rent deposits shown as read-only checklist, entered manually in Payments
