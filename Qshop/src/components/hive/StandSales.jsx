// Stand sales for the partner dashboard: staff tap a product, pick a quantity
// and Cash or M-Pesa to log each sale made at the stand. Prices come from the
// menu (log_stand_sale); undo is the seller within 15 min, or the brand owner.
// Admins also see every brand's totals.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Minus, Plus, Undo2, Banknote, Smartphone } from 'lucide-react';
import { supabase } from '../SupabaseClient';
import { img } from '../../utils/ImageUtils';

const ksh = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE')}`;
const time = (ts) => new Date(ts).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
const UNDO_MS = 15 * 60 * 1000;

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">{label}</p>
      <p className="hive-display text-white text-2xl font-bold mt-2 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

function totals(rows) {
  const live = rows.filter((s) => !s.voided_at);
  const sum = (xs) => xs.reduce((a, s) => a + Number(s.amount), 0);
  return {
    units: live.reduce((a, s) => a + s.quantity, 0),
    revenue: sum(live),
    cash: sum(live.filter((s) => s.payment_method === 'cash')),
    mpesa: sum(live.filter((s) => s.payment_method === 'mpesa')),
    live,
  };
}

export default function StandSales({ partner, products, userId, isOwner, isAdmin, partners }) {
  const [sales, setSales] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('event_stand_sales').select('*')
      .eq('partner_id', partner.id).order('created_at', { ascending: false }).limit(1000);
    const rows = data || [];
    setSales(rows);
    if (isAdmin && partner.event_id) {
      const { data: all } = await supabase.from('event_stand_sales').select('partner_id, quantity, amount, payment_method, voided_at')
        .eq('event_id', partner.event_id).limit(5000);
      setAllSales(all || []);
    }
    const ids = [...new Set(rows.map((s) => s.sold_by))].filter((id) => !names[id]);
    if (ids.length) {
      const { data: ppl } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      setNames((n) => ({ ...n, ...Object.fromEntries((ppl || []).map((p) => [p.id, p.full_name || 'Staff'])) }));
    }
    setLoading(false);
  }, [partner.id, partner.event_id, isAdmin, names]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.id]);

  const stats = useMemo(() => totals(sales), [sales]);
  const byProduct = useMemo(() => {
    const m = {};
    stats.live.forEach((s) => { const x = (m[s.product_name] ||= { units: 0, amount: 0 }); x.units += s.quantity; x.amount += Number(s.amount); });
    return Object.entries(m).sort((a, b) => b[1].amount - a[1].amount);
  }, [stats]);
  const byStaff = useMemo(() => {
    const m = {};
    stats.live.forEach((s) => { const x = (m[s.sold_by] ||= { units: 0, amount: 0 }); x.units += s.quantity; x.amount += Number(s.amount); });
    return Object.entries(m).sort((a, b) => b[1].amount - a[1].amount);
  }, [stats]);
  const byBrand = useMemo(() => {
    const m = {};
    allSales.forEach((s) => { (m[s.partner_id] ||= []).push(s); });
    return (partners || []).map((p) => ({ p, t: totals(m[p.id] || []) })).filter((x) => x.t.units > 0).sort((a, b) => b.t.revenue - a.t.revenue);
  }, [allSales, partners]);

  const log = async (method) => {
    setBusy(method); setNote('');
    const { error } = await supabase.rpc('log_stand_sale', { p_product_id: picked.id, p_quantity: qty, p_payment_method: method });
    setBusy('');
    if (error) { setNote(error.message); return; }
    setNote(`Logged ${qty} × ${picked.name} · ${method === 'cash' ? 'Cash' : 'M-Pesa'} · ${ksh(picked.price * qty)}`);
    setPicked(null); setQty(1);
    load();
  };

  const undo = async (s) => {
    setBusy(s.id); setNote('');
    const { error } = await supabase.rpc('undo_stand_sale', { p_sale_id: s.id });
    setBusy('');
    if (error) setNote(error.message); else { setNote('Sale undone.'); load(); }
  };

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#e7c65f]" /></div>;

  return (
    <div className="mt-6 space-y-8 hive-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Stand sales" value={ksh(stats.revenue)} sub={`${stats.units} item${stats.units === 1 ? '' : 's'}`} />
        <Stat label="Cash" value={ksh(stats.cash)} />
        <Stat label="M-Pesa" value={ksh(stats.mpesa)} />
        <Stat label="Sales logged" value={stats.live.length} sub="tap a product to add one" />
      </div>

      <section>
        <h2 className="hive-display text-white text-lg font-bold mb-1">Log a sale</h2>
        <p className="text-white/45 text-sm mb-4">Tap what you sold, choose how many, then Cash or M-Pesa.</p>
        {note && <p className="text-[#e7c65f] text-sm mb-3">{note}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <button key={p.id} onClick={() => { setPicked(p); setQty(1); setNote(''); }}
              className={`text-left rounded-[18px] border overflow-hidden bg-white/[0.02] ${picked?.id === p.id ? 'border-[#e7c65f]' : 'border-white/10 hover:border-white/30'}`}>
              <div className="aspect-[4/3] bg-black">{p.image_url && <img src={img(p.image_url, 240)} alt="" className="w-full h-full object-cover" />}</div>
              <div className="p-3">
                <p className="text-white text-sm font-semibold leading-tight">{p.name}</p>
                <p className="text-[#e7c65f] text-sm font-bold mt-1">{ksh(p.price)}</p>
              </div>
            </button>
          ))}
        </div>
        {picked && (
          <div className="sticky bottom-4 mt-4 rounded-[22px] border border-[#e7c65f]/40 bg-[#0d0809]/95 backdrop-blur p-4 flex flex-wrap items-center gap-3">
            <p className="text-white font-semibold mr-auto">{picked.name} · <span className="text-[#e7c65f]">{ksh(picked.price * qty)}</span></p>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center" aria-label="Less"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center text-white text-lg font-bold tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(100, q + 1))} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center" aria-label="More"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={() => log('cash')} disabled={!!busy} className="rounded-full px-5 py-3 text-sm font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 flex items-center gap-2 disabled:opacity-50">
              {busy === 'cash' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />} Cash
            </button>
            <button onClick={() => log('mpesa')} disabled={!!busy} className="rounded-full px-5 py-3 text-sm font-bold hive-btn-gold flex items-center gap-2 disabled:opacity-50">
              {busy === 'mpesa' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />} M-Pesa
            </button>
            <button onClick={() => setPicked(null)} className="text-sm text-white/50 px-2">Cancel</button>
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-5">
          <h2 className="hive-display text-white text-lg font-bold mb-4">By product</h2>
          {byProduct.length === 0 ? <p className="text-white/45 text-sm">No stand sales yet.</p> : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/5">
                {byProduct.map(([name, x]) => (
                  <tr key={name}><td className="py-2 text-white/85">{name}</td><td className="py-2 text-right text-white/55 tabular-nums">{x.units}</td><td className="py-2 text-right text-white tabular-nums w-28">{ksh(x.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-5">
          <h2 className="hive-display text-white text-lg font-bold mb-4">By staff</h2>
          {byStaff.length === 0 ? <p className="text-white/45 text-sm">No stand sales yet.</p> : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/5">
                {byStaff.map(([id, x]) => (
                  <tr key={id}><td className="py-2 text-white/85">{names[id] || 'Staff'}</td><td className="py-2 text-right text-white/55 tabular-nums">{x.units}</td><td className="py-2 text-right text-white tabular-nums w-28">{ksh(x.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-5">
        <h2 className="hive-display text-white text-lg font-bold mb-4">Recent sales</h2>
        {sales.length === 0 ? <p className="text-white/45 text-sm">Sales you log appear here.</p> : (
          <div className="divide-y divide-white/5 max-h-[460px] overflow-y-auto pr-1">
            {sales.slice(0, 60).map((s) => {
              const canUndo = !s.voided_at && (isOwner || (s.sold_by === userId && Date.now() - new Date(s.created_at).getTime() < UNDO_MS));
              return (
                <div key={s.id} className={`flex items-center justify-between gap-3 py-2.5 text-sm ${s.voided_at ? 'opacity-40 line-through' : ''}`}>
                  <span className="text-white/85">{s.product_name}{s.quantity > 1 ? ` ×${s.quantity}` : ''}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">{s.payment_method === 'cash' ? 'Cash' : 'M-Pesa'}</span>
                    <span className="text-white/45 text-xs hidden sm:inline">{names[s.sold_by] || ''}</span>
                    <span className="text-white tabular-nums w-20 text-right">{ksh(s.amount)}</span>
                    <span className="text-white/35 text-xs w-12 text-right">{time(s.created_at)}</span>
                    {canUndo ? (
                      <button onClick={() => undo(s)} disabled={busy === s.id} className="text-white/50 hover:text-[#ff8a92] p-1" aria-label="Undo sale">
                        {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                      </button>
                    ) : <span className="w-6" />}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="rounded-[22px] border border-[#e7c65f]/25 bg-white/[0.02] p-5">
          <h2 className="hive-display text-white text-lg font-bold mb-4">All brands · admin view</h2>
          {byBrand.length === 0 ? <p className="text-white/45 text-sm">No stand sales logged by any brand yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-white/40 text-xs uppercase tracking-wider"><th className="text-left py-2">Brand</th><th className="text-right">Items</th><th className="text-right">Cash</th><th className="text-right">M-Pesa</th><th className="text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {byBrand.map(({ p, t }) => (
                  <tr key={p.id}><td className="py-2 text-white/85">{p.name}</td><td className="text-right text-white/55 tabular-nums">{t.units}</td><td className="text-right tabular-nums">{ksh(t.cash)}</td><td className="text-right tabular-nums">{ksh(t.mpesa)}</td><td className="text-right text-white font-bold tabular-nums">{ksh(t.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
