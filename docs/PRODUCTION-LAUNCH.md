# Going live: plans, payments and emails

The V5 test preview still works exactly as before. Production mode switches on when
`LM_V5_TEST_ONLY` is **not** `true`. Do this on a NEW Render service and a NEW database.

## Plans

| | Free | Pro (R99/month) | Pro+ (R199/month) |
| --- | --- | --- | --- |
| Animals | up to 25 | up to 150 | unlimited |
| Pages | Home, Animals, Overview, Feeding, Health, Alerts, Profile | all | all |

Free needs no payment and never expires. If a paid plan ends, the account returns to Free:
nothing is deleted, but new animals and Pro pages are blocked until they upgrade.
The animal limit is enforced in the API; Pro pages are blocked by the server (it redirects
Free accounts to the Plans page), so editing the browser cannot bypass either.

## 1. Render service (frontend + API together)

Build: `cd backend && npm install`   Start: `cd backend && npm start`

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Render PostgreSQL connection string |
| `NODE_ENV` | `production` |
| `SERVE_FRONTEND` | `true` (the server must serve the pages, or Pro pages cannot be locked) |
| `APP_ORIGIN` | Exact public https address, no trailing slash |
| `RESEND_API_KEY`, `MAIL_FROM` | Email sending (resend.com; verify your sending domain first) |
| `BILLING_ENFORCED` | `true` |
| `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE` | From PayFast. Set the same passphrase in PayFast (Settings > Integration) |
| `PAYFAST_SANDBOX` | `true` while testing; remove when live |
| `PLAN_PRO_ZAR`, `PLAN_PROPLUS_ZAR` | Optional price overrides (defaults 99.00 and 199.00) |
| `PAYFAST_IP_CHECK` | Leave unset. Set `off` ONLY if sandbox payments are rejected with "ITN rejected: source ..." in the logs (proxy address problem); signature and PayFast confirmation still protect you |
| `ALERT_EMAILS` | Leave unset (on). `false` turns off the daily alert emails |

Do not set `LM_V5_TEST_ONLY`, `TEST_FARM_EMAIL` or `TEST_FARM_PASSWORD`.
The service refuses to start if email or PayFast settings are missing.

## 2. Emails the app sends

- Verify your email (after registering) and Welcome (after verifying)
- Password reset
- "You are now on Pro / Pro+" after a payment is confirmed
- Daily alert digest (births due or overdue, weaning, vaccinations/treatments due or overdue), sent once a day
  after 06:00 South African time, only to verified users who have not turned it off (switch on the Alerts page)

## 3. Test in PayFast sandbox first

1. Register, verify the email, log in. You should be on Free (25 animals; Growth, Money Stats, etc. locked).
2. Add animals until 25: the 26th must be refused with an upgrade message.
3. Plans page > Upgrade to Pro, pay with a sandbox buyer. After returning, "Payment confirmed" should
   appear within a minute and you should get the "now on Pro" email. If not, check the Render logs for "ITN rejected".
4. Pro pages open; limit is 150. Upgrade to Pro+: the old Pro subscription should be cancelled automatically.
5. Cancel: access continues to the end of the paid period, then returns to Free.
6. Add a pregnant animal due in 3 days, wait for the next morning (or ask me for a one-off test command): you should get the alert email.
7. The cancel calls use PayFast's subscription API. Confirm they work in the sandbox before going live.

## 4. Before real customers

- Terms of service, privacy policy (POPIA) and refund/cancellation policy pages, linked from register and Plans.
- Live PayFast credentials, `PAYFAST_SANDBOX` removed, redeploy.
- Paid Render plan with database backups (free tier is not suitable for customers).
- Custom domain with HTTPS, then update `APP_ORIGIN`.
