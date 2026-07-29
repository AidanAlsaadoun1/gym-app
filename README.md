# Gym

A single-user workout tracker. Next.js + Neon Postgres + Drizzle + better-auth, deployed on Vercel.

**Status: feature-complete (Milestones 1–7).** Auth, templates CRUD, live session logging with autosave, the workout generator, history + stats, and a PWA-ready mobile UI are all in. Add it to your home screen for a near-native feel.

## Stack

- Next.js 15 (App Router, Node runtime for API routes)
- TypeScript strict
- Neon Postgres (serverless, WebSocket pool)
- Drizzle ORM + drizzle-kit
- better-auth (email + password, sign-up disabled)
- Tailwind CSS v4
- Mobile-first UI

## First-time setup

### 1. Install dependencies

```bash
pnpm install
```

(Use `npm` or `yarn` if you prefer — `pnpm` is just what `packageManager` pins.)

### 2. Create a Neon database

1. Sign up at [neon.tech](https://console.neon.tech).
2. Create a project. Copy the **pooled** connection string (the one ending in `-pooler.<region>.aws.neon.tech`).

### 3. Configure environment

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

- `DATABASE_URL` — your Neon pooled connection string
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` for dev

### 4. Migrate

```bash
pnpm db:generate   # creates SQL in ./drizzle from the Drizzle schema
pnpm db:migrate    # applies the migration to Neon
```

For a quick first run you can also use `pnpm db:push` to push the schema without generating a migration file.

After migrating, seed the exercise library:

```bash
pnpm db:seed       # inserts ~75 common exercises (idempotent)
```

`pnpm db:studio` opens Drizzle Studio against your Neon DB so you can inspect rows.

### 5. Create your user

Public sign-up is disabled. Bootstrap your single account with:

```bash
pnpm user:create
```

It prompts for email, name, and a password (min 8 characters), then calls better-auth's internal sign-up.

### 6. Run

```bash
pnpm dev
```

Open <http://localhost:3000> — you'll be redirected to `/login`. Sign in with the credentials you just created.

## What's in the box

```
gym-app/
  app/
    layout.tsx                  # root html shell
    globals.css                 # Tailwind v4 (@import "tailwindcss")
    (auth)/login/page.tsx       # email + password form
    (app)/
      layout.tsx                # protected shell with bottom nav
      page.tsx                  # placeholder home
    api/auth/[...all]/route.ts  # better-auth handler
  components/ui/                # button, input, label primitives
  lib/
    auth.ts                     # better-auth server config
    auth-client.ts              # better-auth React client
    db/
      index.ts                  # Drizzle + Neon WebSocket pool
      schema.ts                 # better-auth + app tables, enums, indexes
      seed.ts                   # exercise library seed
    utils.ts                    # cn() helper
  scripts/create-user.ts        # bootstrap script
  middleware.ts                 # cookie-presence auth gate
  drizzle.config.ts
```

## Schema cheat sheet

App tables (in `lib/db/schema.ts`):

- `exercises` — global library (name, primary + secondary muscle groups, equipment, optional image_url + video_url).
- `workout_templates` — your splits (push/pull/legs/etc.), with `estimated_minutes` for the generator.
- `template_exercises` — exercises within a template, ordered, with default sets/reps and an optional `superset_group`.
- `sessions` — a workout instance, `start_time` and `end_time` (null while in progress), plus a `plan` jsonb for snapshotted exercise lists from the generator.
- `sets_log` — every set logged: weight, reps, RPE, warmup flag, timestamp.

**Whenever the schema changes** (Milestone 5 added `sessions.plan`, the timer/media pass added `exercises.image_url` + `exercises.video_url`), regenerate and apply the migration:

```bash
pnpm db:generate
pnpm db:migrate
```

The live screen falls back to a YouTube search link by exercise name when `video_url` is null and a placeholder icon when `image_url` is null, so you don't need to populate either to ship.

All app tables scope by `user_id` even though there's only one user today — keeps multi-user a config change rather than a migration.

## Deploying to production (cheaply, with a custom domain)

The whole stack is designed to fit inside free tiers for a single user. The only line item that costs anything is the domain registration.

### Cost summary

| Item | Where | Cost |
|---|---|---|
| App hosting + builds + SSL | Vercel Hobby | **$0** |
| Postgres database | Neon Free | **$0** |
| Domain (`skyeapp.fit`) | Cloudflare Registrar (at-cost) | **~$10–12 / year** |
| DNS, CDN, TLS | Bundled with the above | **$0** |

So roughly **a dollar a month**, all-in. The .fit TLD usually runs $10–12/year at Cloudflare's wholesale price. If you'd rather a cheaper TLD, `.app`, `.dev`, `.xyz`, `.me` are all ~$8–14/year at the same registrar.

### Free-tier limits to know about

- **Vercel Hobby**: non-commercial use only (fine for a personal gym app), 100 GB-hours of serverless function execution / month, automatic HTTPS, custom domains. You won't come close to the limits as a single user.
- **Neon Free**: one project with 0.5 GB storage and autosuspend after 5 minutes idle. The autosuspend means the very first request after a quiet period takes ~1s longer while the DB wakes up; subsequent requests are instant. If that ever bugs you, the next tier (Launch, $19/mo) keeps it always-on.

### Step 1 — Push to GitHub

See the "Pushing to GitHub" section below (it covers swapping between accounts).

### Step 2 — Provision Neon (production)

1. In the Neon console, **create a new project** for production (separate from any dev one you used).
2. Copy the **pooled** connection string (the host ends in `-pooler.<region>.aws.neon.tech`). You'll paste this into Vercel as `DATABASE_URL`.

### Step 3 — Import the repo into Vercel

1. <https://vercel.com/new> → pick the GitHub repo. Vercel will detect Next.js and the build command (`next build`).
2. **Don't deploy yet** — first add environment variables in the import flow (or in *Project → Settings → Environment Variables* later):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the pooled Neon URL from step 2 |
   | `BETTER_AUTH_SECRET` | run `openssl rand -base64 32` locally — **don't reuse your dev secret** |
   | `BETTER_AUTH_URL` | `https://skyeapp.fit` (your final domain — set this even before DNS is live) |
   | `NEXT_PUBLIC_APP_URL` | same as `BETTER_AUTH_URL` |

3. Deploy. The first build takes a couple of minutes. Vercel will give you a temporary `*.vercel.app` URL — it works, but log-in cookies are scoped to whatever `BETTER_AUTH_URL` says, so test on the real domain in step 5.

### Step 4 — Buy the domain (cheapest path)

Cloudflare Registrar sells domains **at wholesale cost** — no markups, no upsells, no $30 "WHOIS privacy" extras. You do need a (free) Cloudflare account first.

1. Sign up at <https://dash.cloudflare.com>.
2. **Domain Registration → Register Domains**, search `skyeapp.fit`, add to cart, pay (~$10–12 the first year).
3. The domain is automatically managed in your Cloudflare account.

Alternatives: **Porkbun** (~$1–2 more, slightly nicer UI), **Namecheap** (be careful — they upsell renewal-rate increases). Avoid GoDaddy.

### Step 5 — Point the domain at Vercel

1. In Vercel: **Project → Settings → Domains → Add** → enter `skyeapp.fit` and `www.skyeapp.fit`.
2. Vercel will show you the DNS records it expects. Choose either approach:
   - **Easier (recommended)**: change the domain's nameservers at Cloudflare Registrar to Vercel's (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). Vercel then manages DNS for you.
   - **Or** keep Cloudflare DNS and add the records Vercel lists:
     - `A` `@` → `76.76.21.21`
     - `CNAME` `www` → `cname.vercel-dns.com`

   If you stay on Cloudflare DNS, set those records' **Proxy status to "DNS only" (grey cloud)** while Vercel issues the certificate — Cloudflare's proxy in front of Vercel can cause double-TLS issues. You can flip it to proxied later.
3. Wait a few minutes for DNS to propagate; Vercel auto-issues a Let's Encrypt cert.
4. Once it shows "Valid Configuration" in Vercel, the URLs `https://skyeapp.fit` and `https://www.skyeapp.fit` both work, and Vercel will redirect one to the other automatically.

### Step 6 — Migrate production + create your user

Run these locally with the **production** `DATABASE_URL` set in your shell. The Neon URL never leaves your machine:

```bash
DATABASE_URL='postgresql://…neon-pooler…/neondb?sslmode=require' \
  pnpm db:migrate

DATABASE_URL='postgresql://…neon-pooler…/neondb?sslmode=require' \
  pnpm db:seed

DATABASE_URL='postgresql://…neon-pooler…/neondb?sslmode=require' \
  BETTER_AUTH_SECRET='…the secret you set in Vercel…' \
  pnpm user:create
```

The first two land the schema and seed the exercise library. The third prompts for email / name / password and creates your single account.

### Step 7 — Open the app and pin it

On your phone: open `https://skyeapp.fit` in Safari → sign in → Share → **Add to Home Screen**. The PWA manifest declares `display: standalone` and a theme color, so it launches chrome-free with a status bar that matches the system theme.

### Bumping a release later

```bash
git pull
pnpm install                                       # if deps changed
pnpm db:generate                                   # if schema changed
DATABASE_URL='…prod URL…' pnpm db:migrate          # if schema changed
git push                                           # Vercel auto-deploys
```

## Pushing to GitHub from a specific account

These commands cover pushing from the **AidanAlsaadoun1** GitHub account when your machine is already configured with a different one (e.g. work account). Pick **one** of the two approaches.

### Option A — GitHub CLI (easiest)

If you don't already have it: `brew install gh`. Then:

```bash
# In the project root:
cd /Users/aidan/projects/gym-app

# Authenticate as AidanAlsaadoun1 — opens a browser. Pick GitHub.com,
# HTTPS, and "Login with a web browser". Make sure you sign in as
# AidanAlsaadoun1, not your other account.
gh auth login

# Confirm which account gh is currently using:
gh auth status

# If you have multiple accounts authenticated, switch:
gh auth switch -u AidanAlsaadoun1

# Tell git to identify commits as AidanAlsaadoun1 for THIS repo only:
git config user.name "AidanAlsaadoun1"
git config user.email "<the email registered on that GitHub account>"

# Create the repo on GitHub and push in one go (private):
git init
git add .
git commit -m "Initial commit"
gh repo create AidanAlsaadoun1/gym-app --private --source=. --remote=origin --push
```

After that, regular `git push` works because gh's credential helper caches the AidanAlsaadoun1 token under HTTPS.

### Option B — SSH key per account

Useful if you push from many machines / want zero credential helper magic. Generate a separate SSH key just for this account and route GitHub traffic for this repo through a host alias.

```bash
# 1. Generate a dedicated key. Set the passphrase to whatever you like.
ssh-keygen -t ed25519 -C "AidanAlsaadoun1@github" -f ~/.ssh/id_ed25519_aidanalsaadoun1

# 2. Add it to the SSH agent
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_aidanalsaadoun1

# 3. Copy the PUBLIC key and add it at https://github.com/settings/keys
#    while signed in as AidanAlsaadoun1.
cat ~/.ssh/id_ed25519_aidanalsaadoun1.pub | pbcopy
echo "Public key copied to clipboard — paste it into github.com/settings/keys"

# 4. Add an SSH host alias so this repo uses the dedicated key.
cat >> ~/.ssh/config <<'EOF'

Host github-aidan
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_aidanalsaadoun1
  IdentitiesOnly yes
EOF

# 5. Verify the key authenticates as the right account
ssh -T git@github-aidan
# Expected: "Hi AidanAlsaadoun1! You've successfully authenticated, …"

# 6. Configure the local repo
cd /Users/aidan/projects/gym-app
git init
git add .
git commit -m "Initial commit"

git config user.name "AidanAlsaadoun1"
git config user.email "<the email registered on that GitHub account>"

# 7. Create the empty repo at github.com/AidanAlsaadoun1/gym-app
#    (in the browser, signed in as AidanAlsaadoun1), then:
git remote add origin git@github-aidan:AidanAlsaadoun1/gym-app.git
git branch -M main
git push -u origin main
```

The trick is the `git@github-aidan:…` URL — it routes through your `~/.ssh/config` alias, which forces SSH to use the AidanAlsaadoun1 key regardless of what your default key is.

### Quickly sanity-check who you're about to commit as

```bash
git config user.name
git config user.email
git remote -v
```

If those three lines all reference AidanAlsaadoun1, you're good to push.

## Bug reports (email yourself)

A "Report a bug" link at the bottom of the home page opens a modal that lets you send yourself a bug-report email. The endpoint is auth-gated, attaches the reporter's name + email from the session (never trusts what the client claims), and includes the page URL + browser user-agent so you can reproduce.

### Setup (free Resend account)

1. Sign up at <https://resend.com> using your personal inbox.
2. **Create an API key**: <https://resend.com/api-keys> → **Create API Key** → name it `Gym App`. Copy the key (you won't see it again).
3. In Vercel → **Settings → Environment Variables** add:

   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | the key from step 2 |
   | `BUG_REPORT_TO_EMAIL` | the same inbox you signed up with |

4. Redeploy. The "Report a bug" link in the home page footer will now actually send.

Without those vars set, the endpoint returns `503 — Bug report email isn't configured`. The link is still there but submissions fail cleanly.

### Sending from a custom domain (optional polish)

By default, emails arrive from `Gym Bug Report <onboarding@resend.dev>` and can occasionally land in spam. To send from `bugs@skyeapp.fit` instead:

1. <https://resend.com/domains> → **Add Domain** → `skyeapp.fit`.
2. Resend will show you DNS records to add at Porkbun (SPF + DKIM + return-path). Copy them in as TXT/CNAME records.
3. Once Resend marks the domain as **Verified**, set `BUG_REPORT_FROM_EMAIL="Gym <bugs@skyeapp.fit>"` in Vercel and redeploy.

This also unlocks sending to addresses other than your Resend account email — useful if you ever want to email someone else (e.g. password resets later).

## API surface (current)

```
POST   /api/auth/[...all]                       better-auth handler

GET    /api/exercises[?muscle=…]                global library
GET    /api/exercises/:id/last                  last completed session's sets for hint

GET    /api/workout-templates                   this user's templates + counts
POST   /api/workout-templates                   create (template + exercises, tx)
GET    /api/workout-templates/:id               template + ordered exercises
PATCH  /api/workout-templates/:id               update + replace exercise list (tx)
DELETE /api/workout-templates/:id               soft delete
POST   /api/workout-templates/:id/generate      preview a trimmed plan for N min

POST   /api/sessions                            start a session
GET    /api/sessions/:id                        session + ordered sets
PATCH  /api/sessions/:id                        update notes
DELETE /api/sessions/:id                        abandon (cascades to sets)
POST   /api/sessions/:id/finish                 stamp end_time (transaction)
POST   /api/sessions/:id/sets                   log a set
PATCH  /api/sessions/:id/sets/:setId            edit a set
DELETE /api/sessions/:id/sets/:setId            remove a set

POST   /api/bug-reports                         email a bug report to admin
```

**Every** route except `/api/auth/[...all]` (better-auth's own handler) calls `requireSession()` before doing anything. The middleware additionally redirects unauthenticated browser requests to `/login` for non-API paths.
