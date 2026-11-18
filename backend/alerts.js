'use strict';
/* Email alerts: a once-a-day digest of urgent farm reminders (births, weaning, vaccinations/treatments).
 * Same rules as the Alerts page in the browser, run on the server so farmers are told even when
 * they are not logged in. Low-priority housekeeping alerts stay on the page only. */
const DAY = 864e5;
const MAX_ITEMS = 25, STALE_AFTER_DAYS = 90;
const WEANING_DAYS = { cattle: 205, cow: 205, cows: 205, goat: 90, goats: 90, sheep: 90, ewe: 90, ewes: 90, pig: 28, pigs: 28, sow: 28, sows: 28 };

function daysFrom(value, today) {
  if (!value) return null;
  const d = Date.parse(String(value).slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(d)) return null;
  return Math.round((d - Date.parse(today + 'T00:00:00Z')) / DAY);
}
function addDays(value, days) {
  const d = Date.parse(String(value).slice(0, 10) + 'T00:00:00Z');
  return Number.isNaN(d) ? '' : new Date(d + days * DAY).toISOString().slice(0, 10);
}
const nameOf = a => (a && (a.name || a.tag || a.animalTag)) || 'Animal';
const asList = v => (Array.isArray(v) ? v : []);

function computeAlerts({ animals = [], health = [], vaccinations = [], today }) {
  const items = [];
  for (const a of asList(animals)) {
    const name = nameOf(a);
    const expected = a.expectedBirthDate || a.expectedBirth || a.dueDate;
    const bd = daysFrom(expected, today);
    if ((a.pregnant || String(a.pregnancy || '').toLowerCase() === 'pregnant') && bd !== null) {
      if (bd < 0 && -bd <= STALE_AFTER_DAYS) items.push({ priority: 'high', kind: 'Pregnancy', title: 'Birth overdue', text: `${name} is overdue by ${-bd} day(s). Inspect the animal.`, date: expected });
      else if (bd >= 0 && bd <= 7) items.push({ priority: 'high', kind: 'Pregnancy', title: 'Birth approaching', text: `${name} is expected to give birth in ${bd} day(s).`, date: expected });
    }
    const born = a.birthDate || a.dateOfBirth;
    const wd0 = WEANING_DAYS[String(a.type || a.species || a.animalType || '').toLowerCase().trim()];
    const wean = a.weaningDate || (born && wd0 ? addDays(born, wd0) : '');
    const wd = daysFrom(wean, today);
    if (born && wd !== null && wd >= 0 && wd <= 14) items.push({ priority: 'medium', kind: 'Weaning', title: 'Weaning window approaching', text: `${name} may be approaching its estimated weaning date.`, date: wean });
  }
  for (const r of [...asList(health), ...asList(vaccinations)]) {
    if (!r || typeof r !== 'object') continue;
    const next = r.nextDate || r.nextVaccinationDate;
    const d = daysFrom(next, today);
    if (d === null) continue;
    const name = r.animalName || r.animal || 'Livestock';
    const task = r.treatment || r.vaccinationName || 'Health task';
    if (d < 0 && -d <= STALE_AFTER_DAYS) items.push({ priority: 'high', kind: 'Health', title: 'Health task overdue', text: `${name}: ${task} is overdue.`, date: next });
    else if (d >= 0 && d <= 7) items.push({ priority: 'medium', kind: 'Health', title: 'Health task due soon', text: `${name}: ${task} is due in ${d} day(s).`, date: next });
  }
  const rank = { high: 0, medium: 1 };
  items.sort((x, y) => (rank[x.priority] - rank[y.priority]) || String(x.date).localeCompare(String(y.date)));
  return items;
}

const sastToday = now => new Date(now.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);

async function loadFarm(pool, userId) {
  const [a, r] = await Promise.all([
    pool.query('SELECT animal_id AS id,data FROM lm_v5_animals WHERE user_id=$1', [userId]),
    pool.query(`SELECT record_key,data FROM lm_farm_records WHERE user_id=$1
       AND (record_key IN ('livestockHealthRecords','livestockVaccinations')
       OR record_key LIKE '%::livestockHealthRecords' OR record_key LIKE '%::livestockVaccinations')`, [userId])
  ]);
  // Account-wide digest: include reminders from all user-owned farms, not just the first.
  const health=[],vaccinations=[];
  for(const row of r.rows){
    if(!Array.isArray(row.data))continue;
    if(row.record_key.endsWith('livestockHealthRecords'))health.push(...row.data);
    if(row.record_key.endsWith('livestockVaccinations'))vaccinations.push(...row.data);
  }
  return { animals: a.rows.map(x => ({ ...x.data, id: x.id })), health, vaccinations };
}

