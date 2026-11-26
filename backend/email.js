'use strict';
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KINDS = {
  verify: { subject: () => 'Verify your Livestock Manager email', line: () => 'Please verify your email address using the secure link below. This link expires in 24 hours.', button: 'Verify email' },
  reset: { subject: () => 'Reset your Livestock Manager password', line: () => 'You requested a password reset. This link expires in 30 minutes.', button: 'Reset password' },
  welcome: { subject: () => 'Welcome to Livestock Manager', line: () => 'Your email has been verified. Your Livestock Manager account is ready for you to use. The Free plan includes up to 25 animals.', button: 'Log in' },
  subscribed: { subject: ({ plan }) => `You are now on Livestock Manager ${plan || 'Pro'}`, line: ({ plan }) => `Thank you! Your ${plan || 'Pro'} plan is active. Your new limits and pages are available now.`, button: 'Open Livestock Manager' },
  alerts: { subject: ({ items = [] }) => `Farm alerts: ${items.length} item${items.length === 1 ? '' : 's'} need attention`, line: () => 'These reminders need your attention:', button: 'View all alerts' }
};
function makeEmail({ kind, name, link, items = [], more = 0, plan }) {
  const k = KINDS[kind] || KINDS.welcome;
  const ctx = { plan, items };
  const subject = k.subject(ctx);
  const greeting = `Hello ${name || 'Farmer'},`;
  const line = k.line(ctx);
  const list = items.map(i => `${i.priority === 'high' ? '[URGENT] ' : ''}${i.title}: ${i.text}`);
  const footer = kind === 'alerts' ? 'You can turn these emails off any time on the Alerts page.' : kind === 'verify' || kind === 'reset' ? 'If you did not request this, you can ignore this email.' : '';
  const text = `${greeting}\n\n${line}${list.length ? '\n\n' + list.map(x => '- ' + x).join('\n') + (more ? `\n...and ${more} more` : '') : ''}${link ? '\n\n' + link : ''}${footer ? '\n\n' + footer : ''}\n\nLivestock Manager`;
  const rows = items.map(i => `<li style="margin:0 0 8px"><strong style="color:${i.priority === 'high' ? '#a12b2b' : '#7c510f'}">${escapeHTML(i.title)}</strong><br>${escapeHTML(i.text)}</li>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#163b2b;max-width:540px;margin:auto"><h2>Livestock Manager</h2><p>${escapeHTML(greeting)}</p><p>${escapeHTML(line)}</p>${rows ? `<ul style="padding-left:18px">${rows}</ul>${more ? `<p>...and ${Number(more)} more.</p>` : ''}` : ''}${link ? `<p><a href="${escapeHTML(link)}" style="display:inline-block;background:#1f6c43;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px">${escapeHTML(k.button)}</a></p>${kind === 'verify' || kind === 'reset' ? `<p style="word-break:break-all">${escapeHTML(link)}</p>` : ''}` : ''}${footer ? `<p style="color:#5c7064">${escapeHTML(footer)}</p>` : ''}</div>`;
  return { subject, text, html };
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
    const payload = makeEmail({kind,name,link,items,more,plan});
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
module.exports={makeEmail,createSender,EmailDeliveryError};
