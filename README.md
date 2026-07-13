# MDM Inks · Sales CRM

A modern, multi-user sales-tracker CRM built with **Vite + React + Supabase**, deployable to **Vercel**.

- 🔐 Supabase Auth (email/password) with **role-based access** — `admin` sees every rep; `rep` sees only their own data (enforced by Postgres Row Level Security).
- 📊 Live dashboard — KPIs, **monthly target rings**, **task widget**, status doughnut, today's visits, follow-up radar.
- 📋 Visit Log — search, status/rep/date filters, CSV export, inline CRUD.
- 👥 Client directory + **Client 360** — per-client timeline, lifetime value, one-tap **Call / WhatsApp / SMS / Directions**.
- 🗂️ **Deal Pipeline** — Kanban across Lead → Quoted → Negotiation → Won → Lost.
- 🧾 **Quotations** — build a quote with line items from the catalog, live totals, then export a **branded PDF** or **share on WhatsApp** (attaches the PDF on mobile).
- ✅ **Tasks & reminders** — priorities, due dates, overdue flags.
- 📦 **Product catalog** — items, SKUs, pricing.
- 🎯 **Targets/Goals** — monthly visit + revenue goals with progress rings.
- 🧠 **Smart priorities** — rule-based lead scoring + "next best action" per client (no LLM, no key).
- 🎙️ **Voice-to-note** — dictate visit notes with the browser Speech API.
- 🗺️ **Client map** — Leaflet + free OpenStreetMap, addresses geocoded via Nominatim (no key).
- 🔔 **Web Push** — installable notifications via free VAPID keys + a Supabase Edge Function.
- 📅 Monthly Summary — visits & revenue charts, conversion table.
- 🏆 Team leaderboard (admin) — reps ranked by revenue & volume.
- 📱 **Mobile-first PWA** — installable, offline shell, bottom tab bar + quick-add FAB.
- ⚡ Realtime — tables update instantly across sessions via Supabase channels.

---

## 1. Prerequisites

