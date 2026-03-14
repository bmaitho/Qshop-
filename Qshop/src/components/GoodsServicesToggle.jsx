import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';

/**
 * GoodsServicesToggle
 * variant="dark"  — force dark styling (Home hero which is always dark regardless of theme)
 * variant="auto"  — detect from actual theme (default, used on themed pages)
 */
const GoodsServicesToggle = ({ className = '', variant = 'auto' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isServices = location.pathname.startsWith('/services');

  // Force dark for always-dark hero sections; otherwise follow actual theme
  const isDark = variant === 'dark' || (variant === 'auto' && theme === 'dark');

  const wrapStyle = {
    display: 'inline-flex',
    background: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(17,59,30,0.08)',
    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.30)' : 'rgba(17,59,30,0.18)'}`,
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
    color: active ? '#113b1e' : isDark ? 'rgba(255,255,255,0.85)' : 'rgba(17,59,30,0.55)',
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
