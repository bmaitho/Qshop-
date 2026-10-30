import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from './components/SupabaseClient';
import { rememberPath, peekAuthDestination, markHasAccount } from './components/auth/authRedirect';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ThemeProvider } from './components/ThemeContext';
import { TutorialProvider } from './components/RestartTutorialButton';
import TutorialWrapper from './components/TutorialWrapper';

// Components
import AuthLayout from './components/auth/AuthLayout';
import AuthCallback from './components/auth/AuthCallback';
import NotFound from './components/NotFound';
import Home from './components/Home';
import { HIVE_SLUG, isEuphoriaSlug } from './components/hive/hiveMedia';
import { getExperience } from './components/experience/experiences';

// Route pages load on demand so the first visit only downloads what it shows.
// After a deploy, an open tab may ask for a chunk that no longer exists;
// reload once to pick up the new build instead of showing a blank page.
const lazyPage = (load) => lazy(() => load().catch((err) => {
  const key = 'chunk-reload-at';
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
    return new Promise(() => {});
  }
  throw err;
}));
const SellerProfile = lazyPage(() => import('./components/SellerProfile'));
const StudentMarketplace = lazyPage(() => import('./components/StudentMarketplace'));
const ProductDetails = lazyPage(() => import('./components/ProductDetails'));
const Cart = lazyPage(() => import('./components/Cart'));
const Wishlist = lazyPage(() => import('./components/Wishlist'));
const Profile = lazyPage(() => import('./components/Profile'));
const CategoryPage = lazyPage(() => import('./components/CategoryPage'));
const MyShop = lazyPage(() => import('./components/MyShop'));
const Checkout = lazyPage(() => import('./components/Checkout'));
const OrderConfirmation = lazyPage(() => import('./components/OrderConfirmation'));
const OrderDetails = lazyPage(() => import('./components/OrderDetails'));
const WholesalerCodes = lazyPage(() => import('./components/admin/WholesalerCodes'));
const AdminServicesPanel = lazyPage(() => import('./components/AdminServicesPanel'));
const EventTicketImport = lazyPage(() => import('./components/admin/EventTicketImport'));
const ShopOwnerBroadcast = lazyPage(() => import('./components/admin/ShopOwnerBroadcast'));
const BuzzAdmin = lazyPage(() => import('./components/admin/BuzzAdmin'));
const BrandsAdmin = lazyPage(() => import('./components/admin/BrandsAdmin'));
const SiwakaPage = lazyPage(() => import('./components/media/SiwakaPage'));
const SubscriptionPage = lazyPage(() => import('./components/SubscriptionPage'));
const SellerOrderDetail = lazyPage(() => import('./components/SellerOrderDetail'));
const BuyerOrders = lazyPage(() => import('./components/BuyerOrders'));
const ServicePage = lazyPage(() => import('./components/ServicePage'));
const EventsPage = lazyPage(() => import('./components/EventsPage'));
const EventPage = lazyPage(() => import('./components/EventPage'));
const MyTickets = lazyPage(() => import('./components/MyTickets'));
const VerifyTicket = lazyPage(() => import('./components/VerifyTicket'));
const StaffScanner = lazyPage(() => import('./components/StaffScanner'));
const ClaimHiveTicket = lazyPage(() => import('./components/ClaimHiveTicket'));
const HiveEventPage = lazyPage(() => import('./components/hive/HiveEventPage'));
const HiveBooth = lazyPage(() => import('./components/hive/HiveBooth'));
const EuphoriaRecap = lazyPage(() => import('./components/hive/EuphoriaRecap'));
const PartnerDashboard = lazyPage(() => import('./components/hive/PartnerDashboard'));
const HiveWallet = lazyPage(() => import('./components/HiveWallet'));
const VendorRedeem = lazyPage(() => import('./components/VendorRedeem'));
const TermsPage = lazyPage(() => import('./components/legal/LegalPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazyPage(() => import('./components/legal/LegalPage').then((m) => ({ default: m.PrivacyPage })));
const DeleteAccountPage = lazyPage(() => import('./components/legal/LegalPage').then((m) => ({ default: m.DeleteAccountPage })));
const ConsentGate = lazyPage(() => import('./components/legal/ConsentGate'));
const ExperiencePage = lazyPage(() => import('./components/experience/ExperiencePage'));

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent dark:border-primary" />
  </div>
);

const EventRoute = ({ token }) => {
  const { slug } = useParams();
  if (slug === HIVE_SLUG) return <HiveEventPage />;
  if (isEuphoriaSlug(slug)) return <EuphoriaRecap />;
  const experience = getExperience(slug);
  if (experience) return <ExperiencePage x={experience} />;
  return <EventPage token={token} />;
};

const PackagesRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/events/${slug}?tab=packs`} replace />;
};

const AppRoutes = ({ token, setToken }) => {
  const location = useLocation();
  useEffect(() => { rememberPath(location.pathname + location.search); }, [location.pathname, location.search]);

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem('token');
  };

  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Public routes — accessible without login (for users and Googlebot) */}
      <Route path="/" element={<Home token={token} />} />
      <Route path="/home" element={<Home token={token} />} />
      <Route path="/studentmarketplace" element={<StudentMarketplace token={token} />} />
      <Route path="/product/:id" element={<ProductDetails token={token} />} />
      <Route path="/category/:categoryName" element={<CategoryPage token={token} />} />
      <Route path="/seller/:id" element={<SellerProfile />} />
      <Route path="/services" element={<ServicePage />} />
      <Route path="/events" element={<EventsPage token={token} />} />
      <Route path="/events/:slug" element={<EventRoute token={token} />} />
      <Route path="/hive/booth" element={<HiveBooth />} />
      <Route path="/hive/siwaka" element={<SiwakaPage />} />
      <Route path="/partner" element={<PartnerDashboard />} />
      <Route path="/verify-ticket/:token" element={<VerifyTicket />} />
      <Route path="/staff" element={<StaffScanner />} />
      <Route path="/staff/scanner" element={<StaffScanner />} />
      <Route path="/staff/redeem" element={<VendorRedeem />} />
      <Route path="/claim/:eventId" element={<ClaimHiveTicket />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/delete-account" element={<DeleteAccountPage />} />

      {/* Auth routes — redirect to /home if already logged in */}
      <Route path="/auth/*" element={token ? <Navigate to={peekAuthDestination()} replace /> : <AuthLayout setToken={setToken} />} />
      <Route path="/auth/callback" element={<AuthCallback setToken={setToken} />} />
      <Route path="/complete-profile" element={<Navigate to="/home" replace />} />

      {/* Protected routes — redirect to /auth if not logged in */}
      {/* Note: /seller/orders/:id must come before /seller/:id */}
      <Route path="/seller/orders/:id" element={token ? <SellerOrderDetail /> : <Navigate to="/auth" replace />} />
      <Route path="/cart" element={token ? <Cart token={token} /> : <Navigate to="/auth" replace />} />
      <Route path="/wishlist" element={token ? <Wishlist token={token} /> : <Navigate to="/auth" replace />} />
      <Route path="/profile" element={token ? <Profile token={token} /> : <Navigate to="/auth" replace />} />
      <Route path="/myshop" element={<MyShop token={token} />} />
      <Route path="/checkout/:orderId" element={token ? <Checkout /> : <Navigate to="/auth" replace />} />
      <Route path="/order-confirmation/:orderId" element={token ? <OrderConfirmation /> : <Navigate to="/auth" replace />} />
      <Route path="/orders/:orderId" element={token ? <OrderDetails /> : <Navigate to="/auth" replace />} />
      <Route path="/subscription" element={token ? <SubscriptionPage /> : <Navigate to="/auth" replace />} />
      <Route path="/admin/codes" element={token ? <WholesalerCodes /> : <Navigate to="/auth" replace />} />
      <Route path="/admin/services" element={token ? <AdminServicesPanel /> : <Navigate to="/auth" replace />} />
      <Route path="/admin/broadcast" element={token ? <ShopOwnerBroadcast /> : <Navigate to="/auth" replace />} />
      <Route path="/admin/buzz" element={token ? <BuzzAdmin /> : <Navigate to="/auth" replace />} />
      <Route path="/admin/brands" element={token ? <BrandsAdmin /> : <Navigate to="/auth" replace />} />
      <Route path="/admin/events/import-tickets" element={token ? <EventTicketImport /> : <Navigate to="/auth" replace />} />
      <Route path="/my-orders" element={token ? <BuyerOrders /> : <Navigate to="/auth" replace />} />
      <Route path="/my-tickets" element={token ? <MyTickets /> : <Navigate to="/auth" replace />} />
      <Route path="/events/:slug/packages" element={<PackagesRedirect />} />
      <Route path="/events/:eventId/wallet" element={<HiveWallet />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    {token && <ConsentGate />}
    </Suspense>
  );
};

const App = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Check for token in session storage
    const storedToken = sessionStorage.getItem('token');
    let restored = false;
    if (storedToken) {
      try {
        const parsedToken = JSON.parse(storedToken);
        setToken(parsedToken);
        restored = true;
      } catch (error) {
        // If token is invalid, remove it
        console.error("Error parsing token:", error);
        sessionStorage.removeItem('token');
      }
    }
    if (restored) {
      setLoading(false);
    } else {
      // A new tab (e.g. a link opened from Instagram) has no sessionStorage, but
      // Supabase keeps the session in localStorage. Restore it so people who
      // already have an account aren't asked to log in again.
      supabase.auth.getSession()
        .then(({ data }) => {
          if (data?.session) {
            setToken({ session: data.session, user: data.session.user });
            markHasAccount();
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    // Set up responsive design listener
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist token to session storage when it changes
  useEffect(() => {
    if (token) {
      sessionStorage.setItem('token', JSON.stringify(token));
    } else if (token === null && !loading) {
      sessionStorage.removeItem('token');
    }
  }, [token, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent dark:border-primary"></div>
        <p className="ml-2 text-foreground/80">Loading...</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <TutorialProvider>
        <WishlistProvider>
          <CartProvider>
            <div className={isMobile ? "pb-16" : ""}>
              {token ? (
                <TutorialWrapper>
                  <AppRoutes token={token} setToken={setToken} />
                </TutorialWrapper>
              ) : (
                <AppRoutes token={token} setToken={setToken} />
              )}
            </div>

            {/* Toast container for notifications */}
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              style={isMobile ? { top: '4rem', maxWidth: '90vw' } : {}}
              toastStyle={isMobile ? {
                fontSize: '14px',
                maxWidth: '100%',
                margin: '0 auto'
              } : {}}
            />
            <Analytics />
            <SpeedInsights />
          </CartProvider>
        </WishlistProvider>
      </TutorialProvider>
    </ThemeProvider>
  );
};

export default App;