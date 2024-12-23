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
          <Route path="/" element={<Login setToken={setToken} />} />
          
          {/* Protected Routes */}
          <Route 
            path="/home" 
            element={token ? <Home token={token} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/studentmarketplace" 
            element={token ? <StudentMarketplace token={token} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/product/:id" 
            element={token ? <ProductDetails token={token} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/cart" 
            element={token ? <Cart token={token} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/wishlist" 
            element={token ? <Wishlist token={token} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/profile" 
            element={token ? <Profile token={token} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/category/:categoryName" 
            element={token ? <CategoryPage token={token} /> : <Navigate to="/" />} 
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