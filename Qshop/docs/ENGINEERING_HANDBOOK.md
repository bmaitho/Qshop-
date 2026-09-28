# UniHive — Engineering Handbook

Last updated: 2026-09-28. If you change infrastructure, ownership, or the
deploy setup, update this file in the same PR — it goes stale fast otherwise.

## 1. What this is

UniHive (`unihive.shop`) is a student-focused marketplace: sellers list
products/services, buyers browse and check out with M-Pesa, sellers get paid
out, and there's an events/ticketing feature alongside the core marketplace.

## 2. Current status (read this before touching anything)

- **Production database is down.** The Supabase project is paused and owned
  by an account (`two23three`) that nobody on the team can currently access
  (see §5). Nothing that touches the DB works right now: sign-up, login,
  product listing, checkout, sitemap. Frontend and backend are both up and
  serving 200s, which is misleading — `/api/health` doesn't check the DB.
- **A security-fixes branch is open and unmerged**: `claude/explore-project-files-ziZKz`.
  It hardens Helmet config, masks M-Pesa credential logging, and updates
  vulnerable dependencies. `main` already has a *partial*, independently-done
  version of the logging fix — the two need reconciling before merge.
- **Only 5 of the original 11 GitHub code-scanning alerts have been reviewed
  and fixed.** Don't assume code scanning is clean.
- **M-Pesa URLs are hardcoded to production** in `backend/utils/mpesaAuth.js`
  and `backend/controllers/mpesaController.js` — there is no sandbox/production
  switch. Anyone testing payment changes needs to be aware they're pointed at
  the real Safaricom production endpoint unless this gets fixed.
- **The M-Pesa passkey has, at some point, been present in git history**
  (an old commit before secrets were untracked). Confirm whether it's been
  rotated since; if not, treat it as compromised.

## 3. Architecture

```
                       ┌─────────────────────┐
   Browser  ───────▶   │  Frontend (Vercel)   │
                       │  React + Vite SPA    │
                       └──────────┬───────────┘
                                  │ fetch/axios
                                  ▼
                       ┌─────────────────────┐
                       │  Backend (Render)     │
                       │  Express API          │
                       │  unihive-wba0.onrender.com
                       └──┬────────┬────────┬──┘
                          │        │        │
              ┌───────────┘        │        └───────────┐
              ▼                    ▼                     ▼
    ┌───────────────┐   ┌───────────────────┐  ┌──────────────────┐
    │   Supabase     │   │  Safaricom Daraja  │  │  Resend / PickUp  │
    │ Postgres+Auth  │   │  (M-Pesa STK Push) │  │  Mtaani APIs       │
    │ +Storage+RLS   │   └────────────────────┘  └────────────────────┘
    └───────────────┘
```

The frontend also talks to Supabase **directly** (via `@supabase/supabase-js`
with the anon key) for most reads/writes — the backend isn't a strict API
gateway. The backend exists specifically for things that need a secret the
browser can't hold: M-Pesa STK Push/callbacks, transactional email, the
service-role Supabase client, sitemap generation, PickUp Mtaani sync.

