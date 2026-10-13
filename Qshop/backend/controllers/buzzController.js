// The Buzz — UniHive's periodic email. Flow: draft (data → writer) →
// admin approves (or BUZZ_AUTOSEND=true) → daily tranches within the cap
// until everyone opted in has it. Cron calls use the x-buzz-secret header.
import crypto from 'crypto';
import { Resend } from 'resend';
import { supabase } from '../supabaseClient.js';
import { gatherBuzzData } from '../buzz/data.js';
import { writeIssue } from '../buzz/writer.js';
import { renderBuzz, textBuzz, unsubToken, unsubUrl } from '../buzz/email.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER = process.env.BUZZ_FROM || process.env.EMAIL_FROM || 'UniHive <noreply@unihive.shop>';
const DAILY_CAP = Number(process.env.BUZZ_DAILY_CAP || 90); // Resend free plan: 100/day
const AUTOSEND = process.env.BUZZ_AUTOSEND === 'true';

const safeEqual = (a, b) => a && b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const isCron = (req) => Boolean(process.env.BUZZ_SECRET) && safeEqual(req.get('x-buzz-secret') || '', process.env.BUZZ_SECRET);

async function adminId(req) {
  const token = (req.get('authorization') || '').replace(/^Bearer /, '');
  if (!token) return null;
  const { data: { user } = {} } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return me?.is_admin ? user.id : null;
}
async function guard(req, res, { cronOk = false } = {}) {
  if (cronOk && isCron(req)) return 'cron';
  const id = await adminId(req);
  if (!id) { res.status(403).json({ success: false, error: 'Admin only' }); return null; }
  return id;
}

const preview = (issue) => renderBuzz(issue, { name: 'Brian', unsubscribe: '#' });

export const draftBuzz = async (req, res) => {
  const who = await guard(req, res, { cronOk: true }); if (!who) return;
  try {
    const data = await gatherBuzzData();
    const { issue, writtenBy } = await writeIssue(data);
    const status = AUTOSEND && who === 'cron' ? 'approved' : 'draft';
    const { data: row, error } = await supabase.from('buzz_campaigns').insert({
      subject: issue.subject, preheader: issue.preheader, content: issue, data, written_by: writtenBy, status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
    }).select('id, status, subject, written_by, created_at').single();
    if (error) throw error;
    res.json({ success: true, campaign: row, preview: preview(issue) });
  } catch (err) {
    console.error('Buzz draft error:', err);
    res.status(500).json({ success: false, error: 'Could not draft The Buzz' });
  }
};

export const listBuzz = async (req, res) => {
  if (!(await guard(req, res))) return;
  const { data, error } = await supabase.from('buzz_campaigns')
    .select('id, created_at, status, subject, preheader, content, written_by, sent_count, approved_at, finished_at')
    .order('created_at', { ascending: false }).limit(10);
  if (error) return res.status(500).json({ success: false, error: error.message });
  const { count: audience } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
    .eq('marketing_opt_out', false).not('email', 'is', null);
  res.json({ success: true, campaigns: (data || []).map((c) => ({ ...c, preview: preview(c.content) })), audience: audience || 0, dailyCap: DAILY_CAP });
};

export const setBuzzStatus = async (req, res) => {
  const who = await guard(req, res); if (!who) return;
  const status = req.body?.status;
  if (!['approved', 'discarded'].includes(status)) return res.status(400).json({ success: false, error: 'Bad status' });
  const patch = status === 'approved' ? { status, approved_by: who, approved_at: new Date().toISOString() } : { status };
  const { error } = await supabase.from('buzz_campaigns').update(patch).eq('id', req.params.id).in('status', ['draft', 'approved']);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true });
};

export const testBuzz = async (req, res) => {
  const who = await guard(req, res); if (!who) return;
  const { data: c } = await supabase.from('buzz_campaigns').select('content').eq('id', req.params.id).maybeSingle();
  const { data: me } = await supabase.from('profiles').select('email, full_name').eq('id', who).maybeSingle();
  if (!c || !me?.email) return res.status(404).json({ success: false, error: 'Not found' });
  const name = me.full_name?.split(' ')[0];
  const { error } = await resend.emails.send({ from: SENDER, to: me.email, subject: `[Test] ${c.content.subject}`, html: renderBuzz(c.content, { name, unsubscribe: unsubUrl(who) }), text: textBuzz(c.content, { name, unsubscribe: unsubUrl(who) }) });
  if (error) return res.status(502).json({ success: false, error: error.message });
  res.json({ success: true, to: me.email });
};

