import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

// Context Providers
import { AuthProvider, useAuth } from '../src/components/auth/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { UserProvider } from './context/UserContext';

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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [user, loading, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
};

// Public Route Component - Redirects to home if already authenticated
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return children;
};

// Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <UserProvider>
          <WishlistProvider>
            <CartProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<StudentMarketplace />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/categories" element={<CategoryPage />} />
                <Route path="/category/:categoryName" element={<CategoryPage />} />
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <PublicRoute>
                      <Register />
                    </PublicRoute>
                  } 
                />

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
                <Route
                  path="/marketplace"
                  element={
                    <ProtectedRoute>
                      <StudentMarketplace />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>

              {/* Toast Notifications */}
              <Toaster />
            </CartProvider>
          </WishlistProvider>
        </UserProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;