# V5 clean preview — local test report

The source of truth for these results is `backend/tests/v5-*.test.js` and
`tests/browser-inline-smoke.py`. These tests run against simulated HTTP/database
implementations, not a deployed Render PostgreSQL instance.

## Automated results

- Node syntax checks for the server: **passed**.
- Node unit/interaction tests: **38 passed, 0 failed**.
- Browser UI smoke test (headless Chromium): **passed**. Two independent
  browser contexts (desktop and 390px mobile viewport) loaded the actual
  `animals.html` page and JavaScript, created two animals, opened and edited
  records, synced changes on separate animals, and saved a photo while another
  device changed weight on the same animal. No JavaScript page errors.

## Scenarios covered

| Scenario | Local result |
| --- | --- |
| Blank V5 farm without importing V4 animals | Passed |
| Two devices update different animals | Passed |
| Both devices add different animals | Passed |
| One device changes weight and another changes photo | Passed |
| Retry 409 after another edit to a different field | Passed |
| Two devices edit same field: no silent overwrite | Passed |
| Delete versus remote edit: protected conflict | Passed |
| Offline draft, reconnect and browser restart | Passed |
| Separate account ownership checks | Passed |
| Animal create, PATCH, photo and DELETE routes | Passed with mocked database |
| Account-scoped API reads and writes | Passed with mocked database |
| Preserving document groups and append-only logs, including first concurrent writes | Basic cases passed |
| JSON and image input validation | Passed |
| No false synced state on failed state GET | Passed |

## Still unverified / release blockers

1. Fresh PostgreSQL schema creation on an actual Render database.
2. Login and cookie sessions over the actual Render HTTPS origin.
3. Real smartphone/laptop synchronization over separate networks and after
   opening/closing the site several times.
4. Animal photo upload limits and browser storage quotas with many images.
5. Broader simultaneous edits in **non-animal farm record groups** (health,
   growth, expenses, etc.). These still use versioned group documents.
6. Production monitoring, backups, and an independently approved migration
   strategy. V4 records are deliberately not migrated by this preview.

**Status:** Code-ready for isolated V5 preview testing. **Not production ready.**
