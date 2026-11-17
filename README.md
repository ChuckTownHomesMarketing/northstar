# Northstar

Marketing operations for [ChuckTown Homes](https://chucktownhomes.com), the residential team with LPT Realty. Avery French and the marketing VAs use it for the week’s numbers, spend, content, tasks, and the weekly report.

Northstar covers eight markets: Charleston, Columbia, Greenville, Charlotte, Savannah, Jacksonville, and Atlanta (the offices on chucktownhomes.com), plus Chattanooga, which opens the week of November 16, 2026.

## Stack

Next.js (App Router), TypeScript, Prisma, and Postgres. One Node app serves the pages and the saves, which is the shape a small marketing team can keep running. Prisma migrations are the schema history. Auth.js checks Google sign-in. Heroku runs the same Node process and attaches Heroku Postgres.

The calculation rules (cost per lead, cost per appointment, month-over-month, CSV parsing, the email report) live in `src/lib` and do not depend on the database, so they can be tested on their own.

## Local setup

Requirements: Node 22 and Postgres.

```bash
createdb northstar   # or use the Docker/Postgres you already have
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — local Postgres URL
- `AUTH_SECRET` — `openssl rand -base64 32`
- `BOOTSTRAP_ADMIN_EMAIL` — Avery’s real `@chucktownhomes.com` Google address
- `ENABLE_DEV_LOGIN=true` — local only, so you can click through before Google is configured
- `SEED_DEMO_DATA=false` unless you want the tagged sample numbers

```bash
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000. With dev login on, the sign-in page lists people already on the allowlist. `npm start` is production mode and will not offer that button.

```bash
npm test
npm run lint
```

## Google sign-in

Production sign-in is Google only.

1. In Google Cloud Console, create an OAuth client of type **Web application**.
2. If ChuckTown uses Google Workspace, set the consent screen to **Internal**.
3. Authorized redirect URI:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-heroku-app>.herokuapp.com/api/auth/callback/google`
4. Put the client id and secret in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
5. Set `AUTH_URL` to the public origin (`http://localhost:3000` or the Heroku URL).
6. Set `AUTH_SECRET` and `ALLOWED_EMAIL_DOMAIN=chucktownhomes.com`.

Google’s `hd` hint is not the security check. Northstar only creates a session when the Google account has a verified email on `@chucktownhomes.com` **and** that email is an active row on the allowlist. Anyone else is sent back to the sign-in page.

`ENABLE_DEV_LOGIN` is ignored when `NODE_ENV=production`, which is every Heroku dyno. Leave it `false` there.

## Heroku

This repo includes a `Procfile` and `app.json`. The Postgres addon is `heroku-postgresql:essential-0`. The release phase runs `prisma migrate deploy`.

```bash
heroku create northstar-chucktown --stack heroku-24
heroku addons:create heroku-postgresql:essential-0
heroku config:set \
  AUTH_SECRET="$(openssl rand -base64 32)" \
  AUTH_GOOGLE_ID="..." \
  AUTH_GOOGLE_SECRET="..." \
  AUTH_URL="https://<app>.herokuapp.com" \
  AUTH_TRUST_HOST="true" \
  ALLOWED_EMAIL_DOMAIN="chucktownhomes.com" \
  BOOTSTRAP_ADMIN_EMAIL="avery@chucktownhomes.com" \
  BOOTSTRAP_ADMIN_NAME="Avery French" \
  SEED_DEMO_DATA="false" \
  ENABLE_DEV_LOGIN="false"
git push heroku main
heroku run npm run db:seed
```

`BOOTSTRAP_ADMIN_EMAIL` must be Avery’s real Workspace mailbox. The value above is a placeholder until that address is confirmed. The seed creates her as Admin and does not overwrite her name or role on later deploys.

Config vars:

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Set by the Postgres addon |
| `AUTH_SECRET` | Signs the session cookie |
| `AUTH_GOOGLE_ID` | Google OAuth client id |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_URL` | Public URL of this app |
| `AUTH_TRUST_HOST` | `true` behind Heroku’s proxy |
| `ALLOWED_EMAIL_DOMAIN` | `chucktownhomes.com` |
| `BOOTSTRAP_ADMIN_EMAIL` | First admin, seeded once |
| `BOOTSTRAP_ADMIN_NAME` | Defaults to Avery French |
| `SEED_DEMO_DATA` | Keep `false` in production |
| `ENABLE_DEV_LOGIN` | Keep `false` in production |

A review app defined by `app.json` runs migrations and the seed after deploy.

## How to add a VA

1. Avery signs in.
2. Settings → People → add the name, the `@chucktownhomes.com` email, and the role **VA** (or Admin).
3. That person signs in with Google. Until the email is on the list, Google will not let them in.
4. To remove access, clear **Can sign in**. Their tasks and content stay. Northstar will not turn off the last real admin.

## Sample data

Sample rows are optional and tagged. A banner stays up while any of them exist: they are not ChuckTown performance. Load or wipe them in Settings → Sample data. Loading will not overwrite a real KPI or spend row. Wiping removes only rows marked sample, including the Sample VA. Notes you save on a weekly report are kept.

Do not set `SEED_DEMO_DATA=true` on Heroku.

## Markets

Seeded from the public office list, and editable in Settings:

- Charleston, SC — 1104 Savannah Hwy, Suite 200
- Columbia, SC — 190 Knox Abbott Drive, Cayce
- Greenville, SC — 777 Lowndes Hill Rd
- Charlotte, NC — 3701 Arco Corporate Dr, Suite 350
- Savannah, GA — 406 E US Highway 80, Bloomingdale
- Jacksonville, FL — 9995 Gate Parkway, Suite 110
- Atlanta, GA — 4550 Northpoint Parkway, Suite 130, Alpharetta
- Chattanooga, TN — opens the week of November 16, 2026; no street address published yet

The app clock is America/New_York. Weeks start on Monday.

## ChuckTown Connect

Northstar does not change [ChuckTown Connect](https://connect.chucktownhomes.com) (`ChuckTownHomesMarketing/chucktownconnect`). Connect can link to Northstar. Adding `?embed=1` keeps a compact top bar so the app can sit in an iframe later. A signed handoff from Connect is stubbed in `src/lib/connect.ts` and currently accepts nothing; people still sign in with Google.

## Later integrations

`src/lib/integrations` describes Meta Ads, Google Ads, GA4, and a CRM. Settings shows each one as **Not connected**. v1 does not call those APIs and does not invent their numbers. When a feed exists, write normalized rows into the spend and KPI tables with origin `INTEGRATION`.

The marketing bot team (Social Media Manager, Content & SEO Writer, Ads & Analytics, Market Researcher, Reviews & Reputation, and Byte) is a set of editable records on the home page. They describe who to ask. They are not live model calls yet.

## Visual design

The app is a matte-black workspace. A faint starfield sits behind the pages and stays still when reduced motion is on. The Northstar wordmark is centered, widely tracked, and tinted with the logo’s lavender and peach. The mark is an SVG shield with an upward arrow and a peach star (`public/northstar-logo.png` is the reference). Navigation is a floating icon rail with tooltips. Marketing health on the Marketing overview scores only dimensions that have real numbers for the current month. Targets are per market for counts and a single number for cost per lead, rating, and percents. Admins edit them under Settings → Marketing health targets.

## Version 2

My Day is the home page. Marketing and Product ordering are modules an admin can turn off. Apps and API tokens live beside them.

### Lead reporting

`/leads` shows volume, cost, cost per lead, appointment rate, and conversion rate by source, market, and date range. Appointment rate is appointments divided by leads. Conversion rate is conversions divided by leads. Both stay blank when the lead count is zero.

Starting sources are Google PPC, Meta, and AI leads. AI leads means chat or assistant inquiries, AI search referrals, and AI-driven campaigns. Admins can add more sources. Rows come from the form, a CSV, or `POST /api/webhooks/leads`. Google Ads and Meta Lead Ads adapters are reserved in `src/lib/leads.ts` and refuse to run until a real connection exists.

Webhook body:

```json
{
  "source": "google-ppc",
  "market": "charleston",
  "occurredOn": "2026-11-16",
  "leads": 1,
  "spendCents": 1500,
  "appointments": 0,
  "conversions": 0,
  "externalId": "zapier-123"
}
```

Send `Authorization: Bearer <token>` with the `leads:write` scope. The same `source` and `externalId` returns the original row instead of a duplicate. `spend` may be dollars (`"12.50"`) or `spendCents`.

### Modules and product ordering

Settings → Modules turns Marketing or Product ordering off for the whole company. Admins can open every module that is on. A VA needs a grant. New people receive Marketing. Ordering is granted to admins and stays off for a new VA until Avery checks it.

`/ordering` is the catalog and request form. Statuses are Requested, Approved, Ordered, and Delivered. `/ordering/queue` is the admin queue. VAs only see their own orders.

### Apps

`/apps` lists tools Avery registers: name, icon, URL, embed or new tab, and whether admins, every VA, or named people can see it. Embeds open at `/apps/<id>` in an iframe. A site that blocks frames can still be opened in a new tab.

### MCP and API tokens

`POST /api/mcp` speaks MCP JSON-RPC (`initialize`, `tools/list`, `tools/call`) at protocol `2024-11-05`. `GET /api/mcp` lists the tools. Authorize with `Authorization: Bearer ns_...`.

Issue tokens in Settings → API tokens. A token tied to a person acts as that person, so a VA token cannot read someone else's tasks, content, or orders. A service token with no person has admin visibility, limited to the scopes you check. The full token is shown once.

Scopes: `mcp`, `leads:read`, `leads:write`, `tasks:read`, `tasks:write`, `kpis:read`, `content:read`, `content:write`, `orders:write`.

Tools:

| Tool | Scopes | What it does |
| --- | --- | --- |
| `list_tasks` | `mcp`, `tasks:read` | Tasks the token is allowed to see |
| `create_task` | `mcp`, `tasks:write` | Creates a task owned by the token's person |
| `read_lead_metrics` | `mcp`, `leads:read` | Lead totals for a date range |
| `read_kpi_metrics` | `mcp`, `kpis:read` | Monthly KPI rows (`year`, `month`) |
| `list_content` | `mcp`, `content:read` | Calendar items the token can see |
| `create_content` | `mcp`, `content:write` | Adds an Idea owned by the token's person |
| `create_product_order` | `mcp`, `orders:write` | Requests a catalog product (`productId`, `quantity`) |

### My Day and permissions

Each Google account lands on My Day: their audit, their tasks, their content, and their orders. Admins also see who finished today's audit and how many tasks are still open. Audit templates can apply to every VA, every admin, or stay unassigned until you name people.

Decisions Avery can change:

- Company numbers (KPIs, spend, leads, the weekly report) are visible to anyone who has the Marketing module. Tasks, content items, orders, and audit checks are personal. A VA does not see another person's rows.
- A VA can only assign a task or a content item to themselves. Admins assign work to anyone. Campaigns and recurring templates are admin-only.
- A service token is org-wide for its scopes. A user token is not.

## Modules

1. **Home** — this week’s KPIs, tasks due, content on the calendar, quick links, and the bot team.
2. **KPIs** — leads, cost per lead, ad spend, appointments, closings, sessions, followers, engagement, new Google reviews, and average rating, by market and month, with charts, month-over-month change, manual entry, and CSV import/export.
3. **Spend** — weekly Meta, Google Ads, Zillow, Realtor.com, referral, organic, and other sources, with spend, leads, appointments, cost per lead, cost per appointment, summaries, and CSV import/export.
4. **Calendar** — month and list views, campaigns, owner, and the status path Idea → Drafting → Review → Scheduled → Posted.
5. **Weekly report** — numbers pulled from KPIs, spend, and the calendar, plus editable wins, issues, and next week’s priorities. Print saves a PDF. Copy or download the email version.
6. **Tasks** — kanban and list, with daily, weekly, and monthly templates.

Blank metrics stay blank. A zero appears only when someone entered zero.
