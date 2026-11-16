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

## Modules

1. **Home** — this week’s KPIs, tasks due, content on the calendar, quick links, and the bot team.
2. **KPIs** — leads, cost per lead, ad spend, appointments, closings, sessions, followers, engagement, new Google reviews, and average rating, by market and month, with charts, month-over-month change, manual entry, and CSV import/export.
3. **Spend** — weekly Meta, Google Ads, Zillow, Realtor.com, referral, organic, and other sources, with spend, leads, appointments, cost per lead, cost per appointment, summaries, and CSV import/export.
4. **Calendar** — month and list views, campaigns, owner, and the status path Idea → Drafting → Review → Scheduled → Posted.
5. **Weekly report** — numbers pulled from KPIs, spend, and the calendar, plus editable wins, issues, and next week’s priorities. Print saves a PDF. Copy or download the email version.
6. **Tasks** — kanban and list, with daily, weekly, and monthly templates.

Blank metrics stay blank. A zero appears only when someone entered zero.
