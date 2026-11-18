'use strict';
/* PayFast subscription billing with three plans: Free, Pro, Pro+.
 * - Prices, plan IDs and limits are decided on the SERVER only.
 * - Payment status changes ONLY after a verified PayFast ITN (signature + source IP
 *   + amount + PayFast server confirmation). The browser return page grants nothing.
 * - Billing is opt-in: with BILLING_ENFORCED!=='true' every account has full access.
 * - Free is permanent (no trial). A lapsed paid plan falls back to Free; data is never deleted.
 */
const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const net = require('node:net');
const restrictions = require('./plan-restrictions');

const PF_HOSTS = ['www.payfast.co.za', 'sandbox.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za'];
const DAY = 24 * 60 * 60 * 1000;

/* PHP-style urlencode, which is what PayFast signs: spaces become '+', hex is uppercase,
 * and !'()*~ are encoded (encodeURIComponent leaves those alone). */
function pfEncode(value, trim = true) {
  const text = trim ? String(value).trim() : String(value);
  return encodeURIComponent(text)
    .replace(/[!'()*~]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, '+');
}

function paramString(pairs, { includeEmpty = false, trim = true } = {}) {
  return pairs
    .filter(([, v]) => includeEmpty || (v !== undefined && v !== null && String(v).trim() !== ''))
    .map(([k, v]) => k + '=' + pfEncode(v ?? '', trim))
    .join('&');
}

function sign(pairs, passphrase, options) {
  let text = paramString(pairs, options);
  if (passphrase) text += '&passphrase=' + pfEncode(passphrase);
  return crypto.createHash('md5').update(text).digest('hex');
}

const money = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) throw new Error('Invalid plan price: ' + value);
  return n.toFixed(2);
};

function plansFor(env) {
  return {
    free: { id: 'free', name: 'Free', amount: '0.00', ...restrictions.RIGHTS.free, allPages: false, paid: false, label: 'forever' },
    pro: { id: 'pro', name: 'Pro', amount: money(env.PLAN_PRO_ZAR || '99.00'), ...restrictions.RIGHTS.pro, allPages: true, paid: true, frequency: 3, months: 1, label: 'per month' },
    proplus: { id: 'proplus', name: 'Pro+', amount: money(env.PLAN_PROPLUS_ZAR || '199.00'), ...restrictions.RIGHTS.proplus, allPages: true, paid: true, frequency: 3, months: 1, label: 'per month' }
  };
}

/* Pages only Pro / Pro+ can open. Free: home, animals, overview, feeding, health, alerts, profile. */
const PAID_PAGES = ['growth', 'weaning', 'family-tree', 'operations', 'money-stats', 'farm-reports', 'animal-profile', 'digital-pedigree', 'stud-management', 'herd-intelligence'];
const PAID_PAGE_RE = new RegExp('^/(' + PAID_PAGES.join('|') + ')(\\.html)?$');

function configFor(env = process.env) {
  const sandbox = env.PAYFAST_SANDBOX === 'true';
  return {
    enforced: env.BILLING_ENFORCED === 'true',
    sandbox,
    merchantId: env.PAYFAST_MERCHANT_ID || '',
    merchantKey: env.PAYFAST_MERCHANT_KEY || '',
    passphrase: env.PAYFAST_PASSPHRASE || '',
    graceDays: 3,
    ipCheck: env.PAYFAST_IP_CHECK !== 'off', // defence in depth; signature + PayFast confirmation still apply
    processUrl: sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process',
    validateUrl: sandbox ? 'https://sandbox.payfast.co.za/eng/query/validate' : 'https://www.payfast.co.za/eng/query/validate',
    apiBase: 'https://api.payfast.co.za',
    plans: plansFor(env)
  };
}

const isConfigured = cfg => !!(cfg.merchantId && cfg.merchantKey && cfg.passphrase);

