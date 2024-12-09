import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StudentMarketplace from './components/StudentMarketplace';



function App() {
  return (
    <Router>
      <Routes>
        {/* Main marketplace route */}
        <Route path="/" element={<StudentMarketplace />} />

        {/* Other routes can be uncommented as you build them */}
        {/* <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} /> */}
      </Routes>
    </Router>
  );
}

export default App;