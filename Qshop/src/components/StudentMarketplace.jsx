import React, { useState } from 'react';
import { ShoppingCart, Heart, User, Search, Menu } from 'lucide-react';

const sampleProducts = [
  {
    id: 1,
    name: "Calculus Textbook - 3rd Edition",
    price: 45.99,
    originalPrice: 60.00,
    condition: "Used - Good",
    location: "Main Campus",
    seller: "John Doe",
    contact: "+254 123456789",
    category: "Books",
    rating: 4.5,
    reviews: 23,
    image: "/api/placeholder/200/200"
  },
  {
    id: 2,
    name: "Scientific Calculator",
    price: 25.99,
    originalPrice: 30.00,
    condition: "New",
    location: "South Campus",
    seller: "Jane Smith",
    contact: "+254 987654321",
    category: "Electronics",
    rating: 5,
    reviews: 15,
    image: "/api/placeholder/200/200"
  }
];

const Navbar = () => {
  return (
    <div className="w-full bg-orange-600">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Menu className="text-white h-6 w-6 cursor-pointer" />
            <span className="text-white text-xl font-bold">Qshop</span>
          </div>
          
          <div className="flex-1 max-w-2xl mx-4">
            <div className="flex">
              <input 
                type="text" 
                placeholder="Search for books, electronics, etc..."
                className="w-full px-4 py-2 rounded-l-md focus:outline-none"
              />
              <button className="bg-green-500 px-6 py-2 text-white rounded-r-md hover:bg-green-600">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center text-white cursor-pointer">
              <User className="h-6 w-6" />
            </div>
            <div className="flex items-center text-white cursor-pointer">
              <Heart className="h-6 w-6" />
            </div>
            <div className="flex items-center text-white cursor-pointer">
              <ShoppingCart className="h-6 w-6" />
              <span className="ml-1">Cart</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-6 p-2 text-white text-sm">
          <span className="cursor-pointer hover:text-green-300">Books & Stationery</span>
          <span className="cursor-pointer hover:text-green-300">Electronics</span>
          <span className="cursor-pointer hover:text-green-300">Dorm Essentials</span>
          <span className="cursor-pointer hover:text-green-300">Study Materials</span>
          <span className="cursor-pointer hover:text-green-300">Snacks</span>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ product }) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      <img 
        src={product.image} 
        alt={product.name}
        className="w-full h-48 object-cover rounded-md mb-4"
      />
      <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
      <div className="flex items-baseline mb-2">
        <span className="text-xl font-bold text-orange-600">KES {product.price}</span>
        {product.originalPrice && (
          <span className="ml-2 text-sm text-gray-500 line-through">
            KES {product.originalPrice}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-600 mb-2">
        <p>Condition: {product.condition}</p>
        <p>Location: {product.location}</p>
        <p>Contact: {product.contact}</p>
      </div>
      <div className="flex items-center mb-3">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`text-${i < Math.floor(product.rating) ? 'yellow' : 'gray'}-400`}
          >
            ★
          </span>
        ))}
        <span className="ml-2 text-sm text-gray-600">({product.reviews})</span>
      </div>
      <button className="w-full bg-orange-600 text-white py-2 rounded-md hover:bg-orange-700">
        Add to Cart
      </button>
    </div>
  );
};

const ProductGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
      {sampleProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

const StudentMarketplace = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto">
        <div className="flex">
          {/* Sidebar filters would go here */}
          <main className="flex-1">
            <ProductGrid />
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentMarketplace;