import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

const App = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      try {
        const parsedToken = JSON.parse(storedToken);
        setToken(parsedToken);
      } catch (error) {
        sessionStorage.removeItem('token');
      }
    }
    setLoading(false);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('token', JSON.stringify(token));
    } else if (token === null && !loading) {
      sessionStorage.removeItem('token');
    }
  }, [token, loading]);

  // Create a handler to safely log out
  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem('token');
    // No need to navigate here, the effect will handle redirection
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Separate protected and unprotected components for better management
  const protectedRoutes = (
    <Routes>
      <Route path="/home" element={<Home token={token} />} />
      <Route path="/studentmarketplace" element={<StudentMarketplace token={token} />} />
      <Route path="/product/:id" element={<ProductDetails token={token} />} />
      <Route path="/myshop" element={<MyShop token={token} />} />
      <Route path="/cart" element={<Cart token={token} />} />
      <Route path="/seller/:id" element={<SellerProfile />} />
      <Route path="/wishlist" element={<Wishlist token={token} />} />
      <Route path="/profile" element={<Profile token={token} />} />
      <Route path="/category/:categoryName" element={<CategoryPage token={token} />} />
      <Route path="/checkout/:orderId" element={<Checkout />} />
      <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
      <Route path="/orders/:orderId" element={<OrderDetails />} />
      <Route path="/seller/order/:id" element={<SellerOrderDetail />} />
      <Route path="/subscription" element={<SubscriptionPage />} />
      <Route path="/admin/codes" element={<WholesalerCodes />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );

  const unprotectedRoutes = (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth/*" element={<AuthLayout setToken={setToken} />} />
      <Route path="/auth/callback" element={<AuthCallback setToken={setToken} />} />
      <Route path="/complete-profile" element={<ProfileCompletion token={token} />} />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );

  return (
    <ThemeProvider>
      <TutorialProvider>
        <WishlistProvider>
          <CartProvider>
            <div className={isMobile ? "pb-16" : ""}>
              {token ? (
                <TutorialWrapper>
                  {protectedRoutes}
                </TutorialWrapper>
              ) : (
                unprotectedRoutes
              )}
            </div>
            
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
            />
          </CartProvider>
        </WishlistProvider>
      </TutorialProvider>
    </ThemeProvider>
  );
};

export default App;