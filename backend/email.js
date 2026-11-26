'use strict';
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KINDS = {
  verify: { subject: () => 'Verify your Livestock Manager email', line: () => 'Please verify your email address using the secure link below. This link expires in 24 hours.', button: 'Verify email' },
  reset: { subject: () => 'Reset your Livestock Manager password', line: () => 'You requested a password reset. This link expires in 30 minutes.', button: 'Reset password' },
  welcome: { subject: () => 'Welcome to Livestock Manager', line: () => 'Your email has been verified. Your Livestock Manager account is ready for you to use. The Free plan includes up to 25 animals.', button: 'Log in' },
  subscribed: { subject: ({ plan }) => `You are now on Livestock Manager ${plan || 'Pro'}`, line: ({ plan }) => `Thank you! Your ${plan || 'Pro'} plan is active. Your new limits and pages are available now.`, button: 'Open Livestock Manager' },
  alerts: { subject: ({ items = [] }) => `Farm alerts: ${items.length} item${items.length === 1 ? '' : 's'} need attention`, line: () => 'These reminders need your attention:', button: 'View all alerts' }
};
function emailUrl(value) {
  try {
    const u = new URL(String(value || ''));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    if (u.username || u.password) return '';
    return u.href;
  } catch { return ''; }
}
function brandConfig(env = process.env) {
  const homepage = emailUrl(env.EMAIL_SITE_URL || env.APP_ORIGIN || 'https://livestock-manager-v5-clean.onrender.com/');
  const logo = emailUrl(env.EMAIL_LOGO_URL || (homepage ? new URL('/assets/livestock-logo.png',homepage).href : ''));
  return {homepage,logo};
}
function makeEmail({ kind, name, link, items = [], more = 0, plan }, brand = brandConfig()) {
  const k = KINDS[kind] || KINDS.welcome;
  const validItems = Array.isArray(items) ? items.slice(0, 50) : [];
  const ctx = { plan, items: validItems };
  const subject = k.subject(ctx);
  const greeting = `Hello ${name || 'Farmer'},`;
  const line = k.line(ctx);
  const safeLink = emailUrl(link);
  const list = validItems.map(i => `${i.priority === 'high' ? '[URGENT] ' : ''}${i.title}: ${i.text}`);
  const footer = kind === 'alerts' ? 'You can manage these email reminders on the Alerts page.' : kind === 'verify' || kind === 'reset' ? 'If you did not request this, you can safely ignore this email.' : '';
  const text = `${greeting}\n\n${line}${list.length ? '\n\n' + list.map(x => '- ' + x).join('\n') + (more ? `\n...and ${more} more` : '') : ''}${safeLink ? '\n\n' + safeLink : ''}${footer ? '\n\n' + footer : ''}\n\nLivestock Manager\nA Lesege Veldworks product\n© 2026 Livestock Manager. All Rights Reserved.`;
  const rows = validItems.map(i => `<tr><td style="padding:0 0 10px"><div style="background:#f5f5ef;border-left:3px solid ${i.priority === 'high' ? '#b65e51' : '#788957'};border-radius:4px;padding:12px 14px"><strong style="color:#27392b;font-size:14px">${escapeHTML(i.title)}</strong><div style="color:#58645a;font-size:13px;line-height:20px;padding-top:3px">${escapeHTML(i.text)}</div></div></td></tr>`).join('');
  const action = safeLink ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0"><tr><td bgcolor="#526b3a" style="border-radius:7px"><a href="${escapeHTML(safeLink)}" style="display:inline-block;background:#526b3a;border-radius:7px;color:#ffffff;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;text-decoration:none;padding:15px 24px">${escapeHTML(k.button)}</a></td></tr></table>` : '';
  const fallback = safeLink && (kind === 'verify' || kind === 'reset') ? `<p style="font-size:12px;line-height:19px;color:#6b746b">If the button doesn't work, copy this link into your browser:<br><a href="${escapeHTML(safeLink)}" style="color:#526b3a;word-break:break-all">${escapeHTML(safeLink)}</a></p>` : '';
  const logo = brand.logo ? `<img src="${escapeHTML(brand.logo)}" alt="Livestock Manager" width="66" height="66" style="display:block;max-width:66px;width:66px;height:66px;border:0;margin:0 auto 12px">` : '';
  const website = brand.homepage ? `<a href="${escapeHTML(brand.homepage)}" style="color:#526b3a;text-decoration:underline">Visit Livestock Manager</a>` : 'Livestock Manager';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(subject)}</title></head><body style="margin:0;padding:0;background-color:#f4f4ed;font-family:Arial,Helvetica,sans-serif;color:#28392d"><div style="display:none;font-size:1px;color:#f4f4ed;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHTML(line)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f4ed"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px"><tr><td align="center" style="padding:6px 12px 22px">${logo}<div style="font-size:23px;line-height:27px;letter-spacing:.3px;font-weight:bold;color:#293d2b">Livestock Manager</div><div style="font-size:10px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#718063;margin-top:5px">Farm management made simpler</div></td></tr><tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid #e3e7dc;border-radius:14px;padding:32px 28px"><div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#69804d;text-transform:uppercase;margin-bottom:12px">${escapeHTML(kind === 'alerts' ? 'Farm reminders' : kind === 'verify' ? 'Account security' : kind === 'reset' ? 'Password assistance' : kind === 'subscribed' ? 'Membership update' : 'Welcome')}</div><h1 style="font-size:24px;line-height:32px;font-weight:bold;color:#26392b;margin:0 0 18px">${escapeHTML(subject)}</h1><p style="font-size:15px;line-height:24px;margin:0 0 12px">${escapeHTML(greeting)}</p><p style="font-size:15px;line-height:25px;color:#465249;margin:0 0 14px">${escapeHTML(line)}</p>${rows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>${more ? `<p style="color:#657060;font-size:13px">...and ${Number(more) || 0} more.</p>` : ''}` : ''}${action}${fallback}${footer ? `<p style="font-size:13px;line-height:21px;color:#7a8278;margin:22px 0 0">${escapeHTML(footer)}</p>` : ''}</td></tr><tr><td align="center" style="padding:26px 14px 8px;color:#747f72;font-size:12px;line-height:20px">${website}<br>A Lesege Veldworks product<br>© 2026 Livestock Manager. All Rights Reserved.<br>Developed &amp; Founded by Letlotlo Lesege</td></tr></table></td></tr></table></body></html>`;
  return {subject,text,html};
}
/*
 * Resend accepts a message for delivery; acceptance does not guarantee inbox delivery.
 * Do not log API keys, payloads, verification links or recipient addresses.
 */
