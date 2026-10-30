// Brand partner dashboard (/partner): live sales and redemptions for the
// partner's own items, stock switches, and a scanner limited to their brand.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ScanLine, LayoutDashboard, Package, ExternalLink } from 'lucide-react';
import { supabase } from '../SupabaseClient';
import HiveShell from './HiveShell';
import HiveScanner from './HiveScanner';
import HiveShare from './HiveShare';
import useStaffGate from './useStaffGate';
import { Gate, itemScanner } from '../VendorRedeem';
import { HIVE_SLUG } from './hiveMedia';
import { img } from '../../utils/ImageUtils';

const ksh = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE')}`;
const ago = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};
const SHOP_FILTER = { smirnoff: 'smirnoff', redbull: 'redbull', harrisons: 'harrisons' };

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">{label}</p>
      <p className="hive-display text-white text-2xl sm:text-3xl font-bold mt-2 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const gate = useStaffGate();
  const [active, setActive] = useState(null);
  const [tab, setTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [ents, setEnts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const isAdmin = !!gate.profile?.is_admin;
  const scan = useMemo(() => itemScanner({ isAdmin }), [isAdmin]);

  useEffect(() => { if (!active && gate.partners.length) setActive(gate.partners[0]); }, [gate.partners, active]);

  const load = useCallback(async () => {
    if (!active) return;
    const [{ data: pr }, { data: en }] = await Promise.all([
      supabase.from('event_products').select('*').eq('partner_id', active.id).order('display_order'),
      supabase.from('event_entitlements').select('id, product_name, quantity, status, created_at, redeemed_at').eq('partner_id', active.id).order('created_at', { ascending: false }).limit(500),
    ]);
    setProducts(pr || []);
    setEnts(en || []);
    setLoading(false);
  }, [active]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 20000);
    return () => clearInterval(t);
  }, [load]);

  const stats = useMemo(() => {
    const price = Object.fromEntries(products.map((p) => [p.name, Number(p.price)]));
    const units = ents.reduce((s, e) => s + e.quantity, 0);
    const redeemed = ents.filter((e) => e.status === 'redeemed').reduce((s, e) => s + e.quantity, 0);
    const revenue = ents.reduce((s, e) => s + (price[e.product_name] || 0) * e.quantity, 0);
    const byProduct = {};
    ents.forEach((e) => { byProduct[e.product_name] = (byProduct[e.product_name] || 0) + e.quantity; });
    return { units, redeemed, waiting: units - redeemed, revenue, byProduct };
  }, [ents, products]);

  const toggle = async (p) => {
    setToggling(p.id);
    const { data, error } = await supabase.rpc('partner_set_product_active', { p_product_id: p.id, p_active: !p.active });
    if (!error && data) setProducts((xs) => xs.map((x) => (x.id === p.id ? data : x)));
    setToggling(null);
  };

  const login = () => { sessionStorage.setItem('postLoginRedirect', '/partner'); navigate('/auth'); };
  const allowed = gate.partners.length > 0;
  const shopPath = `/events/${HIVE_SLUG}?tab=shop${SHOP_FILTER[active?.slug] ? `&brand=${SHOP_FILTER[active.slug]}` : ''}`;

  return (
    <HiveShell>
      <Gate loading={gate.loading} user={gate.user} allowed={allowed} title="Partner dashboard" onLogin={login} />
      {!gate.loading && gate.user && allowed && active && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              {active.logo_url && <img src={active.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover bg-white/5" />}
              <div>
                <p className="text-[11px] tracking-[0.4em] text-[#ff7a1a] font-semibold">{active.role === 'admin' ? 'ADMIN VIEW · THE HIVE' : 'PARTNER · THE HIVE'}</p>
                <h1 className="hive-display hive-gold-text text-3xl sm:text-4xl font-extrabold">{active.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {gate.partners.length > 1 && (
                <select value={active.id} onChange={(e) => { setLoading(true); setActive(gate.partners.find((p) => p.id === e.target.value)); }} className="hive-input !w-auto !py-2 text-sm">
                  {gate.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <button onClick={() => navigate(shopPath)} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 flex items-center gap-2">Your stand <ExternalLink className="w-3.5 h-3.5" /></button>
              <HiveShare size="md" path={shopPath} title={`${active.name} at THE HIVE: NO GOING HOME`} text="Pre-order and skip the queue." />
            </div>
          </div>

          <div className="inline-flex p-1 rounded-full bg-white/[0.05] border border-white/10 mt-8">
            {[['overview', 'Overview', LayoutDashboard], ['products', 'Products', Package], ['scan', 'Scan', ScanLine]].map(([k, l, I]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-4 sm:px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${tab === k ? 'hive-btn-blood' : 'text-white/55'}`}>
                <I className="w-4 h-4" /> {l}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#e7c65f]" /></div>
          ) : tab === 'overview' ? (
            <div className="mt-6 space-y-8 hive-fade-in">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Sold" value={stats.units} sub="items pre-ordered" />
                <Stat label="Revenue" value={ksh(stats.revenue)} sub="at current prices" />
                <Stat label="Redeemed" value={stats.redeemed} sub="handed over" />
                <Stat label="Waiting" value={stats.waiting} sub="to collect at your stand" />
              </div>
              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
                <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-5">
                  <h2 className="hive-display text-white text-lg font-bold mb-4">Best sellers</h2>
                  {Object.keys(stats.byProduct).length === 0 ? <p className="text-white/45 text-sm">No sales yet — share your stand.</p> : (
                    <div className="space-y-3">
                      {Object.entries(stats.byProduct).sort((a, b) => b[1] - a[1]).map(([name, n]) => {
                        const max = Math.max(...Object.values(stats.byProduct));
                        return (
                          <div key={name}>
                            <div className="flex justify-between text-sm"><span className="text-white/85">{name}</span><span className="text-white/55 tabular-nums">{n}</span></div>
                            <div className="h-1.5 rounded-full bg-white/5 mt-1.5 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#c3121f] to-[#e7c65f]" style={{ width: `${(n / max) * 100}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-5">
                  <h2 className="hive-display text-white text-lg font-bold mb-4">Live activity</h2>
                  {ents.length === 0 ? <p className="text-white/45 text-sm">Orders will appear here as they come in.</p> : (
                    <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto pr-1">
                      {ents.slice(0, 40).map((e) => (
                        <div key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                          <span className="text-white/85">{e.product_name}{e.quantity > 1 ? ` ×${e.quantity}` : ''}</span>
                          <span className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${e.status === 'redeemed' ? 'text-emerald-400' : 'text-amber-300'}`}>{e.status === 'redeemed' ? 'Redeemed' : 'Waiting'}</span>
                            <span className="text-white/35 text-xs w-14 text-right">{ago(e.redeemed_at || e.created_at)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : tab === 'products' ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 hive-fade-in">
              {products.map((p) => (
                <div key={p.id} className={`rounded-[22px] border border-white/10 bg-white/[0.02] overflow-hidden ${p.active ? '' : 'opacity-60'}`}>
                  <div className="aspect-[4/3] bg-black">{p.image_url && <img src={img(p.image_url, 320)} alt="" className="w-full h-full object-cover" />}</div>
                  <div className="p-4">
                    <div className="flex justify-between gap-3">
                      <p className="text-white font-semibold">{p.name}</p>
                      <p className="text-[#e7c65f] font-bold shrink-0">{ksh(p.price)}</p>
                    </div>
                    <p className="text-xs text-white/40 mt-1">{stats.byProduct[p.name] || 0} sold</p>
                    <button onClick={() => toggle(p)} disabled={toggling === p.id} className={`mt-4 w-full rounded-full py-2.5 text-sm font-bold border ${p.active ? 'border-emerald-500/40 text-emerald-300' : 'border-white/20 text-white/60'}`}>
                      {toggling === p.id ? 'Saving…' : p.active ? 'In stock · tap to mark sold out' : 'Sold out · tap to restock'}
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-white/40 sm:col-span-2 lg:col-span-3">Price or photo changes go through the UniHive team so what buyers paid always matches the menu.</p>
            </div>
          ) : (
            <div className="mt-6 max-w-md hive-fade-in">
              <HiveScanner lookup={scan.lookup} act={scan.redeem} onCompleted={load} hint={`Scan a ${active.name} QR`} />
            </div>
          )}
        </div>
      )}
    </HiveShell>
  );
}
