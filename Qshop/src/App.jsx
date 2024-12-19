import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Toaster } from "@/components/ui/toaster";

// Page Components
import StudentMarketplace from './components/StudentMarketplace';
import ProductDetails from './components/ProductDetails';
import Cart from './components/Cart';
import Wishlist from './components/Wishlist';
import Profile from './components/Profile';
import CategoryPage from './components/CategoryPage';
import NotFound from './components/NotFound';

function App() {
  return (
    <Router>
      <WishlistProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<StudentMarketplace />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/category/:categoryName" element={<CategoryPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </CartProvider>
      </WishlistProvider>
    </Router>
  );
}

export default App;