- Node 18+
- A free [Supabase](https://supabase.com) project

## 2. Set up the database

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste [`supabase/schema.sql`](supabase/schema.sql) and **Run** — creates `profiles`, `clients`, `visits`, the signup trigger, and RLS.
3. Then run [`supabase/schema_v2.sql`](supabase/schema_v2.sql) — adds `products`, `deals`, `tasks`, `targets`, their RLS, and enables realtime on every table.
4. Then run [`supabase/schema_v3.sql`](supabase/schema_v3.sql) — adds the `quotes` table for Quotations.
5. Then run [`supabase/schema_v4.sql`](supabase/schema_v4.sql) — adds `lat`/`lng` to clients (Map view).
6. Then run [`supabase/schema_v5.sql`](supabase/schema_v5.sql) — adds `push_subscriptions` (Web Push).

> The app runs without steps 3–6, but those features stay empty/disabled until the tables exist.

### Enabling Web Push (optional)

1. Generate keys once: `npx web-push generate-vapid-keys` (or use ones you already have).
2. Put the **public** key in `.env` → `VITE_VAPID_PUBLIC_KEY=...`.
3. Deploy the sender: `supabase functions deploy send-push`.
4. Set secrets (the **private** key lives here, never in the repo):
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT="mailto:you@example.com"
   ```
5. In the app → **Settings → Push Notifications → Enable**.
6. **Automated daily reminders** — run [`supabase/schema_v6.sql`](supabase/schema_v6.sql). It uses `pg_cron` + `pg_net` to call `send-push` every morning (02:30 UTC / 08:00 IST) for each rep who has a follow-up or task due that day. Two one-time steps inside that file:
   - Store your **project URL** and **service_role key** in Supabase **Vault** (the two `vault.create_secret(...)` lines — run them with your own service_role key; it never goes in the repo).
   - The schedule installs itself. Test now with `select public.notify_due_followups();`.

### Enabling AI Assist (optional, free)

Client 360 → **AI Assist** ("Summarize relationship", "Draft follow-up") runs through a Supabase Edge Function backed by **Groq's free tier** — the key stays server-side, never in the browser.

1. Get a free key at <https://console.groq.com/keys> (starts with `gsk_`).
2. Deploy: `supabase functions deploy ai` (or paste [`ai/index.ts`](supabase/functions/ai/index.ts) into the dashboard editor).
3. Set the secret: `supabase secrets set GROQ_API_KEY=<gsk_...>` (optionally `GROQ_MODEL=llama-3.3-70b-versatile`).

Until that's set, the AI buttons show a "not configured" hint — nothing else breaks. Groq speaks the OpenAI chat format, so you can point it at any OpenAI-compatible provider by changing the one `fetch` URL.

### Admin console (create & manage salespeople)

Admins get a **Team & Users** page (`/admin/users`) to create reps, set their monthly targets, toggle role/active, and open a per-rep **Report** (`/admin/reps/:id`) with target progress and a daily activity breakdown.

1. Run [`supabase/schema_v7.sql`](supabase/schema_v7.sql) — adds `profiles.active` and lets admins set targets for any rep.
2. Run [`supabase/schema_v8.sql`](supabase/schema_v8.sql) — **security hardening**: a trigger that blocks reps from changing their own `role`/`active` (self-promotion). Admins, the service key, and the SQL editor are unaffected.
3. Deploy the account-creator: `supabase functions deploy admin-users` (it verifies the caller is an admin, then uses the auto-injected service key to create the login).
4. Promote your first admin:
   ```sql
   update public.profiles set role = 'admin' where lower(email) = 'you@example.com';
   ```

Without step 1–2 the console still opens for admins (view users & reports, set your own target); creating users, deactivating, and setting other reps' targets need them. Deactivated users are signed out automatically.

## 3. Configure environment

```bash
cp .env.example .env
```

Fill in from **Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173, click **Sign up**, create your account.

> **Email confirmation:** by default Supabase requires email confirmation. For quick local testing, turn it off under **Authentication → Providers → Email → "Confirm email" (off)**, or confirm via the link Supabase emails.

## 5. Make yourself an admin

After signing up once, run this in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Refresh the app — you'll see the **Team** tab and all reps' data. Every other user stays a `rep` and sees only their own visits/clients.

## 6. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In [Vercel](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset: **Vite** (auto-detected). Build: `npm run build`, Output: `dist`.
4. Add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) under **Settings → Environment Variables**.
5. **Deploy.** `vercel.json` already handles SPA routing.
6. Add your Vercel URL to **Supabase → Authentication → URL Configuration → Site URL / Redirect URLs**.

Or via CLI:

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

---

## Architecture

```
src/
├── context/
│   ├── AuthContext.jsx   # session + profile/role
│   └── DataContext.jsx   # shared live visits/clients + CRUD + modal state
├── hooks/
│   ├── useCollection.js  # generic table hook w/ realtime
│   └── useProfiles.js
├── components/           # Sidebar, BottomNav, Modals, ContactActions, ProgressRing…
├── pages/                # Login, Dashboard, Visits, Clients, ClientDetail,
│                         # Pipeline, Tasks, Products, Monthly, Team, Settings, More
└── lib/                  # supabase client + formatters
public/                   # PWA manifest, service worker, icon
```

**Roles → dashboards:** RLS is the single source of truth. A `rep` query returns only `owner_id = auth.uid()`; an `admin` query returns everything. The same React components render both — the data scope differs, not the code. Adding a salesperson is just a new sign-up (no redeploy).

## White-labeling

Brand tokens live in [`tailwind.config.js`](tailwind.config.js) (`brand`, `accent` palettes) and the logo/name in `Sidebar.jsx` / `Login.jsx`. Swap those to re-skin. Full multi-tenant white-label (one deployment, many branded orgs) is Phase 3 below — an `organizations` table + runtime CSS-variable theming.

---

## Product roadmap (to sell as a SaaS)

**✅ Phase 1 — shipped (no external services needed)**
Client 360 · Call/WhatsApp/SMS/Directions · Deal Pipeline · Tasks & reminders · Product catalog · Targets/goals with progress rings · Settings · Mobile bottom-nav + quick-add FAB · installable PWA + offline shell.

**✅ Phase 2 (started) — Quotations shipped**
Quote builder (catalog line items, tax/discount, live totals) → **branded PDF** (jsPDF, lazy-loaded) + **WhatsApp share** (Web Share API attaches the PDF on mobile; desktop downloads + opens WhatsApp with a summary). Edit the seller/brand block in [`src/lib/pdf.js`](src/lib/pdf.js).

**✅ Phase 2b — shipped, all free (no paid keys)**
Smart lead scoring + next-best-action (rule-based) · Voice-to-note (Web Speech API) · Client map (Leaflet + OpenStreetMap + Nominatim) · Web Push (free VAPID + Supabase Edge Function).

**✅ Phase 2c — shipped, free**
AI Assist on Client 360 (relationship summary + drafted follow-up) via a Supabase Edge Function on **Groq's free tier** — key stays server-side, degrades gracefully when unset.

**✅ Phase 2d — shipped, free**
Automated daily "follow-ups due today" push via `pg_cron` + `pg_net` → `send-push` ([`schema_v6.sql`](supabase/schema_v6.sql)).

**⏳ Remaining — genuinely needs a paid/approved service**
| Feature | Requires |
|---|---|
| WhatsApp Business messaging + logging | Meta WhatsApp Business API (wa.me click-to-chat already works, free) |

**🔭 Phase 3 — platform / commercial**
Multi-tenant **white-label** (org branding at runtime) · custom fields per org · billing (Stripe) · territories & lead assignment · approvals · commission tracking · activity audit log.

> Phase 2/3 items need credentials you provision (and, for AI/WhatsApp, a small serverless backend — Supabase Edge Functions or Vercel Functions). Say the word and I'll wire any of them once the key is in place.
