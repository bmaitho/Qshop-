import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { wishlistToasts } from '../utils/toastConfig'; // Only import what we need

const ProductCard = ({ product, isOwner = false, onStatusChange, onDelete }) => {
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

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
        // No toast here, let the context handle it
      } else {
        await addToWishlist(product);
        setIsWishlisted(true);
        // No toast here, let the context handle it
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      // Only show error toast here if needed
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault(); // Prevent navigation
    try {
      const token = JSON.parse(sessionStorage.getItem('token'));
      if (!token) {
        // This toast can stay as it's a pre-check
        return;
      }
  
      await addToCart(product);
      // Remove this duplicate toast
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Only log the error, don't show toast
    }
  };

  const getStatusBadge = () => {
    switch (product.status) {
      case 'sold':
        return <Badge className="bg-blue-500">Sold</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-500">Out of Stock</Badge>;
      default:
        return <Badge className="bg-green-500">Active</Badge>;
    }
  };

  const renderOwnerControls = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-sm"
          onClick={(e) => e.preventDefault()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem 
          onClick={(e) => {
            e.preventDefault();
            onStatusChange(product.id, 'active');
          }}
          disabled={product.status === 'active'}
        >
          Mark as Active
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => {
            e.preventDefault();
            onStatusChange(product.id, 'sold');
          }}
          disabled={product.status === 'sold'}
        >
          Mark as Sold
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => {
            e.preventDefault();
            onStatusChange(product.id, 'out_of_stock');
          }}
          disabled={product.status === 'out_of_stock'}
        >
          Mark as Out of Stock
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={(e) => e.preventDefault()}
            >
              Delete Listing
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(product.id);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Link to={`/product/${product.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="relative">
          {/* Consistent image container with fixed aspect ratio */}
          <div className="aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-gray-100">
            <img 
              src={imageError ? "/api/placeholder/400/300" : (product.image_url || "/api/placeholder/400/300")} 
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
          {isOwner ? (
            <>
              {renderOwnerControls()}
              <div className="absolute top-2 right-2">
                {getStatusBadge()}
              </div>
            </>
          ) : (
            <button 
              onClick={handleWishlist}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-sm"
            >
              <Heart 
                className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
              />
            </button>
          )}
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
          
          {!isOwner && (
            <Button 
              className="w-full text-sm py-1.5 h-auto"
              onClick={handleAddToCart}
              disabled={product.status !== 'active'}
            >
              {product.status === 'active' ? 'Add to Cart' : 'Not Available'}
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;