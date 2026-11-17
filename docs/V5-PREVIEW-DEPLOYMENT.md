# Deploy V5 ONLY as a private test preview

> Important: V5 is NOT published on the live website. Your existing Netlify,
> Render and PostgreSQL setup must remain unchanged during these tests.

## Step 1 — Create a separate source repository

1. Extract `Livestock-Manager-v5.0-Clean-Preview.zip`.
2. Create a **new** GitHub repository, e.g. `livestock-manager-v5-preview`.
3. Upload this extracted project, including its `frontend`, `backend`, `docs`
   and `netlify.toml` files, to that new repository.
4. Do NOT replace the old `livestock-manager` repository's `main` branch.
5. Do NOT upload `.env` files, passwords, database URLs or farm backups.

## Step 2 — Create a brand-new Render PostgreSQL database

In your Render dashboard, create a fresh PostgreSQL database for V5 preview.
Do not reuse or reset the V4 production database. Find the new database's
**internal connection string**. You will put it in the separate web service's
private environment variables as `DATABASE_URL`.

## Step 3 — Create a NEW Render web service

Choose your new preview GitHub repo. Use the repo root (leave Root Directory
blank). Set these commands:

- **Build command:** `cd backend && npm install`
- **Start command:** `cd backend && npm start`
- **Runtime:** Node.js 20 or later (22 recommended)

Give the service a clear preview name such as `livestock-manager-v5-preview`.

### Environment variables (enter in Render, NOT GitHub)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Connection string for the NEW preview PostgreSQL database |
| `LM_V5_TEST_ONLY` | `true` |
| `APP_ORIGIN` | Your NEW web service's exact `https://...onrender.com` origin, **no ending slash** |
| `SERVE_FRONTEND` | `true` |
| `NODE_ENV` | `production` |
| `TEST_FARM_EMAIL` | Your chosen preview login email |
| `TEST_FARM_PASSWORD` | A strong **new** test password, 12–128 characters |
| `TEST_FARM_NAME` | e.g. `V5 Test Farmer` (optional) |

The preview start command creates its V5 tables and seeds one already-verified
**test-only account** from the environment variables. The password is hashed
in the database. Registration is deliberately disabled on this preview, so
there is no need to configure an email delivery service for the initial tests.

If you do not yet know the service URL, create the new service, copy its
`https://...onrender.com` URL, set `APP_ORIGIN` to that exact URL, then redeploy.

**Never point `APP_ORIGIN` to the old Netlify or Render service.** This build
intentionally contains no production Netlify API redirect.

## Step 4 — Verify V5 is actually live in the test environment

On your laptop, open:

- `https://YOUR-NEW-SERVICE.onrender.com/api/health`
- `https://YOUR-NEW-SERVICE.onrender.com/login.html`

The health page should identify `livestock-v5-preview` and `apiVersion: 5`.
Sign in with `TEST_FARM_EMAIL` and `TEST_FARM_PASSWORD`. Start with a blank
animal list; no V4 farm records should appear.

Open the same preview URL on your phone and sign in with the same test account.
The phone and laptop should now talk directly to the same isolated server and
PostgreSQL database. No Netlify proxy is needed during this stage.

## Step 5 — Run the real-device test checklist

Follow `docs/V5-RELEASE-GATE.md`. Record exact problems and screenshots. Stop
if unexpected cloud data appears, an unrelated live site is modified, or API
health reports a version other than 5.

### Troubleshooting

- **Health check fails:** Look at the NEW Render web service logs and verify
  the preview database connection. Do not change the live service.
- **401 on login:** Confirm the seeded account email and password; the account
  is only seeded on a fresh database. Changing the environment password later
  does not automatically replace an existing hashed password.
- **403 Request origin rejected:** `APP_ORIGIN` must equal the new website
  origin exactly (`https`, host, no trailing slash).
- **Cloud unavailable:** Open `/api/health` and confirm the separate preview
  service is running. A health check does not by itself confirm your session.
- **409 same-field conflict:** This is intentional safety behavior. Download
  the device and server copies and review the specific conflict. Do not attempt
  an overwrite to force a test to pass.
- **Photo rejected:** Use a supported image under 2 MB; browser compression
  may reduce large JPEGs, but is not guaranteed for every image.

Do not promote anything automatically. After the isolated phone/laptop tests
pass, review the remaining farm-record and account requirements before a
separately approved production release.
