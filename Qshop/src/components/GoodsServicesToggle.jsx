import { useNavigate, useLocation } from 'react-router-dom';

/**
 * GoodsServicesToggle
 * variant="dark"  — for dark/hero backgrounds (Home)
 * variant="light" — for light/card backgrounds (Marketplace header)
 */
const GoodsServicesToggle = ({ className = '', variant = 'dark' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isServices = location.pathname.startsWith('/services');

  const isDark = variant === 'dark';

  const wrapStyle = {
    display: 'inline-flex',
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,59,30,0.07)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(17,59,30,0.15)'}`,
    borderRadius: '100px',
    padding: '4px',
    gap: '4px',
  };

  const btn = (active) => ({
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    padding: '7px 18px',
    borderRadius: '100px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: active ? '#e7c65f' : 'transparent',
    color: active ? '#113b1e' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(17,59,30,0.5)',
    boxShadow: active ? '0 0 14px rgba(231,198,95,0.35)' : 'none',
  });

  return (
    <div className={className} style={wrapStyle}>
      <button style={btn(!isServices)} onClick={() => navigate('/studentmarketplace')}>
        🛍️ Goods
      </button>
      <button style={btn(isServices)} onClick={() => navigate('/services')}>
        ✨ Services
      </button>
    </div>
  );
};

export default GoodsServicesToggle;
