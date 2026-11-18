'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../billing');

const env = { BILLING_ENFORCED: 'true', PAYFAST_MERCHANT_ID: '10000100', PAYFAST_MERCHANT_KEY: 'key123', PAYFAST_PASSPHRASE: 'secret pass', PAYFAST_SANDBOX: 'true', TRIAL_DAYS: '14' };
const cfg = B.configFor(env);
const DAY = 864e5;

test('pfEncode matches PHP urlencode behaviour PayFast signs', () => {
  assert.equal(B.pfEncode('John Smith!'), 'John+Smith%21');
  assert.equal(B.pfEncode('a@b.co'), 'a%40b.co');
  assert.equal(B.pfEncode("it's (ok)*~"), 'it%27s+%28ok%29%2A%7E');
  assert.equal(B.pfEncode('  padded '), 'padded');
});

test('signature depends on field order, skips blanks, and appends passphrase', () => {
  const a = B.sign([['a', '1'], ['b', '2']], 'pp');
  assert.notEqual(a, B.sign([['b', '2'], ['a', '1']], 'pp'));
  assert.equal(a, B.sign([['a', '1'], ['blank', ''], ['b', '2']], 'pp'));
  assert.notEqual(a, B.sign([['a', '1'], ['b', '2']], 'other'));
  assert.notEqual(B.sign([['a', '1'], ['blank', '']], '', { includeEmpty: true }), B.sign([['a', '1']], ''));
});

test('three plans with the agreed prices and limits, set on the server', () => {
  const p = cfg.plans;
  assert.deepEqual([p.free.amount, p.pro.amount, p.proplus.amount], ['0.00', '99.00', '199.00']);
  assert.deepEqual([p.free.animalLimit, p.pro.animalLimit, p.proplus.animalLimit], [25, 150, null]);
  assert.deepEqual([p.free.allPages, p.pro.allPages, p.proplus.allPages], [false, true, true]);
  assert.equal(p.pro.frequency, 3);
  assert.throws(() => B.configFor({ PLAN_PRO_ZAR: '-5' }));
});

test('checkout form is signed, uses server price, never contains the passphrase', () => {
  const user = { full_name: 'Thabo Mokoena', email: 'thabo@example.com' };
  const fields = B.checkoutFields(cfg, { origin: 'https://farm.example.com', user, plan: cfg.plans.pro, mPaymentId: 'lm-1' });
  const map = Object.fromEntries(fields.map(f => [f.name, f.value]));
  assert.equal(map.amount, '99.00'); assert.equal(map.recurring_amount, '99.00');
  assert.equal(map.subscription_type, '1'); assert.equal(map.frequency, '3'); assert.equal(map.cycles, '0');
  assert.equal(map.notify_url, 'https://farm.example.com/api/billing/itn');
  assert.ok(!JSON.stringify(fields).includes('secret'));
  const unsigned = fields.filter(f => f.name !== 'signature').map(f => [f.name, f.value]);
  assert.equal(map.signature, B.sign(unsigned, cfg.passphrase));
  assert.equal(fields.at(-1).name, 'signature');
});

test('entitlement: free by default, paid inside the period, grace, lapse back to free, billing off', () => {
  const now = new Date('2026-03-10T00:00:00Z');
  const at = d => new Date(now.getTime() + d * DAY);
  const e0 = B.entitlement(cfg, null, now);
  assert.deepEqual([e0.plan, e0.animalLimit, e0.allPages, e0.state], ['free', 25, false, 'free']);
  const sub = { plan: 'pro', status: 'active', current_period_end: at(10) };
  const e1 = B.entitlement(cfg, sub, now);
  assert.deepEqual([e1.plan, e1.animalLimit, e1.allPages], ['pro', 150, true]);
  assert.equal(B.entitlement(cfg, { ...sub, plan: 'proplus' }, now).animalLimit, null);
  assert.equal(B.entitlement(cfg, { ...sub, status: 'cancelled' }, now).cancelAtPeriodEnd, true);
  assert.equal(B.entitlement(cfg, { ...sub, status: 'cancelled', current_period_end: at(-1) }, now).plan, 'free');
  assert.equal(B.entitlement(cfg, { ...sub, status: 'past_due', current_period_end: at(-2) }, now).plan, 'pro');
  const lapsed = B.entitlement(cfg, { ...sub, status: 'past_due', current_period_end: at(-4) }, now);
  assert.deepEqual([lapsed.plan, lapsed.lapsed], ['free', true]);
  assert.equal(B.entitlement(cfg, { plan: 'hacker', status: 'active', current_period_end: at(10) }, now).plan, 'free');
  const off = B.entitlement(B.configFor({}), null, now);
  assert.deepEqual([off.animalLimit, off.allPages], [null, true]);
});