/* What may this account do right now? Pure function, easy to test. */
function entitlement(cfg, sub, now = new Date()) {
  const shape = (plan, extra) => ({ plan: plan.id, planName: plan.name, animalLimit: plan.animalLimit, farmLimit: plan.farmLimit, features: plan.features, allPages: plan.allPages, ...extra });
  if (!cfg.enforced) return shape(cfg.plans.proplus, { state: 'unlimited' });
  const paidPlan = sub && cfg.plans[sub.plan] && cfg.plans[sub.plan].paid ? cfg.plans[sub.plan] : null;
  if (paidPlan && sub.current_period_end) {
    const end = new Date(sub.current_period_end).getTime();
    const grace = ['active', 'past_due'].includes(sub.status) ? cfg.graceDays * DAY : 0;
    if (now.getTime() < end + grace && ['active', 'past_due', 'cancelled'].includes(sub.status)) {
      return shape(paidPlan, { state: 'paid', status: sub.status, periodEnd: new Date(end).toISOString(), cancelAtPeriodEnd: sub.status === 'cancelled' });
    }
  }
  return shape(cfg.plans.free, { state: 'free', lapsed: !!paidPlan });
}

async function loadEntitlement(pool, cfg, userId) {
  const q = await pool.query('SELECT plan,status,current_period_end FROM lm_billing_subscriptions WHERE user_id=$1', [userId]);
  return entitlement(cfg, q.rows[0] || null);
}

/* POST /api/v5/animals: refuse when the plan's animal limit is reached. */
function animalGate(pool, cfg) {
  return (req, res, next) => {
    if (!cfg.enforced) return next();
    (async () => {
      const e = await loadEntitlement(pool, cfg, req.authUser.id);
      if (e.animalLimit === null) return next();
      const q = await pool.query('SELECT count(*)::int AS n FROM lm_v5_animals WHERE user_id=$1', [req.authUser.id]);
      if (q.rows[0].n >= e.animalLimit) {
        return res.status(402).json({ code: 'PLAN_LIMIT', limit: e.animalLimit, error: `Your ${e.planName} plan allows up to ${e.animalLimit} animals. Upgrade your plan to add more.` });
      }
      next();
    })().catch(next);
  };
}