/* Send each verified, opted-in user at most one digest per South African day, after 06:00 SAST. */
async function runDigest({ pool, sendMail, origin, logger = console, now = new Date(), batch = 200 }) {
  const sast = new Date(now.getTime() + 2 * 3600 * 1000);
  if (sast.getUTCHours() < 6) return { skipped: 'before 06:00' };
  const today = sastToday(now);
  const result = { checked: 0, sent: 0, failed: 0 };
  let cursor = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    const q = await pool.query(
      `SELECT u.id,u.email,u.full_name FROM lm_auth_users u LEFT JOIN lm_alert_prefs p ON p.user_id=u.id
        WHERE u.email_verified_at IS NOT NULL AND COALESCE(p.email_alerts,true)
          AND (p.last_digest_on IS NULL OR p.last_digest_on<$1::date) AND u.id>$2::uuid ORDER BY u.id LIMIT $3`,
      [today, cursor, batch]);
    if (!q.rowCount) break;
    for (const u of q.rows) {
      cursor = u.id;
      // Claim today's digest atomically so two server instances never double-send.
      const claim = await pool.query(
        `INSERT INTO lm_alert_prefs(user_id,last_digest_on) VALUES($1,$2::date)
         ON CONFLICT (user_id) DO UPDATE SET last_digest_on=EXCLUDED.last_digest_on,updated_at=now()
         WHERE lm_alert_prefs.last_digest_on IS NULL OR lm_alert_prefs.last_digest_on<EXCLUDED.last_digest_on RETURNING user_id`, [u.id, today]);
      if (!claim.rowCount) continue;
      result.checked++;
      try {
        const farm = await loadFarm(pool, u.id);
        const items = computeAlerts({ ...farm, today });
        if (items.length) {
          await sendMail({ to: u.email, name: u.full_name, kind: 'alerts', items: items.slice(0, MAX_ITEMS), more: Math.max(0, items.length - MAX_ITEMS), link: origin + '/farm-alerts.html' });
          result.sent++;
        }
      } catch (e) {
        result.failed++;
        logger.error('Alert digest failed:', e.message);
        await pool.query('UPDATE lm_alert_prefs SET last_digest_on=NULL WHERE user_id=$1', [u.id]).catch(() => {}); // retry on the next run
      }
    }
  }
  return result;
}

function startScheduler(options) {
  const tick = () => runDigest(options).then(r => { if (r.sent || r.failed) (options.logger || console).info('Alert digest:', JSON.stringify(r)); }).catch(e => (options.logger || console).error('Alert scheduler error:', e.message));
  setTimeout(tick, 60 * 1000).unref?.();
  const timer = setInterval(tick, 30 * 60 * 1000); timer.unref?.();
  return timer;
}

function install(app, { pool, requireAuth, asyncRoute, fail, limit }) {
  app.get('/api/alerts/prefs', requireAuth, asyncRoute(async (req, res) => {
    const q = await pool.query('SELECT email_alerts FROM lm_alert_prefs WHERE user_id=$1', [req.authUser.id]);
    res.json({ emailAlerts: q.rowCount ? q.rows[0].email_alerts : true });
  }));
  app.put('/api/alerts/prefs', requireAuth, limit(60), asyncRoute(async (req, res) => {
    if (typeof req.body?.emailAlerts !== 'boolean') return fail(res, 400, 'emailAlerts must be true or false.');
    await pool.query(`INSERT INTO lm_alert_prefs(user_id,email_alerts) VALUES($1,$2)
      ON CONFLICT (user_id) DO UPDATE SET email_alerts=EXCLUDED.email_alerts,updated_at=now()`, [req.authUser.id, req.body.emailAlerts]);
    res.json({ emailAlerts: req.body.emailAlerts });
  }));
}

module.exports = { computeAlerts, runDigest, startScheduler, install, sastToday };