test('Render ITN IP uses trusted Cloudflare client header, not the internal proxy IP', () => {
  const req = { ip: '10.27.5.235', headers: { 'cf-connecting-ip': '197.97.145.144', 'x-forwarded-for': '8.8.8.8, 10.31.106.224' } };
  assert.equal(B.itnSourceIp(req, true), '197.97.145.144');
  // Other hosts do not automatically trust request headers.
  assert.equal(B.itnSourceIp(req, false), '10.27.5.235');
  // A malformed/absent header cannot bypass IP validation.
  req.headers['cf-connecting-ip'] = '197.97.145.144, 8.8.8.8';
  assert.equal(B.itnSourceIp(req, true), '10.27.5.235');
  delete req.headers['cf-connecting-ip'];
  assert.equal(B.itnSourceIp(req, true), '10.27.5.235');
});

test('animal limit: Free stops at 25, Pro at 150, Pro+ never, billing-off never', async () => {
  const run = async (conf, sub, count) => {
    const pool = { async query(sql) { return sql.includes('count(*)') ? { rows: [{ n: count }] } : { rows: sub ? [sub] : [] }; } };
    let out = 'next';
    const res = { status(c) { this.c = c; return this; }, json(b) { out = [this.c, b.code]; return this; } };
    await new Promise(r => { B.animalGate(pool, conf)({ authUser: { id: 'u' } }, res, () => r()); setTimeout(r, 20); });
    return out;
  };
  const future = new Date(Date.now() + 10 * DAY);
  assert.equal(await run(cfg, null, 24), 'next');
  assert.deepEqual(await run(cfg, null, 25), [402, 'PLAN_LIMIT']);
  const pro = { plan: 'pro', status: 'active', current_period_end: future };
  assert.equal(await run(cfg, pro, 149), 'next');
  assert.deepEqual(await run(cfg, pro, 150), [402, 'PLAN_LIMIT']);
  assert.equal(await run(cfg, { ...pro, plan: 'proplus' }, 5000), 'next');
  assert.equal(await run(B.configFor({}), null, 5000), 'next');
});

test('Pro pages are locked for Free accounts but open for paid accounts, others untouched', async () => {
  const lookup = sub => ({ async query() { return { rows: sub ? [sub] : [] }; } });
  const go = async (path, sub, uid = 'u1') => {
    let out = 'next';
    const res = { redirect(c, to) { out = [c, to]; } };
    await B.pageGate(lookup(sub), cfg, async () => uid)({ path }, res, e => { if (e) throw e; });
    return out;
  };
  assert.deepEqual(await go('/growth.html', null), [302, '/subscription.html?locked=growth']);
  assert.deepEqual(await go('/money-stats', null), [302, '/subscription.html?locked=money-stats']);
  assert.equal(await go('/growth.html', { plan: 'pro', status: 'active', current_period_end: new Date(Date.now() + DAY) }), 'next');
  assert.equal(await go('/growth.html', null, null), 'next'); // signed out: login guard handles it
  for (const free of ['/dashboard.html', '/animals.html', '/livestock-overview.html', '/feeding.html', '/health.html', '/farm-alerts.html', '/profile.html', '/subscription.html'])
    assert.equal(B.PAID_PAGE_RE.test(free), false, free + ' must stay free');
  for (const paid of ['growth', 'weaning', 'vaccinations', 'family-tree', 'operations', 'money-stats', 'farm-reports', 'animal-profile', 'digital-pedigree'])
    assert.equal(B.PAID_PAGE_RE.test('/' + paid + '.html'), true, paid + ' must be locked');
});

/* ---- ITN handler through a fake app/pool ---- */
function harness({ validate = 'VALID', ip = '197.97.145.144', validIpList = ['197.97.145.144'] } = {}) {
  const routes = new Map(), log = { upserts: 0, events: new Set(), payments: new Map(), statuses: [], mails: [], cancels: [], prev: null };
  const app = { get(p, ...f) { routes.set('GET ' + p, f.at(-1)); }, post(p, ...f) { routes.set('POST ' + p, f.at(-1)); } };
  const pool = {
    async query(sql, params) {
      if (sql.includes('FROM lm_billing_payments')) { const r = log.payments.get(params[0]); return { rowCount: r ? 1 : 0, rows: r ? [r] : [] }; }
      if (sql.includes('FROM lm_billing_subscriptions WHERE pf_token')) return { rowCount: 0, rows: [] };
      if (sql.includes('SELECT plan,status,pf_token FROM lm_billing_subscriptions')) return { rowCount: log.prev ? 1 : 0, rows: log.prev ? [log.prev] : [] };
      if (sql.includes('FROM lm_auth_users WHERE id')) return { rowCount: 1, rows: [{ email: 'thabo@example.com', full_name: 'Thabo' }] };
      if (sql.includes('INSERT INTO lm_billing_events')) { if (log.events.has(params[0])) return { rowCount: 0, rows: [] }; log.events.add(params[0]); return { rowCount: 1, rows: [{}] }; }
      if (sql.includes('INSERT INTO lm_billing_subscriptions')) { log.upserts++; log.lastUpsert = params; return { rowCount: 1, rows: [] }; }
      if (sql.includes('UPDATE lm_billing_subscriptions')) { log.statuses.push(sql.match(/status='(\w+)'/)[1]); return { rowCount: 1, rows: [] }; }
      if (sql.includes('UPDATE lm_billing_payments')) return { rowCount: 1, rows: [] };
      throw new Error('Unexpected SQL ' + sql);
    }
  };
  const fetchImpl = async (url, opts) => { if (String(url).includes('/subscriptions/')) { log.cancels.push(String(url)); return { ok: true }; } return { ok: true, text: async () => validate }; };
  const quiet = { warn() {}, error() {}, info() {} };
  B.install(app, { pool, requireAuth: () => {}, asyncRoute: fn => fn, fail: (res, s, e) => res.status(s).json({ error: e }), limit: () => {}, cfg, origin: 'https://farm.example.com', logger: quiet, fetchImpl, validIps: async () => new Set(validIpList), sendMail: async m => { log.mails.push(m); } });
  const itn = routes.get('POST /api/billing/itn');
  async function send(fields, { ip: fromIp = ip, sign = true } = {}) {
    const pairs = Object.entries(fields);
    const body = { ...fields };
    if (sign) body.signature = B.sign(pairs, cfg.passphrase, { includeEmpty: true, trim: false });
    const res = { code: 0, status(c) { this.code = c; return this; }, end() { return this; }, json() { return this; } };
    await itn({ body, ip: fromIp }, res);
    return res.code;
  }
  return { log, send };
}
const good = () => ({ m_payment_id: 'lm-1', pf_payment_id: '1089250', payment_status: 'COMPLETE', item_name: 'Livestock Manager - Monthly', amount_gross: '99.00', amount_fee: '-2.27', amount_net: '96.73', token: 'tok-1', name_first: 'Thabo', email_address: 'thabo@example.com', merchant_id: '10000100' });
const seed = h => h.log.payments.set('lm-1', { user_id: 'u1', plan: 'pro', amount: '99.00' });

