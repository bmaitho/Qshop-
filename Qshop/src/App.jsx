import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ThemeProvider } from './components/ThemeContext';

// Components
import SignUp from './components/auth/SignUp';
import Login from './components/auth/Login';
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

const App = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Check for existing token in sessionStorage on component mount
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      try {
        const parsedToken = JSON.parse(storedToken);
        setToken(parsedToken);
      } catch (error) {
        sessionStorage.removeItem('token');
      }
    }
    setLoading(false); // Mark loading as complete
    
    // Set up listener for screen size changes
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Update sessionStorage whenever token changes
    if (token) {
      sessionStorage.setItem('token', JSON.stringify(token));
    } else if (token === null && !loading) {
      // Only remove if we're not in the initial loading state
      sessionStorage.removeItem('token');
    }
  }, [token, loading]);

  // Don't render routes until we've checked for the token
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <ThemeProvider>
    <WishlistProvider>
      <CartProvider>
        <div className={isMobile ? "pb-16" : ""}>
          <Routes>
            {/* Public Routes */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login setToken={setToken} />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/complete-profile" element={token ? <ProfileCompletion token={token} /> : <Navigate to="/login" />} />
            
            {/* Redirect root to login or home based on authentication */}
            <Route 
              path="/" 
              element={token ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/home" 
              element={token ? <Home token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/studentmarketplace" 
              element={token ? <StudentMarketplace token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/product/:id" 
              element={token ? <ProductDetails token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/myshop" 
              element={token ? <MyShop token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/cart" 
              element={token ? <Cart token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/wishlist" 
              element={token ? <Wishlist token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/profile" 
              element={token ? <Profile token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/category/:categoryName" 
              element={token ? <CategoryPage token={token} /> : <Navigate to="/login" />} 
            />
            
            {/* Catch-all Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
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
    </ThemeProvider>
  );
};

export default App;