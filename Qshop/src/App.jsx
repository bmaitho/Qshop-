import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ThemeProvider } from './components/ThemeContext';
import { TutorialProvider } from './components/RestartTutorialButton';
import TutorialWrapper from './components/TutorialWrapper';
import SellerProfile from './components/SellerProfile';

// Components
import AuthLayout from './components/auth/AuthLayout';
import AuthCallback from './components/auth/AuthCallback';
import ProfileCompletion from './components/auth/ProfileCompletion';
import StudentMarketplace from './components/StudentMarketplace';
import ProductDetails from './components/ProductDetails';
import Cart from './components/Cart';
import Wishlist from './components/Wishlist';
import Profile from './components/Profile';
import CategoryPage from './components/CategoryPage';
import NotFound from './components/NotFound';
import Home from './components/Home';
import MyShop from './components/MyShop';
import Checkout from './components/Checkout';
import OrderConfirmation from './components/OrderConfirmation';
import OrderDetails from './components/OrderDetails';
import WholesalerCodes from './components/admin/WholesalerCodes';
import SubscriptionPage from './components/SubscriptionPage';
import SellerOrderDetail from './components/SellerOrderDetail';
import BuyerOrders from './components/BuyerOrders';

const AppRoutes = ({ token, setToken }) => {
  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem('token');
  };

  return (
    <Routes>
      {/* Public routes — accessible without login (for users and Googlebot) */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home token={token} />} />
      <Route path="/studentmarketplace" element={<StudentMarketplace token={token} />} />
      <Route path="/product/:id" element={<ProductDetails token={token} />} />
      <Route path="/category/:categoryName" element={<CategoryPage token={token} />} />
      <Route path="/seller/:id" element={<SellerProfile />} />

      {/* Auth routes — redirect to /home if already logged in */}
      <Route path="/auth/*" element={token ? <Navigate to="/home" replace /> : <AuthLayout setToken={setToken} />} />
      <Route path="/auth/callback" element={<AuthCallback setToken={setToken} />} />
      <Route path="/complete-profile" element={<ProfileCompletion token={token} />} />

      {/* Protected routes — redirect to /auth if not logged in */}
      {/* Note: /seller/orders/:id must come before /seller/:id */}
      <Route path="/seller/orders/:id" element={token ? <SellerOrderDetail /> : <Navigate to="/auth" replace />} />
      <Route path="/cart" element={token ? <Cart token={token} /> : <Navigate to="/auth" replace />} />
      <Route path="/wishlist" element={token ? <Wishlist token={token} /> : <Navigate to="/auth" replace />} />
      <Route path="/profile" element={token ? <Profile token={token} /> : <Navigate to="/auth" replace />} />
      <Route path="/myshop" element={token ? <MyShop token={token} /> : <Navigate to="/auth" replace />} />
      <Route path="/checkout/:orderId" element={token ? <Checkout /> : <Navigate to="/auth" replace />} />
      <Route path="/order-confirmation/:orderId" element={token ? <OrderConfirmation /> : <Navigate to="/auth" replace />} />
      <Route path="/orders/:orderId" element={token ? <OrderDetails /> : <Navigate to="/auth" replace />} />
      <Route path="/subscription" element={token ? <SubscriptionPage /> : <Navigate to="/auth" replace />} />
      <Route path="/admin/codes" element={token ? <WholesalerCodes /> : <Navigate to="/auth" replace />} />
      <Route path="/my-orders" element={token ? <BuyerOrders /> : <Navigate to="/auth" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Check for token in session storage
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      try {
        const parsedToken = JSON.parse(storedToken);
        setToken(parsedToken);
      } catch (error) {
        // If token is invalid, remove it
        console.error("Error parsing token:", error);
        sessionStorage.removeItem('token');
      }
    }
    setLoading(false);

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
          </CartProvider>
        </WishlistProvider>
      </TutorialProvider>
    </ThemeProvider>
  );
};

export default App;
