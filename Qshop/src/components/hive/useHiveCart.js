// Per-event cart kept in this browser (localStorage), synced across tabs
// and across HIVE pages. Checkout happens server-side via
// wallet_checkout_cart, which prices every line itself.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../SupabaseClient';

const key = (eventId) => `hive-cart:${eventId}`;
const EVT = 'hive-cart-change';

const read = (eventId) => {
  try { return JSON.parse(localStorage.getItem(key(eventId)) || '{}'); } catch { return {}; }
};

export default function useHiveCart(eventId) {
  const [cart, setCart] = useState(() => (eventId ? read(eventId) : {}));

  useEffect(() => {
    if (!eventId) return;
    setCart(read(eventId));
    const sync = () => setCart(read(eventId));
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, [eventId]);

  const write = useCallback((next) => {
    try { localStorage.setItem(key(eventId), JSON.stringify(next)); } catch { /* storage blocked */ }
    setCart(next);
    window.dispatchEvent(new Event(EVT));
  }, [eventId]);

  const setQty = useCallback((productId, qty) => {
    const next = { ...read(eventId) };
    if (qty <= 0) delete next[productId]; else next[productId] = Math.min(qty, 20);
    write(next);
  }, [eventId, write]);

  const add = useCallback((productId) => setQty(productId, (read(eventId)[productId] || 0) + 1), [eventId, setQty]);
  const clear = useCallback(() => write({}), [write]);

  const checkout = useCallback(async () => {
    const items = Object.entries(read(eventId)).map(([product_id, quantity]) => ({ product_id, quantity }));
    const { data, error } = await supabase.rpc('wallet_checkout_cart', { p_event_id: eventId, p_items: items });
    if (error) throw error;
    write({});
    return data || [];
  }, [eventId, write]);

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  return { cart, count, add, setQty, clear, checkout };
}

export const cartTotal = (cart, products) =>
  Object.entries(cart).reduce((sum, [id, q]) => sum + Number(products.find((p) => p.id === id)?.price || 0) * q, 0);
