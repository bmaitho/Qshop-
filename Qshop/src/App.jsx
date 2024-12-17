import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Toaster } from "@/components/ui/toaster";

// Page Components
import StudentMarketplace from './components/StudentMarketplace';
import ProductDetails from './components/ProductDetails';
import Cart from './components/Cart';
import Wishlist from './components/Wishlist';
import Profile from './components/Profile';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import CategoryPage from './components/CategoryPage';
import NotFound from './components/NotFound';

// Auth Guard Component
const ProtectedRoute = ({ children }) => {
  // Add your authentication logic here
  const isAuthenticated = false; // Replace with your auth check
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<StudentMarketplace />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/category/:categoryName" element={<CategoryPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/wishlist" 
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Toast Notifications */}
        <Toaster />
      </Router>
    </CartProvider>
  );
}

export default App;