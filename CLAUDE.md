# Peel & Post Studio — Claude Context Document

> This file is the source of truth for ongoing development. Read it at the start of every session. Update it when features ship, decisions are made, or the backlog changes.

---

## Project Overview

A client-facing order management portal for **Peel & Post Studio**, a custom sticker printing business. Customers log in to place orders, upload artwork, review proofs, pay, and track shipments. The studio owner has a separate elevated view to manage all orders and communicate with clients.

**Live URL:** Deployed on Vercel (connected to GitHub `electricave/peel-and-post`)
**Stack:** Next.js 14 App Router · TypeScript · Supabase (Postgres + Auth + Storage) · Resend (email) · Stripe (payments)

---

## Design System

No Tailwind — inline styles only. Always use these tokens:

| Token | Value | Usage |
|---|---|---|
| `--cream` | `#F7F3EE` | Page backgrounds |
| `--cream-dark` | `#EDE7DC` | Borders, dividers |
| `--terracotta` | `#C4714A` | Primary CTA, brand accent |
| `--terracotta-pale` | `#F2E0D5` | Light terracotta bg |
| `--brown` | `#4A3728` | Primary text |
| `--brown-mid` | `#7A5C48` | Secondary text |
| `--brown-light` | `#A8896E` | Muted text, labels |
| `--sage` | `#7A8C6E` | Success states |
| `--sage-pale` | `#E8EDE4` | Light sage bg |
| `--gold` | `#C9A84C` | Highlights, badges |
| `--white` | `#FFFFFF` | Card backgrounds |

**Fonts:** `Playfair Display` (headings/serifs) · `Lato` (body/UI)

---

## Auth & Roles

- **Supabase Auth** with email/password
- Two roles stored in `profiles.role`: `'studio'` | `'customer'`
- Studio users access `/studio` and see all orders; redirected from `/dashboard`
- Customers access `/dashboard` and see only their own orders
- RLS helper function: `public.is_studio()` — used in all policies that restrict to studio role

---

## Order Statuses (in lifecycle order)

```
pending → artwork_needed → in_review → proof_sent → proof_approved → paid → in_production → shipped → delivered
(cancelled — available at any stage)
```

The DB constraint `orders_status_check` enforces this list. **If you add a new status, update the constraint too.**

---

## Key Files

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx               # Login + signup (combined toggle)
│   │   ├── forgot-password/page.tsx     # Email entry → sends reset link
│   │   └── reset-password/page.tsx      # PKCE callback + new password form
│   ├── dashboard/page.tsx               # Customer home
│   ├── orders/
│   │   ├── page.tsx                     # Orders list (tabs: active / past)
│   │   ├── [id]/invoice/page.tsx        # Customer invoice page
│   │   └── success/page.tsx             # Post-Stripe redirect confirmation
│   ├── studio/
│   │   ├── page.tsx                     # Studio order management view
│   │   └── analytics/
│   │       ├── page.tsx                 # Server component — queries Supabase directly
│   │       └── AnalyticsClient.tsx      # Pure SVG charts (BarChart, HorizontalBar, StatCard)
│   ├── messages/page.tsx                # Realtime chat
│   └── api/
│       ├── orders/route.ts              # CRUD for orders
│       ├── proofs/route.ts              # GET (list) · POST (studio upload) · PATCH (approve/revise)
│       ├── checkout/route.ts            # Stripe checkout session
│       ├── webhooks/stripe/route.ts     # Stripe webhook → sets status to 'paid'
│       ├── notifications/route.ts       # In-app notifications
│       └── analytics/route.ts           # Studio-only order aggregation (kept as fallback)
├── components/
│   ├── layout/Sidebar.tsx               # Navigation sidebar (studio + customer)
│   ├── orders/
│   │   ├── OrderCard.tsx                # Collapsible order card (shared, isStudio flag)
│   │   ├── ArtworkUploader.tsx          # Customer artwork upload (drag + drop)
│   │   ├── NewOrderModal.tsx            # New order form
│   │   └── InvoiceView.tsx              # Invoice layout component
│   └── ui/                              # Shared UI primitives
├── lib/
│   ├── email.ts                         # sendStatusEmail() via Resend
│   ├── queries.ts                       # Supabase DB queries
│   └── supabase/                        # client.ts + server.ts
├── hooks/useRealtime.ts                 # Live message subscription
└── types/index.ts                       # Shared TypeScript types

supabase/migrations/
├── 001_initial_schema.sql
├── 002_paid_status_constraint.sql       # Adds 'paid' to orders_status_check
└── (003 reserved — reverted)