Row Level Security is doing the real access control — the anon key is public
by design (it's in the frontend bundle and, historically, in git). As of the
August audit, all 40 public tables had RLS enabled with policies. Verify this
again on whatever Supabase project this gets rebuilt into.

## 4. Repo layout

```
Qshop/
├── src/                    # frontend (React + Vite)
│   ├── components/         # ~65 components — pages, forms, dialogs, UI
│   ├── components/auth/    # auth flows
│   ├── components/admin/   # admin dashboard
│   ├── components/ui/      # shared/shadcn-style primitives
│   ├── context/            # React context providers (theme, etc.)
│   ├── hooks/
│   ├── Services/           # API client wrappers (mpesaService, emailApiService)
│   ├── lib/, utils/
│   └── main.jsx, App.jsx
├── backend/
│   ├── server.js           # Express app entry — CORS, Helmet, rate limits, routes
│   ├── routes/              # mpesa, email, sitemap, buyerOrders, pickupMtaani
│   ├── controllers/         # business logic per route group
│   ├── middleware/          # authMiddleware.js
│   ├── services/            # disbursementService.js (seller payouts)
│   ├── utils/                # mpesaAuth.js, secureLogger.js, emailTemplates.js,
│   │                          commissionCalculator.js
│   └── supabaseClient.js    # service-role client (backend only, never expose)
├── docs/                    # you are here
├── SECURITY_FIXES.md        # audit trail from the Aug 2026 security pass
├── vercel.json               # frontend headers, CSP, rewrites, og-image routing
└── vite.config.js
```

## 5. External services and who owns them

| Service | Purpose | Current owner | Status |
|---|---|---|---|
| GitHub (`bmaitho/Qshop-`) | source, CI, PRs | `bmaitho` | ✅ |
| Render | backend hosting (`unihive-wba0`, `qshop-mxfw`) | `bmaitho` ("Brian Maitho's Workspace") | ✅ up |
| Namecheap | `unihive.shop` domain | registrar account `mwendatulley` (Brian has login); `bmaitho` has admin rights on the domain itself | ✅ fine as-is |
| **Supabase** | **database, auth, storage** | **`two23three`** (Tulley's personal account) | ❌ **no team access, project paused, owner unreachable** |
| Vercel | frontend hosting, image previews | unconfirmed | pending verification |
| Safaricom Daraja | M-Pesa payments | phone-linked account ("Brian Nyamu"), not a Google account | — |
| Resend | transactional email | unconfirmed (only the API key is in env) | pending |
| PickUp Mtaani | delivery/pickup points | unconfirmed (only the API key is in env) | pending |

**Do not spend time trying to recover `two23three`.** The plan is to restore
a full `pg_dump` backup (taken ~Aug 10, 2026) into a fresh Supabase project
under an account the team actually controls, then repoint the app's env vars.
That work will be tracked separately; check with Brian for current status
before assuming which Supabase project is live.

## 6. Local development setup

Prerequisites: Node 22.x, npm 10.x.

```bash
git clone https://github.com/bmaitho/Qshop-.git
cd Qshop-/Qshop

# frontend
npm install
cp .env.example .env        # see §7 — ask Brian for real values
npm run dev                 # http://localhost:5173

# backend (separate terminal)
cd backend
npm install
cp .env.example .env        # see §7
npm run dev                 # http://localhost:5000, nodemon

# or run both at once from repo root:
npm run dev:all
```

There is currently no `.env.example` committed — one should be added (variable
names only, no real values) so this isn't tribal knowledge. §7 below is the
closest thing to it until that exists.

Because the database is down, none of this will actually function end-to-end
until the Supabase restore (§5) lands. Frontend will build and run; most
interactions that touch data will fail until then.

## 7. Environment variables

Frontend (`Qshop/.env`, `VITE_`-prefixed vars are exposed to the browser —
never put a secret behind `VITE_`):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (safe to expose — RLS is the real gate) |
| `VITE_API_URL` | Backend base URL |
| `VITE_MPESA_API_URL`, `VITE_MPESA_CALLBACK_URL` | frontend-side M-Pesa config |

Backend (`Qshop/backend/.env` — never commit, never expose to frontend):

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | full-access DB key — backend only, bypasses RLS |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_BUSINESS_SHORT_CODE` | Daraja API auth |
| `MPESA_B2C_INITIATOR_NAME`, `MPESA_B2C_SECURITY_CREDENTIAL`, `MPESA_B2C_CALLBACK_URL` | seller payout (B2C) config |
| `RESEND_API_KEY`, `EMAIL_FROM` | transactional email |
| `PICKUP_MTAANI_API_KEY`, `PICKUP_MTAANI_BASE_URL`, `PICKUP_MTAANI_BUSINESS_ID` | delivery integration |
| `ALLOWED_ORIGINS` | CORS allowlist |
| `APP_URL`, `BACKEND_URL`, `SELF_URL` | used for building links in emails and internal callbacks |
| `ADMIN_BACKFILL_SECRET` | protects an admin backfill endpoint — check `backend/routes` for where |
| `PORT`, `NODE_ENV` | standard |

Get real values from Brian directly — don't ask in a shared channel, and
don't paste them into commits, PR descriptions, or this doc.

## 8. Deployment

- **Frontend**: Vercel auto-deploys on push to `main` (standard Vercel Git
  integration — confirm project/team once Vercel ownership is verified).
  `vercel.json` sets response headers/CSP and rewrites (sitemap proxy to the
  backend, social-preview routes via `/api/og`).
- **Backend**: Render auto-deploys `backend/` on push to `main`. Two services
  exist (`unihive-wba0.onrender.com`, `qshop-mxfw.onrender.com`) — confirm
  with Brian which is the current production one; the other may be legacy.
- There is no staging environment. Everything pushed to `main` goes live.
  Given that, prefer PRs + review over direct pushes, especially for
  anything touching payments or auth.

## 9. Known technical debt / good first tasks for a new engineer

- Add a real `.env.example` for both frontend and backend (names only).
- Make `/api/health` actually verify a DB round-trip, so an outage like the
  current one surfaces immediately instead of silently 200-ing.
- Make the M-Pesa base URLs environment-driven (sandbox vs production)
  instead of hardcoded, so payment changes can be tested safely.
- Reconcile `main`'s partial credential-logging fix with the fuller version
  on `claude/explore-project-files-ziZKz` and get that PR merged.
- Review code-scanning alerts #1–#6 (never triaged — see §2).
- Two Render services exist; confirm and document which is authoritative,
  decommission the other if it's dead weight.

## 10. Access a new engineer needs

Ask Brian for:
- GitHub collaborator access on `bmaitho/Qshop-`
- Render access (Brian's workspace)
- A Supabase invite once the new project exists (see §5)
- `.env` values for local dev (§7)
- Vercel access once ownership is confirmed
