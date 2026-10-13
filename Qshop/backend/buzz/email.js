// The Buzz email: minimal, dark, serif headlines — reads like UniHive.
import crypto from 'crypto';

const SITE = 'https://unihive.shop';
const API = process.env.PUBLIC_API_URL || 'https://unihive-wba0.onrender.com';
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const unsubToken = (userId) =>
  crypto.createHmac('sha256', process.env.BUZZ_SECRET || 'unset').update(String(userId)).digest('hex').slice(0, 32);
export const unsubUrl = (userId) => `${API}/api/buzz/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}`;

const imgs = (list) => {
  if (!list?.length) return '';
  const w = list.length === 1 ? 496 : 244;
  const cells = list.map((src) => `<td style="padding:4px" width="${w}"><img src="${esc(src)}" width="${w}" alt="" style="display:block;width:100%;max-width:${w}px;height:auto;border-radius:14px;border:0" /></td>`);
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cells.slice(i, i + 2).join('')}</tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">${rows.join('')}</table>`;
};

export function renderBuzz(issue, { name, unsubscribe }) {
  const sections = issue.sections.map((s) => `
<tr><td style="padding:26px 32px 4px">
  <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#e7c65f">${esc(s.kicker)}</p>
  <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#ffffff;font-weight:700">${esc(s.title)}</h2>
  <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#d6d2c8">${esc(s.body)}</p>
  ${imgs(s.images)}
  ${s.cta_url ? `<p style="margin:16px 0 0"><a href="${esc(s.cta_url)}" style="display:inline-block;color:#e7c65f;text-decoration:none;font-weight:bold;font-size:14px;border-bottom:1px solid #e7c65f;padding-bottom:2px">${esc(s.cta_label || 'Open')} →</a></p>` : ''}
</td></tr>
<tr><td style="padding:22px 32px 0"><div style="height:1px;background:#1f3a26"></div></td></tr>`).join('');

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;background:#07120a;font-family:Arial,Helvetica,sans-serif;color:#f1ece2">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(issue.preheader || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07120a;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0b1a10;border-radius:22px;overflow:hidden;border:1px solid #1f3a26">
<tr><td style="padding:30px 32px 0">
  <p style="margin:0;font-family:Georgia,serif;font-size:13px;letter-spacing:6px;color:#e7c65f">THE BUZZ</p>
  <p style="margin:4px 0 0;font-size:11px;letter-spacing:2px;color:#7f8f84;text-transform:uppercase">from UniHive</p>
</td></tr>
<tr><td style="padding:22px 32px 0">
  <p style="margin:0;font-size:16px;line-height:1.6;color:#ffffff">Sasa ${esc(name || 'there')},</p>
  <p style="margin:8px 0 0;font-size:16px;line-height:1.6;color:#d6d2c8">${esc(issue.opener || '')}</p>
</td></tr>
<tr><td style="padding:22px 32px 0"><div style="height:1px;background:#1f3a26"></div></td></tr>
${sections}
<tr><td style="padding:24px 32px 6px"><p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:17px;color:#e7c65f">${esc(issue.signoff || 'See you in the Hive.')}</p></td></tr>
<tr><td style="padding:18px 32px 28px;font-size:12px;line-height:1.7;color:#7f8f84">
  <a href="${SITE}" style="color:#e7c65f;text-decoration:none">unihive.shop</a> · <a href="https://www.instagram.com/unihive.entertainment/" style="color:#e7c65f;text-decoration:none">Instagram</a> · <a href="https://www.tiktok.com/@unihive.entertainment" style="color:#e7c65f;text-decoration:none">TikTok</a><br/>
  No scams, no stress. We grow better together.<br/>
  You’re getting this because you have a UniHive account. <a href="${esc(unsubscribe)}" style="color:#9fb0a4">Unsubscribe</a> · <a href="${SITE}/privacy" style="color:#9fb0a4">Privacy</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

export function textBuzz(issue, { name, unsubscribe }) {
  return [`Sasa ${name || 'there'},`, '', issue.opener, '',
    ...issue.sections.flatMap((s) => [`${s.kicker.toUpperCase()} — ${s.title}`, s.body, s.cta_url ? `${s.cta_label}: ${s.cta_url}` : '', '']),
    issue.signoff, '', `Unsubscribe: ${unsubscribe}`].join('\n');
}
