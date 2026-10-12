// Admin broadcast to every active shop owner (e.g. "traffic is coming —
// get your store ready"). POST /api/admin/broadcast/shop-owners
// Body: { dryRun?: boolean, subject?, heading?, message? }
import { Resend } from 'resend';
import { supabase } from '../supabaseClient.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER = process.env.EMAIL_FROM || 'UniHive <noreply@unihive.shop>';
const SITE = 'https://unihive.shop';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DEFAULTS = {
  subject: 'Traffic is coming to your UniHive store',
  heading: 'Get your store ready.',
  message:
    'THE HIVE: No Going Home is bringing a wave of new visitors to UniHive. Make sure your store is ready for them: refresh your banner, add clear photos, check your prices and mark anything sold out.',
};

const html = ({ name, heading, message }) => `<!doctype html><html><body style="margin:0;background:#07120a;font-family:Arial,Helvetica,sans-serif;color:#f1ece2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07120a;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0d2216;border-radius:20px;overflow:hidden;border:1px solid #1f3a26">
<tr><td style="padding:0"><img src="${SITE}/og/unihive.jpg" width="560" alt="UniHive" style="display:block;width:100%;height:auto;border:0" /></td></tr>
<tr><td style="padding:32px 32px 8px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#e7c65f">For UniHive store owners</p>
<h1 style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#ffffff">${esc(heading)}</h1>
<p style="margin:18px 0 0;font-size:15px;line-height:1.6;color:#d6d2c8">Hi ${esc(name || 'there')},</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#d6d2c8">${esc(message)}</p>
</td></tr>
<tr><td style="padding:18px 32px 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#d6d2c8">
<tr><td style="padding:6px 0">✦ A sharp banner — it’s the first thing people see when your store is shared.</td></tr>
<tr><td style="padding:6px 0">✦ Clear product photos and up-to-date prices.</td></tr>
<tr><td style="padding:6px 0">✦ Mark sold-out items so buyers never pay for something you don’t have.</td></tr>
<tr><td style="padding:6px 0">✦ Share your store link — previews now show your banner automatically.</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:26px 32px 34px">
<a href="${SITE}/myshop" style="display:inline-block;background:#e7c65f;color:#113b1e;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:999px">Update my store</a>
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #1f3a26;font-size:12px;color:#8a978c;text-align:center">No scams, no stress. We grow better together.<br/>UniHive · <a href="${SITE}" style="color:#e7c65f;text-decoration:none">unihive.shop</a></td></tr>
</table></td></tr></table></body></html>`;

const text = ({ name, heading, message }) =>
  `Hi ${name || 'there'},\n\n${heading}\n\n${message}\n\n- A sharp banner\n- Clear photos and current prices\n- Mark sold-out items\n- Share your store link\n\nUpdate your store: ${SITE}/myshop\n\nUniHive — No scams, no stress.`;

export const broadcastToShopOwners = async (req, res) => {
  try {
    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', req.user.id).maybeSingle();
    if (!me?.is_admin) return res.status(403).json({ success: false, error: 'Admin only' });

    const subject = (req.body.subject || DEFAULTS.subject).slice(0, 140);
    const heading = (req.body.heading || DEFAULTS.heading).slice(0, 120);
    const message = (req.body.message || DEFAULTS.message).slice(0, 1500);

    const { data: shops, error: shopErr } = await supabase.from('shops').select('id, shop_name').eq('status', 'active');
    if (shopErr) throw shopErr;
    const ids = [...new Set((shops || []).map((s) => s.id))];
    const { data: owners, error: pErr } = ids.length
      ? await supabase.from('profiles').select('id, full_name, email').in('id', ids)
      : { data: [] };
    if (pErr) throw pErr;

    const seen = new Set();
    const recipients = (owners || [])
      .filter((o) => o.email && /@/.test(o.email) && !seen.has(o.email.toLowerCase()) && seen.add(o.email.toLowerCase()))
      .map((o) => ({ email: o.email, name: o.full_name?.split(' ')[0] }));

    if (req.body.dryRun) {
      return res.json({ success: true, dryRun: true, count: recipients.length, sample: recipients.slice(0, 5).map((r) => r.email), preview: html({ name: 'Brian', heading, message }) });
    }

    let sent = 0;
    const failed = [];
    for (let i = 0; i < recipients.length; i += 50) {
      const batch = recipients.slice(i, i + 50).map((r) => ({
        from: SENDER, to: r.email, subject, html: html({ name: r.name, heading, message }), text: text({ name: r.name, heading, message }),
      }));
      const { error } = await resend.batch.send(batch);
      if (error) failed.push(...batch.map((b) => b.to));
      else sent += batch.length;
    }
    console.log(`Shop-owner broadcast by ${req.user.id}: sent ${sent}, failed ${failed.length}`);
    return res.json({ success: true, sent, failed: failed.length });
  } catch (err) {
    console.error('Broadcast error:', err);
    return res.status(500).json({ success: false, error: 'Broadcast failed' });
  }
};
