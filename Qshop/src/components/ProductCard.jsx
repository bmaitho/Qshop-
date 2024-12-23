import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { cartToasts, wishlistToasts } from '../utils/toastConfig';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const status = isInWishlist(product.id);
    setIsWishlisted(status);
  }, [product.id, isInWishlist]);

  const handleWishlist = async (e) => {
    e.preventDefault(); // Prevent navigation
    try {
      const token = JSON.parse(sessionStorage.getItem('token'));
      if (!token) {
        wishlistToasts.error("Please login to add items to wishlist");
        return;
      }

      if (isWishlisted) {
        await removeFromWishlist(product.id);
        setIsWishlisted(false);
      } else {
        await addToWishlist(product);
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      wishlistToasts.error();
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault(); // Prevent navigation
    try {
      const token = JSON.parse(sessionStorage.getItem('token'));
      if (!token) {
        cartToasts.error("Please login to add items to cart");
        return;
      }

      await addToCart(product);
      cartToasts.addSuccess(product.name);
    } catch (error) {
      cartToasts.error();
    }
  };

  return (
    <Link to={`/product/${product.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="relative">
          <img 
            src={product.image_url || "/api/placeholder/400/300"} 
            alt={product.name}
            className="w-full h-40 object-cover rounded-t-lg"
          />
          <button 
            onClick={handleWishlist}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-sm"
          >
            <Heart 
              className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
            />
          </button>
        </div>
        
        <div className="p-3">
          <h3 className="font-medium text-sm mb-1 line-clamp-2 h-10">
            {product.name}
          </h3>
          
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-lg font-bold text-orange-600">
              KES {product.price?.toLocaleString()}
            </span>
            {product.original_price && (
              <span className="text-xs text-gray-500 line-through">
                KES {product.original_price?.toLocaleString()}
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-600 mb-2 space-y-0.5">
            <p>Condition: {product.condition}</p>
            <p>Location: {product.location}</p>
          </div>
          
          <Button 
            className="w-full text-sm py-1.5 h-auto"
            onClick={handleAddToCart}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;