peel-and-post-project-brief-updated.docx  # Visual project brief (update each session)
CLAUDE.md                                  # This file
```

---

## Email — Resend

- Sender configured via `EMAIL_FROM` env var
- `sendStatusEmail(type, order, customer)` in `src/lib/email.ts`
- Triggers on: `proof_sent`, `proof_approved`, `revision_requested`, order status changes
- **Note:** Resend free tier with `onboarding@resend.dev` sender only delivers to the account's verified email. To send to customers, add a custom sending domain in Resend dashboard.
- Errors are swallowed silently — check Resend logs if emails aren't arriving

---

## Stripe

- Checkout triggered from `OrderCard` when `status === 'proof_approved'`
- Webhook at `/api/webhooks/stripe` sets `status = 'paid'` and records `paid_at`
- Webhook secret: `STRIPE_WEBHOOK_SECRET` env var (set in Vercel)
- After payment, customer is redirected to `/orders/success?session_id=...`
- Success page uses `<a href="/orders">` (not `<Link>`) to force a hard reload and clear stale cache

---

## Supabase Storage

- Bucket: `artwork` — customer artwork uploads (path: `userId/orderId/filename`)
- Bucket: `proofs` — studio proof uploads (path: `orderId/filename`)
- Signed URLs used for downloads (60s expiry)

---

## Completed Features (Phase 1)

| # | Feature | Notes |
|---|---|---|
| F1 | Customer login / signup | Combined toggle on `/auth/login` |
| F2 | Place new orders | `NewOrderModal` with product/spec fields |
| F3 | Order cards + status tracking | Collapsible `OrderCard`, `StatusPill` |
| F4 | Realtime messaging | `useRealtime` hook, Supabase subscriptions |
| F5 | Stripe payment on proof approval | Checkout + webhook + success page |
| F6 | Customer invoice page | `/orders/[id]/invoice` |
| F7 | Automated status emails | Resend integration via `sendStatusEmail()` |

---

## Backlog — Discovered During Phase 1

These features were identified during Phase 1 development and should be addressed before or during Phase 2.

- [x] **Forgot password** — Implemented. Link on login page → `/auth/forgot-password` (email entry) → `/auth/reset-password` (PKCE token callback + new password form). Uses `supabase.auth.resetPasswordForEmail()` and `onAuthStateChange('PASSWORD_RECOVERY')`.
- [x] **Remove redundant `+ Upload Files` button** — Removed from `ArtworkUploader.tsx` header. Drop zone handles file selection.
- [x] **Studio proof upload UI** — Drop zone added to `OrderCard` (studio only, hidden for shipped/delivered/cancelled). Uploads to `proofs` Supabase Storage bucket then calls `POST /api/proofs`. Customer notified via in-app notification + email on upload.
- [x] **Test email system end-to-end** — Verified working. Supabase auth emails (password reset) now route through Resend SMTP (`smtp.resend.com`, port 465, sender "Peel & Post Studio"). PKCE race condition fixed in `reset-password/page.tsx` — code is exchanged explicitly from URL params rather than relying on `onAuthStateChange` alone. Redirect URL allowlist corrected (was double-concatenated from a previous session).

---

## Phase 2 — Completed

| # | Feature | Notes |
|---|---|---|
| F1 | Reorder button | Customer-facing. Shown on shipped/delivered/cancelled orders. Pre-fills `NewOrderModal` at review step via `reorderFrom` prop + `orderToState()` helper. Zero DB changes. |
| F2 | Shipment tracking | Studio intercepts "shipped" status change with a tracking number modal. Customer `OrderCard` shows "Track Shipment" link with regex-based carrier detection (UPS/FedEx/USPS/DHL/parcelsapp fallback). |
| F3 | Studio analytics dashboard | `/studio/analytics` — server-side Supabase aggregation (no HTTP self-fetch). Stat cards + pure SVG bar charts for orders/revenue over 6 months, horizontal bars for status and product breakdown. |
| F4 | Bulk order management | Checkboxes on studio orders table with select-all (indeterminate state). Bulk actions bar: set status (parallel API calls) + Export CSV. Selected rows highlighted terracotta-pale. |

---

## Technical Decisions & Gotchas

- **`<Link>` vs `<a>`** — Use plain `<a>` for post-payment redirects to force a full reload. Next.js `<Link>` serves cached page data which can show stale order status.
- **`orders_status_check` constraint** — Must include every valid status string. The webhook silently failed for months because `'paid'` was missing. Fixed in migration `002`.
- **Studio auth check pattern** — In API routes, always check role via `profiles.role` from Supabase, not just `auth.getUser()`. Example in `api/proofs/route.ts`.
- **Git email** — Commits from the Claude sandbox use a placeholder identity. Always amend with `git commit --amend --reset-author --no-edit` before pushing to avoid GitHub's email privacy block. Git is configured globally with `56715486+electricave@users.noreply.github.com`.
- **Supabase SQL editor** — Monaco editor can mangle special characters in `CREATE POLICY` statements. If you get syntax errors on policy names, use unquoted snake_case names or set content via the Monaco JS API.
