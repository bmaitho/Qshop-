// Wishlist.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from '../context/CartContext';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wishlist items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      setWishlist(wishlist.filter(item => item.product_id !== productId));
      toast({
        title: "Success",
        description: "Item removed from wishlist",
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async (product) => {
    await addToCart(product);
    await removeFromWishlist(product.id);
    toast({
      title: "Success",
      description: "Item moved to cart",
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <div className="animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg mb-4"></div>
            ))}
          </div>
        </div>
      </>
    );
  }

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
                  src={item.products.image_url || "/api/placeholder/200/200"}
                  alt={item.products.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeFromWishlist(item.product_id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <Link 
                to={`/product/${item.product_id}`}
                className="font-semibold hover:text-orange-600"
              >
                {item.products.name}
              </Link>
              <p className="text-gray-600 mb-4">KES {item.products.price}</p>
              <Button 
                className="w-full"
                onClick={() => handleAddToCart(item.products)}
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