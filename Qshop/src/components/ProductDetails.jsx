import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../components/SupabaseClient';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Heart, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { productToasts } from '../utils/toastConfig';
import Navbar from './Navbar';

const ProductDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchProduct();
    checkWishlistStatus();
  }, [id]);

  // Add a useEffect to update local wishlist state when the context changes
  useEffect(() => {
    if (id) {
      setIsWishlisted(isInWishlist(id));
    }
  }, [id, isInWishlist]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller_details:seller_id (
            id,
            full_name,
            campus_location,
            phone
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      productToasts.loadError();
    } finally {
      setLoading(false);
    }
  };

  const checkWishlistStatus = async () => {
    try {
      // Use the context function instead of direct Supabase query
      const status = isInWishlist(id);
      setIsWishlisted(status);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        productToasts.error("Please login to add items to wishlist");
        return;
      }

      if (isWishlisted) {
        await removeFromWishlist(id);
        setIsWishlisted(false);
      } else {
        await addToWishlist(product);
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const handleAddToCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        productToasts.error("Please login to add items to cart");
        return;
      }
      
      await addToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <div className="animate-pulse">
            <div className="h-96 bg-primary/5 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-8 bg-primary/5 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-primary/5 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          </div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <p className="text-center text-primary/80 dark:text-gray-300">Product not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative">
            {/* Image container with consistent aspect ratio */}
            <div className="aspect-[1/1] w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-primary/10 dark:border-gray-600">
              <img 
                src={imageError ? "/api/placeholder/400/400" : (product.image_url || "/api/placeholder/400/400")} 
                alt={product.name}
                className="w-full h-full object-contain"
                onError={() => setImageError(true)}
              />
            </div>
            <button 
              onClick={handleWishlist}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-colors"
            >
              <Heart 
                className={`h-6 w-6 ${isWishlisted ? 'fill-secondary text-secondary' : 'text-primary/60 dark:text-gray-300'}`}
              />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2 text-primary dark:text-gray-100">{product.name}</h1>
              <div className="flex items-baseline space-x-4">
                <span className="text-2xl font-bold text-secondary dark:text-green-400">
                  KES {product.price?.toLocaleString()}
                </span>
                {product.original_price && (
                  <span className="text-lg text-primary/60 dark:text-gray-400 line-through">
                    KES {product.original_price?.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <Card className="border border-primary/10 dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="font-serif font-semibold mb-2 text-primary dark:text-gray-200">Product Details</h3>
                  <p className="text-primary/80 dark:text-gray-300">{product.description}</p>
                  <p className="text-primary/80 dark:text-gray-300">Condition: {product.condition}</p>
                  <p className="text-primary/80 dark:text-gray-300">Location: {product.location || product.seller_details?.campus_location}</p>
                </div>

                <div>
                  <h3 className="font-serif font-semibold mb-2 text-primary dark:text-gray-200">Seller Information</h3>
                  <p className="text-primary/80 dark:text-gray-300">Name: {product.seller_details?.full_name}</p>
                  {product.seller_details?.phone_number && (
                    <p className="text-primary/80 dark:text-gray-300">Phone: {product.seller_details.phone_number}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button
                onClick={handleAddToCart}
                className="flex-1 bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
              >
                Add to Cart
              </Button>
              <Button
                variant="outline"
                className="border-primary/20 text-primary hover:bg-primary/5 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: product.name,
                      text: `Check out this ${product.name} on UniHive!`,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    productToasts.success("Link copied to clipboard!");
                  }
                }}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;