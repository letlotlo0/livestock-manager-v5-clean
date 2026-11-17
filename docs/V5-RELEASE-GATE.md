# Livestock Manager V5 — Release Gate

Do these tests only on the **new V5 Render preview URL**. Do not perform them
against the existing Netlify website or existing Render backend.

## Isolated preview setup

- [ ] V5 uses a new GitHub preview repository or branch.
- [ ] V5 uses a new Render PostgreSQL database.
- [ ] V5 uses a new Render web service with `SERVE_FRONTEND=true`.
- [ ] `/api/health` shows `apiVersion: 5`.
- [ ] Same seeded V5 test account can log in on phone and laptop.
- [ ] Existing V4 records are absent; blank V5 test farm loads on both devices.

## Real laptop and phone tests

- [ ] Add cattle `qqq` on laptop; verify `Cloud synced — server confirmed`.
- [ ] Reload phone; `qqq` appears with the same details.
- [ ] Add `Ttt` on laptop; reload phone, both cattle appear.
- [ ] Keep both pages open: edit **qqq Seller Remarks** on laptop and **Ttt
      Seller Remarks** on phone. Save both without refreshing in between.
- [ ] Both devices eventually report synced; reload both, both remarks survive.
- [ ] Edit weight for `qqq` on laptop while adding its photo on phone. Both
      changes survive a reload on both devices.
- [ ] Add `www` on the phone; laptop can retrieve it.
- [ ] Make a change while the phone is offline; reconnect and confirm that
      the server records the change without duplicating an animal.
- [ ] Log out and log in again; verify committed data remains in PostgreSQL.
- [ ] Test pregnancy dates, birth records, stud/pedigree, photos, profile,
      growth, health, sales, expenses, reports and mobile navigation.
- [ ] Test two devices saving independent changes to growth/health records;
      investigate any conflicts (these records are still group documents).
- [ ] Observe server logs: no unexpected 401, 403, 409, 5xx or repeated sync.
- [ ] Download a test farm backup; review animal IDs, photo presence and dates.

## Sign-off

Record failures with device, browser, screenshot, timestamp, exact test action,
cloud status and Render logs. A health check or automated test alone does not
qualify the build for production. **Do not move V5 to the main website unless
all critical real-device tests pass and there are no unresolved data-loss risks.**

**Tested on:** ____________________

**Device / browser:** ____________________

**Result:** ____________________

**Approved for main site:** No — pending real-device acceptance.
