import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Components
import SignUp from './components/auth/SignUp';
import Login from './components/auth/Login';
import StudentMarketplace from './components/StudentMarketplace';
import ProductDetails from './components/ProductDetails';
import Cart from './components/Cart';
import Wishlist from './components/Wishlist';
import Profile from './components/Profile';
import CategoryPage from './components/CategoryPage';
import NotFound from './components/NotFound';
import Home from './components/Home';
import MyShop from './components/MyShop';

// Protected route wrapper component
const ProtectedRoute = ({ element, token }) => {
  return token ? element : <Navigate to="/login" replace />;
};

const App = () => {
  const [token, setToken] = useState(false);

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
  }, []);

  useEffect(() => {
    // Update sessionStorage whenever token changes
    if (token) {
      sessionStorage.setItem('token', JSON.stringify(token));
    } else {
      sessionStorage.removeItem('token');
    }
  }, [token]);

  return (
    <WishlistProvider>
      <CartProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login setToken={setToken} />} />
          
          {/* Redirect root to login or home based on authentication */}
          <Route 
            path="/" 
            element={token ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/home" 
            element={<ProtectedRoute element={<Home token={token} />} token={token} />} 
          />
          <Route 
            path="/studentmarketplace" 
            element={<ProtectedRoute element={<StudentMarketplace token={token} />} token={token} />} 
          />
          <Route 
            path="/product/:id" 
            element={<ProtectedRoute element={<ProductDetails token={token} />} token={token} />} 
          />
          <Route 
            path="/myshop" 
            element={<ProtectedRoute element={<MyShop token={token} />} token={token} />} 
          />
          <Route 
            path="/cart" 
            element={<ProtectedRoute element={<Cart token={token} />} token={token} />} 
          />
          <Route 
            path="/wishlist" 
            element={<ProtectedRoute element={<Wishlist token={token} />} token={token} />} 
          />
          <Route 
            path="/profile" 
            element={<ProtectedRoute element={<Profile token={token} />} token={token} />} 
          />
          <Route 
            path="/category/:categoryName" 
            element={<ProtectedRoute element={<CategoryPage token={token} />} token={token} />} 
          />
          
          {/* Catch-all Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
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
  );
};

export default App;