// Sends the next tranche of the oldest approved/sending campaign.
export const sendBuzz = async (req, res) => {
  if (!(await guard(req, res, { cronOk: true }))) return;
  try {
    const { data: c } = await supabase.from('buzz_campaigns').select('*')
      .in('status', ['approved', 'sending']).order('approved_at', { ascending: true }).limit(1).maybeSingle();
    if (!c) return res.json({ success: true, sent: 0, note: 'Nothing approved to send' });

    const since = new Date(Date.now() - 86400000).toISOString();
    const { count: today } = await supabase.from('buzz_sends').select('user_id', { count: 'exact', head: true }).gte('sent_at', since);
    const budget = Math.max(0, DAILY_CAP - (today || 0));
    if (budget === 0) return res.json({ success: true, sent: 0, note: 'Daily cap reached' });

    const { data: done } = await supabase.from('buzz_sends').select('user_id').eq('campaign_id', c.id);
    const skip = new Set((done || []).map((d) => d.user_id));
    const { data: people } = await supabase.from('profiles').select('id, email, full_name')
      .eq('marketing_opt_out', false).not('email', 'is', null).order('created_at', { ascending: true }).limit(5000);
    const queue = (people || []).filter((p) => /@/.test(p.email) && !skip.has(p.id)).slice(0, budget);

    if (!queue.length) {
      await supabase.from('buzz_campaigns').update({ status: 'sent', finished_at: new Date().toISOString() }).eq('id', c.id);
      return res.json({ success: true, sent: 0, note: 'Campaign complete' });
    }
    if (c.status === 'approved') await supabase.from('buzz_campaigns').update({ status: 'sending' }).eq('id', c.id);

    let sent = 0;
    for (let i = 0; i < queue.length; i += 50) {
      const batch = queue.slice(i, i + 50);
      const { error } = await resend.batch.send(batch.map((p) => {
        const name = p.full_name?.split(' ')[0];
        const unsubscribe = unsubUrl(p.id);
        return {
          from: SENDER, to: p.email, subject: c.subject,
          html: renderBuzz(c.content, { name, unsubscribe }), text: textBuzz(c.content, { name, unsubscribe }),
          headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        };
      }));
      if (error) { console.error('Buzz batch error:', error); break; }
      await supabase.from('buzz_sends').insert(batch.map((p) => ({ campaign_id: c.id, user_id: p.id })));
      sent += batch.length;
    }
    await supabase.from('buzz_campaigns').update({ sent_count: (c.sent_count || 0) + sent }).eq('id', c.id);
    console.log(`The Buzz ${c.id}: sent ${sent}`);
    res.json({ success: true, sent, campaign: c.id });
  } catch (err) {
    console.error('Buzz send error:', err);
    res.status(500).json({ success: false, error: 'Send failed' });
  }
};

// One-click unsubscribe (GET from the email link, POST from mail apps).
export const unsubscribeBuzz = async (req, res) => {
  const u = String(req.query.u || '');
  const t = String(req.query.t || '');
  if (!u || !safeEqual(t, unsubToken(u))) return res.status(400).send('Invalid link.');
  await supabase.from('profiles').update({ marketing_opt_out: true }).eq('id', u);
  if (req.method === 'POST') return res.status(200).end();
  res.send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#07120a;color:#f1ece2;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px"><div><p style="letter-spacing:6px;color:#e7c65f;font-size:13px">THE BUZZ</p><h1 style="font-weight:400">You’re off the list.</h1><p style="font-family:Arial,sans-serif;color:#9fb0a4">No more Buzz emails. Order and account emails still come through.<br/>Changed your mind? Switch it back on in your <a href="https://unihive.shop/profile" style="color:#e7c65f">profile</a>.</p></div></body>`);
};
