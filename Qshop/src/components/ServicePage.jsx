import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import GoodsServicesToggle from "./GoodsServicesToggle";
import ServiceCheckout from "./ServiceCheckout";

// ─── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Palette & tokens ─────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --bg: #060e09;
    --surface: #0d2318;
    --surface2: #113b1e;
    --border: rgba(231,198,95,0.12);
    --accent: #e7c65f;
    --accent2: #f0d98a;
    --text: #f0f0f5;
    --muted: #7a9e85;
    --green: #22c55e;
    --radius: 16px;
  }

  /* ── Light mode overrides ── */
  .light {
    --bg: #f4f1ec;
    --surface: #ffffff;
    --surface2: #f0ede8;
    --border: rgba(17,59,30,0.12);
    --accent: #e7c65f;
    --accent2: #b8922a;
    --text: #113b1e;
    --muted: #4a7060;
    --green: #16a34a;
    --radius: 16px;
  }

  .light .feature-pill {
    background: rgba(17,59,30,0.06);
  }

  .light .badge-tag.popular { color: #16a34a; border-color: rgba(22,163,74,0.3); background: rgba(22,163,74,0.1); }
  .light .badge-tag.modern  { color: #0284c7; border-color: rgba(2,132,199,0.3); background: rgba(2,132,199,0.1); }
  .light .badge-tag.luxury  { color: #7c3aed; border-color: rgba(124,58,237,0.3); background: rgba(124,58,237,0.1); }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .services-root {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    min-height: 100vh;
    color: var(--text);
  }

  /* ── Toggle ── */
  .mode-toggle-wrap {
    display: flex;
    justify-content: center;
    padding: 28px 20px 0;
  }

  .mode-toggle {
    display: flex;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 4px;
    gap: 4px;
    position: relative;
  }

  .toggle-btn {
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 28px;
    border-radius: 100px;
    border: none;
    cursor: pointer;
    letter-spacing: 0.02em;
    transition: all 0.25s ease;
    background: transparent;
    color: var(--muted);
    position: relative;
    z-index: 1;
  }

  .toggle-btn.active {
    background: var(--accent);
    color: #113b1e;
    box-shadow: 0 0 24px rgba(231,198,95,0.35);
  }

  /* ── Hero strip ── */
  .services-hero {
    padding: 48px 24px 24px;
    text-align: center;
  }

  .services-hero h1 {
    font-family: 'Syne', sans-serif;
    font-size: clamp(28px, 6vw, 48px);
    font-weight: 800;
    line-height: 1.1;
    background: linear-gradient(135deg, var(--text) 30%, var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 10px;
  }

  .services-hero p {
    color: var(--muted);
    font-size: 15px;
    max-width: 420px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* ── Provider card ── */
  .provider-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    padding: 16px 24px 48px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .provider-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .provider-card:hover {
    transform: translateY(-4px);
    border-color: rgba(231,198,95,0.3);
    box-shadow: 0 16px 48px rgba(0,0,0,0.4);
  }

  .card-banner {
    height: 160px;
    background: linear-gradient(135deg, #0a2412 0%, #113b1e 50%, #1a4a28 100%);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    padding: 16px;
  }

  .light .card-banner {
    background: linear-gradient(135deg, #1a5c30 0%, #22763d 50%, #2d8f4e 100%);
  }

  .card-banner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }

  .card-banner-emoji {
    font-size: 48px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    opacity: 0.8;
  }

  .verified-badge {
    background: rgba(34,197,94,0.15);
    border: 1px solid rgba(34,197,94,0.3);
    color: var(--green);
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 100px;
    letter-spacing: 0.05em;
    font-family: 'Syne', sans-serif;
  }

  .card-body {
    padding: 20px;
  }

  .provider-name {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .provider-tagline {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 16px;
  }

  /* ── Active service pill ── */
  .active-service {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 16px;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .active-service:hover {
    border-color: rgba(231,198,95,0.4);
  }

  .service-label {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
    letter-spacing: 0.08em;
    font-family: 'Syne', sans-serif;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .service-name {
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .service-meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .meta-chip {
    font-size: 12px;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* ── Price range ── */
  .price-range {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .price-from {
    font-size: 13px;
    color: var(--muted);
  }

  .price-value {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: var(--accent2);
  }

  .book-btn {
    background: var(--accent);
    color: #113b1e;
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: background 0.2s, box-shadow 0.2s;
  }

  .book-btn:hover {
    background: #f0d98a;
    box-shadow: 0 4px 16px rgba(231,198,95,0.4);
  }

  /* ── Expanded service detail ── */
  .service-detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(6px);
    z-index: 100;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

  .service-detail-sheet {
    background: var(--surface);
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 680px;
    max-height: 92vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease;
    border: 1px solid var(--border);
    border-bottom: none;
  }

  .sheet-handle {
    width: 40px;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin: 12px auto 0;
  }

  .sheet-header {
    padding: 20px 24px 0;
  }

  .sheet-title {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 800;
    margin: 12px 0 4px;
  }

  .sheet-dates {
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 20px;
  }

  .sheet-body {
    padding: 0 24px 32px;
  }

  .category-section {
    margin-bottom: 24px;
  }

  .category-title {
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .required-tag {
    background: rgba(231,198,95,0.12);
    color: var(--accent);
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 100px;
    text-transform: none;
    letter-spacing: 0;
  }

  .optional-tag {
    background: rgba(107,107,128,0.15);
    color: var(--muted);
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 100px;
    text-transform: none;
    letter-spacing: 0;
  }

  .components-grid {
    display: grid;
    gap: 10px;
  }

  .component-card {
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .component-card:hover {
    border-color: rgba(231,198,95,0.25);
  }

  .component-card.selected {
    border-color: var(--accent);
    background: rgba(231,198,95,0.08);
  }

  .component-left { flex: 1; }

  .component-name {
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .badge-tag {
    font-size: 10px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 100px;
    background: rgba(255,179,71,0.15);
    color: var(--accent2);
    border: 1px solid rgba(255,179,71,0.3);
  }

  .badge-tag.luxury { background: rgba(168,85,247,0.15); color: #c084fc; border-color: rgba(168,85,247,0.3); }
  .badge-tag.popular { background: rgba(34,197,94,0.12); color: #4ade80; border-color: rgba(34,197,94,0.3); }
  .badge-tag.modern { background: rgba(56,189,248,0.12); color: #38bdf8; border-color: rgba(56,189,248,0.3); }

  .component-features {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 6px;
  }

  .feature-pill {
    font-size: 11px;
    color: var(--muted);
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 100px;
  }

  .component-right {
    text-align: right;
    flex-shrink: 0;
  }

  .component-price {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
  }

  .capacity-text {
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }

  .check-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--accent);
    background: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
    flex-shrink: 0;
  }

  /* ── Booking summary ── */
  .booking-summary {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 18px;
    margin-top: 8px;
    position: sticky;
    bottom: 0;
  }

  .summary-title {
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 12px;
  }

  .summary-lines { display: grid; gap: 8px; margin-bottom: 14px; }

  .summary-line {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }

  .summary-line.total {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .summary-line .label { color: var(--muted); }
  .summary-line .val { color: var(--text); font-weight: 500; }

  .deposit-note {
    background: rgba(255,179,71,0.08);
    border: 1px solid rgba(255,179,71,0.2);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 12px;
    color: var(--accent2);
    margin-bottom: 14px;
    line-height: 1.5;
  }

  .cta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .cta-btn {
    border: none;
    border-radius: 12px;
    padding: 14px;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.02em;
  }

  .cta-deposit {
    background: var(--surface);
    border: 1.5px solid var(--accent);
    color: var(--accent);
  }

  .cta-deposit:hover { background: rgba(231,198,95,0.08); }

  .cta-full {
    background: var(--accent);
    color: #113b1e;
    box-shadow: 0 4px 20px rgba(231,198,95,0.3);
  }

  .cta-full:hover { background: #f0d98a; }
  .cta-full:disabled { opacity: 0.4; cursor: not-allowed; }

  .close-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: color 0.2s;
  }

  .close-btn:hover { color: var(--text); }

  .empty-state {
    text-align: center;
    padding: 80px 24px;
    color: var(--muted);
  }

  .empty-state h2 {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    margin-bottom: 8px;
    color: var(--text);
  }

  .loading-pulse {
    display: flex;
    gap: 8px;
    justify-content: center;
    padding: 60px;
  }

  .pulse-dot {
    width: 10px; height: 10px;
    background: var(--accent);
    border-radius: 50%;
    animation: pulse 1.2s ease infinite;
  }

  .pulse-dot:nth-child(2) { animation-delay: 0.2s; }
  .pulse-dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes pulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 20px 0;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `KES ${Number(n).toLocaleString()}`;

const CATEGORY_ICONS = {
  "SGR Transport": "🚊",
  "Accommodation": "🏠",
  "Vehicle Hire": "🚗",
  "Add-ons": "✨",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function ServicesPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeService, setActiveService] = useState(null);
  const [categories, setCategories] = useState([]);
  const [components, setComponents] = useState([]);
  const [selected, setSelected] = useState({}); // { category_id: [component_id] }
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPaymentType, setCheckoutPaymentType] = useState('full');

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    setLoading(true);
    const { data: providerData } = await supabase
      .from("service_providers")
      .select(`*, services(*, service_component_categories(*, service_components(*)))`)
      .eq("is_active", true);
    setProviders(providerData || []);
    setLoading(false);
  }

  async function openService(service) {
    setActiveService(service);
    setSelected({});

    const { data: cats } = await supabase
      .from("service_component_categories")
      .select("*")
      .eq("service_id", service.id)
      .order("display_order");

    const { data: comps } = await supabase
      .from("service_components")
      .select("*")
      .eq("service_id", service.id)
      .eq("is_active", true)
      .order("display_order");

    setCategories(cats || []);
    setComponents(comps || []);
    setSheetOpen(true);
  }

  function toggleComponent(cat, comp) {
    setSelected((prev) => {
      const isMulti = cat.is_multi;
      const current = prev[cat.id] || [];

      if (isMulti) {
        // toggle in/out
        const exists = current.includes(comp.id);
        return {
          ...prev,
          [cat.id]: exists
            ? current.filter((id) => id !== comp.id)
            : [...current, comp.id],
        };
      } else {
        // single select
        return { ...prev, [cat.id]: [comp.id] };
      }
    });
  }

  function isSelected(catId, compId) {
    return (selected[catId] || []).includes(compId);
  }

  function getSelectedComponents() {
    const ids = Object.values(selected).flat();
    return components.filter((c) => ids.includes(c.id));
  }

  function getTotal() {
    return getSelectedComponents().reduce((sum, c) => sum + Number(c.price), 0);
  }

  function getDeposit() {
    return Math.ceil((getTotal() * (activeService?.deposit_percentage || 53.3)) / 100);
  }

  function requiredCatsMet() {
    if (!categories.length) return false;
    return categories
      .filter((c) => c.is_required)
      .every((c) => (selected[c.id] || []).length > 0);
  }

  // SGR Transport must always be paid in full — no deposit allowed
  function hasSGRSelected() {
    const sgrCat = categories.find((c) => c.name === "SGR Transport");
    if (!sgrCat) return false;
    return (selected[sgrCat.id] || []).length > 0;
  }

  function getMinPrice(provider) {
    const comps = provider.services?.flatMap(
      (s) => s.service_component_categories?.flatMap((cat) => cat.service_components || []) || []
    ) || [];
    if (!comps.length) return 0;
    return Math.min(...comps.map((c) => Number(c.price)));
  }

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => { setActiveService(null); setCategories([]); setComponents([]); }, 300);
  };

  const selectedComps = getSelectedComponents();
  const total = getTotal();
  const deposit = getDeposit();

  return (
    <>
      <style>{styles}</style>
      <div className="services-root">

        {/* ── Hero */}
        <div className="services-hero">
          <h1>Experiences & Services</h1>
          <p>Curated trips, events, and experiences — book directly through UniHive.</p>
          {/* ── Toggle below subtitle */}
          <div className="mode-toggle-wrap" style={{ padding: '24px 20px 0' }}>
            <GoodsServicesToggle />
          </div>
        </div>

        {/* ── Provider grid */}
        {loading ? (
          <div className="loading-pulse">
            <div className="pulse-dot" />
            <div className="pulse-dot" />
            <div className="pulse-dot" />
          </div>
        ) : providers.length === 0 ? (
          <div className="empty-state">
            <h2>No services yet</h2>
            <p>Check back soon — experiences are coming.</p>
          </div>
        ) : (
          <div className="provider-grid">
            {providers.map((provider) => {
              const activeServices = provider.services?.filter(
                (s) => s.status === "active" || s.status === "sold_out"
              ) || [];
              const minPrice = getMinPrice(provider);

              return (
                <div className="provider-card" key={provider.id}>
                  <div className="card-banner">
                    <span className="card-banner-emoji">🏖️</span>
                    {provider.is_verified && (
                      <span className="verified-badge">✓ VERIFIED</span>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="provider-name">{provider.name}</div>
                    <div className="provider-tagline">{provider.description}</div>

                    {activeServices.map((service) => (
                      <div
                        key={service.id}
                        className="active-service"
                        onClick={() => openService({ ...service, commission_rate: provider.commission_rate })}
                      >
                        <div className="service-label">
                          {service.status === "sold_out" ? "🔴 SOLD OUT" : "🟢 BOOKING OPEN"}
                        </div>
                        <div className="service-name">{service.name}</div>
                        <div className="service-meta">
                          <span className="meta-chip">
                            📅{" "}
                            {new Date(service.trip_start_date).toLocaleDateString("en-KE", {
                              day: "numeric", month: "short",
                            })}{" "}
                            –{" "}
                            {new Date(service.trip_end_date).toLocaleDateString("en-KE", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                          <span className="meta-chip">
                            💳 Deposit available ({service.deposit_percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}

                    <div className="price-range">
                      <div>
                        <div className="price-from">Starting from</div>
                        <div className="price-value">{fmt(minPrice)}</div>
                      </div>
                      {activeServices.length > 0 && (
                        <button
                          className="book-btn"
                          onClick={() => openService({ ...activeServices[0], commission_rate: provider.commission_rate })}
                        >
                          Build Package →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Service detail sheet */}
        {sheetOpen && activeService && (
          <div className="service-detail-overlay" onClick={(e) => e.target === e.currentTarget && closeSheet()}>
            <div className="service-detail-sheet">
              <div className="sheet-handle" />
              <div className="sheet-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="service-label">🟢 BOOKING OPEN</span>
                  <button className="close-btn" onClick={closeSheet}>✕ Close</button>
                </div>
                <div className="sheet-title">{activeService.name}</div>
                <div className="sheet-dates">
                  📅{" "}
                  {new Date(activeService.trip_start_date).toLocaleDateString("en-KE", {
                    weekday: "short", day: "numeric", month: "long", year: "numeric",
                  })}{" "}
                  →{" "}
                  {new Date(activeService.trip_end_date).toLocaleDateString("en-KE", {
                    weekday: "short", day: "numeric", month: "long", year: "numeric",
                  })}
                </div>
              </div>

              <div className="sheet-body">
                {categories.map((cat) => {
                  const catComps = components.filter((c) => c.category_id === cat.id);
                  return (
                    <div className="category-section" key={cat.id}>
                      <div className="category-title">
                        {CATEGORY_ICONS[cat.name] || "📦"} {cat.name}
                        {cat.is_required ? (
                          <span className="required-tag">Required</span>
                        ) : (
                          <span className="optional-tag">Optional{cat.is_multi ? " · multi-select" : ""}</span>
                        )}
                      </div>
                      <div className="components-grid">
                        {catComps.map((comp) => {
                          const sel = isSelected(cat.id, comp.id);
                          const features = Array.isArray(comp.features)
                            ? comp.features
                            : typeof comp.features === "string"
                            ? JSON.parse(comp.features)
                            : [];
                          const badgeClass = comp.badge
                            ? comp.badge.toLowerCase().replace(" ", "-")
                            : "";

                          return (
                            <div
                              key={comp.id}
                              className={`component-card${sel ? " selected" : ""}`}
                              onClick={() => toggleComponent(cat, comp)}
                            >
                              <div className="component-left">
                                <div className="component-name">
                                  {comp.name}
                                  {comp.badge && (
                                    <span className={`badge-tag ${badgeClass}`}>
                                      ⭐ {comp.badge}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                                  {comp.description}
                                </div>
                                <div className="component-features">
                                  {features.slice(0, 4).map((f, i) => (
                                    <span key={i} className="feature-pill">{f}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="component-right">
                                <div className="component-price">{fmt(comp.price)}</div>
                                {comp.capacity && (
                                  <div className="capacity-text">{comp.capacity} spots</div>
                                )}
                                {sel && (
                                  <div className="check-circle">
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* ── Booking summary */}
                {selectedComps.length > 0 && (
                  <div className="booking-summary">
                    <div className="summary-title">Your Package</div>
                    <div className="summary-lines">
                      {selectedComps.map((c) => (
                        <div className="summary-line" key={c.id}>
                          <span className="label">{c.name}</span>
                          <span className="val">{fmt(c.price)}</span>
                        </div>
                      ))}
                      <div className="summary-line total">
                        <span className="label">Total</span>
                        <span className="val">{fmt(total)}</span>
                      </div>
                    </div>

                    {activeService.allows_deposit && !hasSGRSelected() && (
                      <div className="deposit-note">
                        💡 Pay a deposit of <strong>{fmt(deposit)}</strong> ({activeService.deposit_percentage}%) to secure your spot now. Balance due before the trip.
                      </div>
                    )}

                    {hasSGRSelected() && (
                      <div className="deposit-note" style={{ borderColor: 'rgba(231,198,95,0.4)' }}>
                        🚊 SGR tickets must be paid in full at the time of booking.
                      </div>
                    )}

                    <div className="cta-row" style={hasSGRSelected() ? { gridTemplateColumns: '1fr' } : {}}>
                      {!hasSGRSelected() && (
                        <button
                          className="cta-btn cta-deposit"
                          disabled={!requiredCatsMet()}
                          onClick={() => { setCheckoutPaymentType('deposit'); setCheckoutOpen(true); }}
                        >
                          Pay Deposit<br />
                          <span style={{ fontSize: "12px", fontWeight: 400 }}>{fmt(deposit)}</span>
                        </button>
                      )}
                      <button
                        className="cta-btn cta-full"
                        disabled={!requiredCatsMet()}
                        onClick={() => { setCheckoutPaymentType('full'); setCheckoutOpen(true); }}
                      >
                        Pay in Full<br />
                        <span style={{ fontSize: "12px", fontWeight: 400 }}>{fmt(total)}</span>
                      </button>
                    </div>

                    {!requiredCatsMet() && (
                      <div style={{ textAlign: "center", fontSize: "12px", color: "var(--muted)", marginTop: "10px" }}>
                        Select required options above to continue
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ── Service Checkout */}
        {checkoutOpen && activeService && (
          <ServiceCheckout
            service={activeService}
            selectedComps={getSelectedComponents()}
            total={total}
            deposit={deposit}
            paymentType={checkoutPaymentType}
            onClose={() => setCheckoutOpen(false)}
          />
        )}
      </div>
    </>
  );
}