test('valid ITN activates the subscription once, even if PayFast repeats it', async () => {
  const h = harness(); seed(h);
  assert.equal(await h.send(good()), 200);
  assert.equal(h.log.upserts, 1);
  assert.deepEqual(h.log.lastUpsert.slice(0, 3), ['u1', 'pro', 'tok-1']);
  assert.equal(h.log.mails.length, 1); assert.equal(h.log.mails[0].kind, 'subscribed'); assert.equal(h.log.mails[0].plan, 'Pro');
  assert.equal(await h.send(good()), 200);
  assert.equal(h.log.upserts, 1, 'duplicate ITN must not extend the period twice');
});

test('forged or tampered ITNs are rejected and grant nothing', async () => {
  let h = harness(); seed(h);
  assert.equal(await h.send(good(), { sign: false }), 400);
  const tampered = good(); const pairs = Object.entries(tampered);
  const sig = B.sign(pairs, cfg.passphrase, { includeEmpty: true, trim: false });
  assert.equal(await h.send({ ...tampered, amount_gross: '1.00' }, { sign: false }), 400);
  h = harness(); seed(h);
  assert.equal(await h.send({ ...good(), signature: sig, amount_gross: '1.00' }, { sign: false }), 400);
  assert.equal(h.log.upserts, 0);
});

test('ITN from a non-PayFast address, wrong amount, unknown payment or INVALID confirmation is rejected', async () => {
  let h = harness(); seed(h);
  assert.equal(await h.send(good(), { ip: '8.8.8.8' }), 400);
  assert.equal(await h.send({ ...good(), amount_gross: '1.00' }), 400);
  assert.equal(await h.send({ ...good(), m_payment_id: 'lm-nope', token: 'unknown' }), 400);
  h = harness({ validate: 'INVALID' }); seed(h);
  assert.equal(await h.send(good()), 400);
  assert.equal(h.log.upserts, 0);
});

test('FAILED marks past_due and CANCELLED marks cancelled', async () => {
  const h = harness(); seed(h);
  assert.equal(await h.send({ ...good(), payment_status: 'FAILED', pf_payment_id: '2' }), 200);
  assert.equal(await h.send({ ...good(), payment_status: 'CANCELLED', pf_payment_id: '3' }), 200);
  assert.deepEqual(h.log.statuses, ['past_due', 'cancelled']);
});

test('Pro+ purchase checks the Pro+ price, and an upgrade cancels the old PayFast subscription', async () => {
  const h = harness(); h.log.payments.set('lm-1', { user_id: 'u1', plan: 'proplus', amount: '199.00' });
  h.log.prev = { plan: 'pro', status: 'active', pf_token: 'old-token' };
  assert.equal(await h.send({ ...good(), amount_gross: '99.00' }), 400, 'Pro price must not buy Pro+');
  assert.equal(await h.send({ ...good(), amount_gross: '199.00', item_name: 'Livestock Manager - Pro+' }), 200);
  assert.equal(h.log.lastUpsert[1], 'proplus');
  assert.equal(h.log.cancels.length, 1); assert.ok(h.log.cancels[0].includes('old-token'));
});
test('a renewal of the same subscription sends no second welcome email and no cancel', async () => {
  const h = harness(); seed(h); h.log.prev = { plan: 'pro', status: 'active', pf_token: 'tok-1' };
  assert.equal(await h.send(good()), 200);
  assert.equal(h.log.mails.length, 0); assert.equal(h.log.cancels.length, 0);
});