class EmailDeliveryError extends Error {
  constructor(code, status) {
    const messages = {
      EMAIL_NOT_CONFIGURED: 'Email service is not configured: check RESEND_API_KEY and MAIL_FROM on Render.',
      EMAIL_PROVIDER_FORBIDDEN: 'Resend rejected the sender or recipient (HTTP 403). Check verified sending domain and recipient restrictions.',
      EMAIL_PROVIDER_UNAUTHORIZED: 'Resend rejected the API key (HTTP 401). Verify RESEND_API_KEY on Render.',
      EMAIL_PROVIDER_LIMIT: 'Resend rate limit reached. Check account limits and retry later.',
      EMAIL_PROVIDER_BAD_REQUEST: 'Resend rejected the email request. Check MAIL_FROM and the verified domain in Resend logs.',
      EMAIL_PROVIDER_FAILED: 'Resend was unable to accept the email. Check Resend API logs.',
      EMAIL_NETWORK_FAILED: 'Could not connect to Resend. Check network access and try again.'
    };
    super(messages[code] || messages.EMAIL_PROVIDER_FAILED);
    this.name='EmailDeliveryError'; this.code=code; this.status=status||null;
  }
}
function createSender(env=process.env, logger=console, fetchImpl=globalThis.fetch) {
  return async function send({to,kind,name,link,items,more,plan}) {
    const payload = makeEmail({kind,name,link,items,more,plan}, brandConfig(env));
    if (env.EMAIL_MODE === 'console' && env.NODE_ENV === 'development' && /^http:\/\/localhost(?::\d+)?$/.test(env.APP_ORIGIN || '')) {
      logger.info(`[DEV EMAIL] ${payload.subject} -> ${to}: ${link || '(welcome email)'}`);
      return {testMode:true};
    }
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new EmailDeliveryError('EMAIL_NOT_CONFIGURED');
    let response;
    try {
      response=await fetchImpl('https://api.resend.com/emails', {
        method:'POST',
        headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject:payload.subject,text:payload.text,html:payload.html}),
        signal:AbortSignal.timeout(10000)
      });
    } catch (e) {
      throw new EmailDeliveryError('EMAIL_NETWORK_FAILED');
    }
    if (!response.ok) {
      let details={};
      try { details=await response.json(); } catch(_) {}
      const errCode=details?.code || details?.name || 'unknown';
      const classification=response.status===403?'EMAIL_PROVIDER_FORBIDDEN':
        response.status===401?'EMAIL_PROVIDER_UNAUTHORIZED':
        response.status===429?'EMAIL_PROVIDER_LIMIT':
        response.status===400||response.status===422?'EMAIL_PROVIDER_BAD_REQUEST':'EMAIL_PROVIDER_FAILED';
      // Provider code is useful for debugging; avoid leaking the raw provider response.
      logger.warn('Livestock Manager email delivery rejected', {kind, httpStatus:response.status, providerCode:String(errCode).slice(0,80), category:classification});
      throw new EmailDeliveryError(classification,response.status);
    }
    let result={};
    try { result=await response.json(); } catch(_) {}
    return {id:typeof result?.id==='string'?result.id:null,accepted:true};
  };
}
module.exports={makeEmail,createSender,EmailDeliveryError,brandConfig};
