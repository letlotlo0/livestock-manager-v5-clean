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
function createSender(env=process.env, logger=console) {
  return async function send({to,kind,name,link,items,more,plan}) {
    const payload = makeEmail({kind,name,link,items,more,plan});
    if (env.EMAIL_MODE === 'console' && env.NODE_ENV === 'development' && /^http:\/\/localhost(?::\d+)?$/.test(env.APP_ORIGIN || '')) {
      logger.info(`[DEV EMAIL] ${payload.subject} -> ${to}: ${link || '(welcome email)'}`);
      return;
    }
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error('Email delivery is not configured on the server.');
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST', headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject:payload.subject,text:payload.text,html:payload.html}),
      signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Email provider returned status ${response.status}`);
  };
}
module.exports={makeEmail,createSender};
