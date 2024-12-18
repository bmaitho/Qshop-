// src/components/ProductCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from "@/components/ui/use-toast";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const isWishlisted = isInWishlist(product.id);

  const handleWishlist = (e) => {
    e.preventDefault(); // Prevent navigation
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault(); // Prevent navigation
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="relative p-0">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <button 
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white"
        >
          <Heart 
            className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </button>
      </CardHeader>
      <CardContent className="p-4">
        <Link to={`/product/${product.id}`} className="block">
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
          </div>
          {product.rating && (
            <div className="flex items-center mb-3">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-${i < Math.floor(product.rating) ? 'yellow' : 'gray'}-400`}
                >
                  ★
                </span>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                ({product.reviews || 0})
              </span>
            </div>
          )}
        </Link>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-orange-600 hover:bg-orange-700"
          onClick={handleAddToCart}
        >
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;