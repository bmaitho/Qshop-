import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from '../context/CartContext';
import { useToast } from "@/components/ui/use-toast";
import Navbar from './Navbar';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Simulated wishlist data - replace with your Supabase implementation
  useEffect(() => {
    setWishlist([
      {
        id: 1,
        name: "Sample Product",
        price: 29.99,
        image: "/api/placeholder/200/200"
      }
    ]);
  }, []);

  const removeFromWishlist = (productId) => {
    setWishlist(wishlist.filter(item => item.id !== productId));
    toast({
      title: "Removed from wishlist",
      description: "The item has been removed from your wishlist",
    });
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    removeFromWishlist(product.id);
    toast({
      title: "Added to cart",
      description: "The item has been moved to your cart",
    });
  };

  if (wishlist.length === 0) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-4">Your Wishlist is Empty</h2>
            <p className="text-gray-600 mb-8">Save items you'd like to purchase later</p>
            <Link to="/">
              <Button>Browse Products</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-lg shadow p-4"
            >
              <div className="relative">
                <img 
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeFromWishlist(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <Link 
                to={`/product/${item.id}`}
                className="font-semibold hover:text-orange-600"
              >
                {item.name}
              </Link>
              <p className="text-gray-600 mb-4">KES {item.price}</p>
              <Button 
                className="w-full"
                onClick={() => handleAddToCart(item)}
              >
                Move to Cart
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Wishlist;