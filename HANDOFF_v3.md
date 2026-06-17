# PropFlow — Complete Handoff Summary
*Updated June 16, 2026*

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

---

## Database Tables
- `properties`: id, name, address, city, state, property_type, status, mortgage_payment, mortgage_balance, mortgage_rate, mortgage_balance_date, insurance_premium, property_tax, hoa_fee, insurance_policy, insurance_expiry, electric/gas/water/sewer/trash provider+paid_by+account, estimated_value, purchase_price, cash_invested, last_value_update, mortgage_lender
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

---

## Expense Categories
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
- Diona Green (Garfield 339): HA pays $1,652, tenant pays $128
- Rachel Sullivan (Garfield 337): HA pays $2,679, tenant pays $0 — 100% HA

---

## Payment Notes
- James Bostron: Jan 2026 HA portion ($266) never paid — tracked as outstanding
- Ryan Miller: 100% HA paid, tenant pays nothing
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
- `/leases/[id]` — lease detail
- `/payments` — rent charges + payments with HA/tenant split, month filter, by-property/by-tenant toggle, overpayment indicator, future months show as PENDING, auto-create next month charge on payment, partial payment prompt with late fee + notes
- `/financials` — per-property with amortization, portfolio value, equity
- `/expenses` — PDF bank statement import, manual add, edit, delete, CSV export, filters, maintenance linking, duplicate detection, deposit → payment recording flow
- `/maintenance` — filterable, new request, linked expenses rollup per request
- `/reports` — per-property NOI, cash flow, cap rate
- `/reports/cpa` — CPA report with income/expenses/net by property, ownership groups, year filter
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

---

## Key Files
- `src/components/Dashboard.tsx` — sidebar layout wrapper
- `src/components/DashboardHome.tsx` — dashboard home content
- `src/components/RecordRentPaymentModal.tsx` — unified payment modal (charge-row, standalone, and prefilled/deposit modes), includes two-step next month charge prompt
- `src/app/(dashboard)/expenses/page.tsx` — full expense tracking page (~1200 lines), includes deposit → payment flow
- `src/app/(dashboard)/reports/cpa/page.tsx` — CPA report page
- `src/app/(dashboard)/maintenance/MaintenanceClient.tsx` — maintenance UI
- `src/app/payments/PaymentsClient.tsx` — payments UI with by-property/by-tenant toggle
- `src/app/payments/page.tsx` — payments server component
- `src/lib/amortization.ts` — mortgage balance calculator
- `src/middleware.ts` — tenant vs owner routing

---

## Payments Tab — How It Works
- Month filter dropdown (defaults to current month, "All months" option available)
- View toggle: "By Property" (default) or "By Tenant" (sorted by last name)
- Summary cards: Expected | Total Collected | HA Collected | Tenant Collected | Outstanding
- One row per lease/charge showing HA split, tenant split, total, status
- Status badges: PAID (green), PARTIAL (orange), UNPAID (red), PENDING (gray — future months only), OVERPAID (teal)
- Auto-create next month charge on payment saved — skips if lease is expired
- Partial payment prompt: late fee field + notes before creating next month charge
- Unified RecordRentPaymentModal used everywhere

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

---

## Roadmap — Next Up (in order)
1. **Colorado notice forms + Section 8 eviction rules** — before building delinquency notice generator
2. **Document uploads** — lease docs, security deposit check images on lease detail page
3. **Add/edit forms** — for properties, units, tenants, leases
4. **HA delinquency alerts** — flag when HA hasn't paid in 30+ days
5. **Automation** — auto-generate monthly charges on 1st, auto late fees after grace period, shortage carryover
6. **Profitability** — enter estimated_value and cash_invested on each property for cap rate and cash-on-cash return

---

## Completed This Session (June 16, 2026)
- Payments tab rebuilt with clean month-by-month flow
- Auto-create next month charge on payment (skips expired leases)
- Partial payment prompt with late fee + notes → rolls into next month charge
- Unified RecordRentPaymentModal used in all three contexts (charge row, standalone, PDF deposit)
- By-property / by-tenant view toggle
- Overpayment indicator (OVERPAID badge)
- Future month charges show as PENDING not UNPAID
- Travis & Kristina Slack added to DB (Killdeer Main, Jan 2026, expired)
- Killdeer Main marked vacant
- Data fixes: James Bostron charge corrected, Ryan Miller 100% HA, Diamond ADU rent corrected to $650
- HANDOFF updated: ha_amount/tenant_amount on rent_charges not leases