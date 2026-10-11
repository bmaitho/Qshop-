// Event cart — drawer on the event page, inline panel on the wallet page.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, X, Loader2, ShoppingBag, CheckCircle2 } from 'lucide-react';
import QRCode from '../QRCode';
import { cartTotal } from './useHiveCart';
import { HIVE_SLUG } from './hiveMedia';

const ksh = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE')}`;

export function CartPanel({ cartApi, products, balance, user, onLogin, onDone, onTopUp }) {
  const navigate = useNavigate();
  const { cart, setQty, checkout } = cartApi;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(null);
  const lines = Object.entries(cart).map(([id, q]) => ({ product: products.find((p) => p.id === id), q })).filter((l) => l.product);
  const total = cartTotal(cart, products);
  const shortfall = Math.max(0, Math.ceil(total - Number(balance || 0)));

  const pay = async () => {
    if (!user) return onLogin();
    setBusy(true);
    setError('');
    try {
      setPaid(await checkout());
      onDone?.();
    } catch (err) {
      setError(/Insufficient/.test(err.message) ? 'Not enough in your wallet yet — top up the difference.' : err.message || 'Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return (
      <div className="space-y-4 hive-fade-in">
        <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-5 h-5" /> <span className="font-semibold">Paid from your wallet</span></div>
        <p className="text-sm text-white/55">Show each QR at the stand. They also live in your HIVE Wallet.</p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {paid.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="bg-white p-2 rounded-xl shrink-0"><QRCode value={e.qr_token} size={84} fgColor="#000000" bgColor="#ffffff" /></div>
              <p className="text-white font-semibold">{e.product_name}{e.quantity > 1 ? ` ×${e.quantity}` : ''}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="text-center py-8">
        <ShoppingBag className="w-8 h-8 text-white/25 mx-auto" />
        <p className="hive-accent text-white/55 text-lg mt-3">Your cart is empty.</p>
        <button onClick={() => navigate(`/events/${HIVE_SLUG}?tab=shop`)} className="mt-4 text-sm text-[#e7c65f]">Browse bar & bites →</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
        {lines.map(({ product: p, q }) => (
          <div key={p.id} className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
              {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-semibold truncate">{p.name}</p>
              <p className="text-xs text-white/45">{ksh(p.price)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setQty(p.id, q - 1)} aria-label="Less" className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
              <span className="w-5 text-center text-sm tabular-nums">{q}</span>
              <button onClick={() => setQty(p.id, q + 1)} aria-label="More" className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 pt-4 space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-white/55">Total</span><span className="font-bold text-white">{ksh(total)}</span></div>
        {user && <div className="flex justify-between"><span className="text-white/55">Wallet</span><span className="text-white/80">{ksh(balance)}</span></div>}
      </div>
      {error && <p className="text-sm text-[#ff8a92]">{error}</p>}
      {user && shortfall > 0 ? (
        <button onClick={() => (onTopUp ? onTopUp(shortfall) : navigate(`/events/${HIVE_SLUG}/wallet?topup=${shortfall}`))} className="w-full hive-btn-gold rounded-full py-3.5 font-bold">
          Top up {ksh(shortfall)} to pay
        </button>
      ) : (
        <button onClick={pay} disabled={busy} className="w-full hive-btn-blood rounded-full py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {user ? `Pay ${ksh(total)} from wallet` : 'Log in to check out'}
        </button>
      )}
    </div>
  );
}

export default function CartDrawer({ open, onClose, ...panel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="w-full sm:w-[420px] h-full bg-[#0b0708] border-l border-white/10 p-5 sm:p-6 flex flex-col hive-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="hive-display text-white text-xl font-bold">Your cart</h2>
          <button onClick={onClose} aria-label="Close cart" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <CartPanel {...panel} />
      </aside>
    </div>
  );
}
