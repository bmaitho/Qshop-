// ProductCard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '../components/SupabaseClient';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    checkWishlistStatus();
  }, [product.id]);

  const checkWishlistStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsWishlisted(!!data);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault(); // Prevent navigation
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please login to add items to wishlist",
          variant: "destructive",
        });
        return;
      }

      if (isWishlisted) {
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);

        if (error) throw error;
        setIsWishlisted(false);
        toast({
          title: "Success",
          description: "Removed from wishlist",
        });
      } else {
        const { error } = await supabase
          .from('wishlist')
          .insert([{
            user_id: user.id,
            product_id: product.id
          }]);

        if (error) throw error;
        setIsWishlisted(true);
        toast({
          title: "Success",
          description: "Added to wishlist",
        });
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault(); // Prevent navigation
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please login to add items to cart",
          variant: "destructive",
        });
        return;
      }

      await addToCart(product);
      toast({
        title: "Success",
        description: "Item added to cart",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  return (
    <Link to={`/product/${product.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="relative p-0">
          <img 
            src={product.image_url || "/api/placeholder/400/300"} 
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
          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
          <div className="flex items-baseline mb-2">
            <span className="text-xl font-bold text-orange-600">
              KES {product.price?.toLocaleString()}
            </span>
            {product.original_price && (
              <span className="ml-2 text-sm text-gray-500 line-through">
                KES {product.original_price?.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            <p>Condition: {product.condition}</p>
            <p>Location: {product.location}</p>
          </div>
        </CardContent>
        <CardFooter>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add {product.name} to your cart</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ProductCard;