/* Server-side page lock: free accounts asking for a Pro page are sent to the plans page. */
function pageGate(pool, cfg, userIdFromReq) {
  return async (req, res, next) => {
    try {
      if (!cfg.enforced) return next();
      const id = await userIdFromReq(req);
      if (!id) return next(); // not signed in: the page's own login guard handles that
      const e = await loadEntitlement(pool, cfg, id);
      const name = req.path.replace(/^\//, '').replace(/\.html$/, '');
      const feature = restrictions.PAGE_FEATURES[name];
      if (feature ? restrictions.entitled(e, feature) : e.allPages) return next();
      return res.redirect(302, '/subscription.html?locked=' + encodeURIComponent(name));
    } catch (err) { next(err); }
  };
}

function checkoutFields(cfg, { origin, user, plan, mPaymentId }) {
  const first = String(user.full_name || 'Farmer').trim().split(/\s+/)[0].slice(0, 100);
  const pairs = [
    ['merchant_id', cfg.merchantId], ['merchant_key', cfg.merchantKey],
    ['return_url', origin + '/subscription.html?payment=success'],
    ['cancel_url', origin + '/subscription.html?payment=cancelled'],
    ['notify_url', origin + '/api/billing/itn'],
    ['name_first', first], ['email_address', user.email],
    ['m_payment_id', mPaymentId], ['amount', plan.amount],
    ['item_name', 'Livestock Manager - ' + plan.name],
    ['item_description', 'Livestock Manager ' + plan.name.toLowerCase() + ' subscription'],
    ['subscription_type', '1'], ['recurring_amount', plan.amount],
    ['frequency', String(plan.frequency)], ['cycles', '0']
  ];
  pairs.push(['signature', sign(pairs, cfg.passphrase)]);
  return pairs.map(([name, value]) => ({ name, value }));
}

/* PayFast's own server addresses, resolved from DNS (cached 10 minutes). */
function makeHostLookup(lookup = dns.lookup.bind(dns)) {
  let cache = { at: 0, ips: new Set() };
  return async function validIps() {
    if (Date.now() - cache.at < 10 * 60 * 1000 && cache.ips.size) return cache.ips;
    const ips = new Set();
    for (const host of PF_HOSTS) {
      try { for (const a of await lookup(host, { all: true })) ips.add(a.address); } catch (_) { /* host may be unreachable; others still count */ }
    }
    cache = { at: Date.now(), ips };
    return ips;
  };
}

const cleanIp = ip => String(ip || '').replace(/^::ffff:/, '');

/* Render public web services sit behind Cloudflare and Render proxy hops.
 * Express trust proxy=1 can therefore report an internal 10.x.x.x address.
 * Cloudflare overwrites CF-Connecting-IP on Render's public ingress, making
 * it the trustworthy original client IP (unlike spoofable X-Forwarded-For).
 * Keep the original req.ip behaviour on other hosts and if header is absent.
 * NEVER disable PayFast's IP, signature or server confirmation checks.
 */
function itnSourceIp(req, runningOnRender = process.env.RENDER === 'true') {
  const forwarded = runningOnRender ? req.headers?.['cf-connecting-ip'] : undefined;
  if (typeof forwarded === 'string' && net.isIP(forwarded.trim())) {
    return cleanIp(forwarded.trim());
  }
  return cleanIp(req.ip);
}
const sameHex = (a, b) => {
  const x = Buffer.from(String(a || ''), 'utf8'), y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

async function cancelAtPayFast(cfg, token, fetchImpl) {
  // PayFast API signature: header + body fields (plus passphrase) sorted alphabetically.
  const timestamp = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 19); // SAST, no zone suffix
  const pairs = [['merchant-id', cfg.merchantId], ['passphrase', cfg.passphrase], ['timestamp', timestamp], ['version', 'v1']];
  const signature = crypto.createHash('md5').update(paramString(pairs)).digest('hex');
  const r = await fetchImpl(`${cfg.apiBase}/subscriptions/${encodeURIComponent(token)}/cancel${cfg.sandbox ? '?testing=true' : ''}`, {
    method: 'PUT', headers: { 'merchant-id': cfg.merchantId, version: 'v1', timestamp, signature }, signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) throw new Error('PayFast cancel returned status ' + r.status);
}

function install(app, { pool, requireAuth, asyncRoute, fail, limit, cfg, origin, logger = console, fetchImpl = fetch, validIps = makeHostLookup(), sendMail = async () => {} }) {
  app.get('/api/billing/status', requireAuth, asyncRoute(async (req, res) => {
    const [e, n] = await Promise.all([
      loadEntitlement(pool, cfg, req.authUser.id),
      pool.query('SELECT count(*)::int AS n FROM lm_v5_animals WHERE user_id=$1', [req.authUser.id])
    ]);
    res.json({
      enforced: cfg.enforced, ready: isConfigured(cfg), sandbox: cfg.sandbox, paidPages: PAID_PAGES,
      plans: Object.values(cfg.plans).map(p => ({ id: p.id, name: p.name, amount: p.amount, label: p.label, animalLimit: p.animalLimit, farmLimit: p.farmLimit, features: p.features, allPages: p.allPages, paid: p.paid, currency: 'ZAR' })),
      entitlement: e, animalCount: n.rows[0].n
    });
  }));

  app.post('/api/billing/checkout', requireAuth, limit(20), asyncRoute(async (req, res) => {
    if (!cfg.enforced || !isConfigured(cfg)) return fail(res, 503, 'Payments are not available yet.');
    const plan = cfg.plans[String(req.body?.plan || '')];
    if (!plan || !plan.paid) return fail(res, 400, 'Choose Pro or Pro+.');
    const current = await loadEntitlement(pool, cfg, req.authUser.id);
    if (current.plan === plan.id && current.status === 'active' && !current.cancelAtPeriodEnd) return fail(res, 409, 'You are already on this plan.');
    const mPaymentId = 'lm-' + crypto.randomUUID();
    await pool.query('INSERT INTO lm_billing_payments(m_payment_id,user_id,plan,amount) VALUES($1,$2,$3,$4)',
      [mPaymentId, req.authUser.id, plan.id, plan.amount]);
    res.json({ action: cfg.processUrl, fields: checkoutFields(cfg, { origin, user: req.authUser, plan, mPaymentId }) });
  }));

  app.post('/api/billing/cancel', requireAuth, limit(10), asyncRoute(async (req, res) => {
    const q = await pool.query('SELECT pf_token,status FROM lm_billing_subscriptions WHERE user_id=$1', [req.authUser.id]);
    const sub = q.rows[0];
    if (!sub || !sub.pf_token || sub.status === 'cancelled') return fail(res, 404, 'No active subscription to cancel.');
    if (!isConfigured(cfg)) return fail(res, 503, 'Payments are not available yet.');
    try { await cancelAtPayFast(cfg, sub.pf_token, fetchImpl); }
    catch (e) { logger.error('PayFast cancel failed:', e.message); return fail(res, 502, 'PayFast could not cancel the subscription. Please try again or cancel from your PayFast email.'); }
    await pool.query("UPDATE lm_billing_subscriptions SET status='cancelled',updated_at=now() WHERE user_id=$1", [req.authUser.id]);
    res.json({ ok: true });
  }));

  /* Instant Transaction Notification from PayFast. No session, no Origin header. */
  app.post('/api/billing/itn', limit(300), asyncRoute(async (req, res) => {
    const body = req.body || {};
    const pairs = Object.entries(body);
    if (!pairs.length || pairs.some(([, v]) => typeof v !== 'string')) return res.status(400).end();
    const unsigned = pairs.filter(([k]) => k !== 'signature');
    // 1. signature over exactly what was received (blank fields included)
    const expected = sign(unsigned, cfg.passphrase, { includeEmpty: true, trim: false });
    if (!sameHex(String(body.signature || '').toLowerCase(), expected)) { logger.warn('ITN rejected: bad signature'); return res.status(400).end(); }
    // 2. it must come from PayFast
    const ips = cfg.ipCheck ? await validIps() : null;
    const sourceIp = itnSourceIp(req);
    if (ips && !ips.has(sourceIp)) { logger.warn('ITN rejected: source ' + sourceIp); return res.status(400).end(); }
    if (cfg.merchantId && body.merchant_id !== cfg.merchantId) return res.status(400).end();
    // 3. find the purchase we created, or the existing subscription for recurring charges
    let user = null, planId = null;
    const pay = await pool.query('SELECT user_id,plan,amount FROM lm_billing_payments WHERE m_payment_id=$1', [body.m_payment_id || '']);
    if (pay.rowCount) { user = pay.rows[0].user_id; planId = pay.rows[0].plan; }
    else if (body.token) {
      const s = await pool.query('SELECT user_id,plan FROM lm_billing_subscriptions WHERE pf_token=$1', [body.token]);
      if (s.rowCount) { user = s.rows[0].user_id; planId = s.rows[0].plan; }
    }
    const plan = cfg.plans[planId];
    if (!user || !plan) { logger.warn('ITN rejected: unknown payment'); return res.status(400).end(); }
    // 4. the amount must be what WE priced
    const status = String(body.payment_status || '');
    if (status === 'COMPLETE' && Math.abs(Number(body.amount_gross) - Number(plan.amount)) > 0.01) {
      logger.warn('ITN rejected: amount mismatch'); return res.status(400).end();
    }
    // 5. ask PayFast to confirm the data really came from them
    let confirmed = false;
    try {
      const r = await fetchImpl(cfg.validateUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: paramString(unsigned, { includeEmpty: true, trim: false }), signal: AbortSignal.timeout(10000)
      });
      confirmed = r.ok && (await r.text()).trim() === 'VALID';
    } catch (e) { logger.error('ITN confirm failed:', e.message); return res.status(503).end(); } // PayFast will retry
    if (!confirmed) return res.status(400).end();
    // 6. idempotent: each (payment, status) is applied once
    const ev = await pool.query(
      `INSERT INTO lm_billing_events(event_key,user_id,payment_status,amount_gross) VALUES($1,$2,$3,$4)
       ON CONFLICT (event_key) DO NOTHING RETURNING event_key`,
      [String(body.pf_payment_id || body.m_payment_id) + '|' + status, user, status, Number(body.amount_gross) || 0]);
    if (!ev.rowCount) return res.status(200).end();
    if (status === 'COMPLETE') {
      const prevQ = await pool.query('SELECT plan,status,pf_token FROM lm_billing_subscriptions WHERE user_id=$1', [user]);
      const prev = prevQ.rows[0] || null;
      // A different token means a NEW PayFast subscription (plan change): its period starts now, not stacked on the old one.
      await pool.query(
        `INSERT INTO lm_billing_subscriptions(user_id,plan,status,pf_token,current_period_end)
         VALUES($1,$2,'active',$3,now()+($4::integer * interval '1 month'))
         ON CONFLICT (user_id) DO UPDATE SET plan=EXCLUDED.plan,status='active',
           pf_token=COALESCE(EXCLUDED.pf_token,lm_billing_subscriptions.pf_token),
           current_period_end=CASE WHEN EXCLUDED.pf_token IS NULL OR EXCLUDED.pf_token IS NOT DISTINCT FROM lm_billing_subscriptions.pf_token
             THEN GREATEST(COALESCE(lm_billing_subscriptions.current_period_end,now()),now())+($4::integer * interval '1 month')
             ELSE now()+($4::integer * interval '1 month') END,
           updated_at=now()`,
        [user, plan.id, body.token || null, plan.months]);
      await pool.query("UPDATE lm_billing_payments SET status='complete' WHERE m_payment_id=$1", [body.m_payment_id || '']);
      if (prev && prev.pf_token && body.token && prev.pf_token !== body.token && prev.status !== 'cancelled') {
        try { await cancelAtPayFast(cfg, prev.pf_token, fetchImpl); } // stop billing the old plan
        catch (e) { logger.error('Could not cancel previous PayFast subscription:', e.message); }
      }
      if (!prev || prev.plan !== plan.id || prev.status !== 'active' || prev.pf_token !== body.token) {
        try {
          const u = await pool.query('SELECT email,full_name FROM lm_auth_users WHERE id=$1', [user]);
          if (u.rowCount) await sendMail({ to: u.rows[0].email, name: u.rows[0].full_name, kind: 'subscribed', plan: plan.name, link: origin + '/dashboard.html' });
        } catch (e) { logger.warn('Subscription email failed:', e.message); }
      }
    } else if (status === 'FAILED') {
      await pool.query("UPDATE lm_billing_subscriptions SET status='past_due',updated_at=now() WHERE user_id=$1 AND status='active'", [user]);
    } else if (status === 'CANCELLED') {
      await pool.query("UPDATE lm_billing_subscriptions SET status='cancelled',updated_at=now() WHERE user_id=$1", [user]);
    }
    return res.status(200).end();
  }));
}

module.exports = { pfEncode, paramString, sign, plansFor, configFor, isConfigured, entitlement, loadEntitlement, animalGate, pageGate, PAID_PAGES, PAID_PAGE_RE, checkoutFields, makeHostLookup, itnSourceIp, install };
