import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MoreVertical, Edit, Pencil } from 'lucide-react';
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
import { wishlistToasts, productToasts } from '../utils/toastConfig';

const ProductCard = ({ product, isOwner = false, onStatusChange, onDelete, onEdit }) => {
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
      const token = sessionStorage.getItem('token');
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
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault(); // Prevent navigation
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        return;
      }
  
      await addToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const getStatusBadge = () => {
    switch (product.status) {
      case 'sold':
        return <Badge className="bg-blue-500 dark:bg-blue-600">Sold</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-500 dark:bg-red-600">Out of Stock</Badge>;
      default:
        return <Badge className="bg-secondary/90 text-primary dark:bg-secondary/80 dark:text-gray-100">Active</Badge>;
    }
  };

  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(product.id);
    } else {
      console.error("onDelete function is not provided");
      productToasts.error();
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault(); // Prevent navigation
    if (onEdit) {
      onEdit(product);
    }
  };

  const renderOwnerControls = () => (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 shadow-sm"
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
          <DropdownMenuItem 
            className="text-red-600 dark:text-red-400"
            onClick={(e) => {
              e.preventDefault();
              if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
                handleDeleteClick();
              }
            }}
          >
            Delete Listing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-12 p-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 shadow-sm"
        onClick={handleEditClick}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <Link to={`/product/${product.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 border border-primary/10 dark:border-gray-700 overflow-hidden h-full">
        <div className="relative">
          {/* Consistent image container with fixed aspect ratio */}
          <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
            <img 
              src={imageError ? "/api/placeholder/400/300" : (product.image_url || "/api/placeholder/400/300")} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
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
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-colors"
            >
              <Heart 
                className={`h-4 w-4 ${isWishlisted ? 'fill-secondary text-secondary dark:fill-secondary dark:text-secondary' : 'text-gray-600 dark:text-gray-300'}`}
              />
            </button>
          )}
        </div>
        
        <div className="p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-serif font-medium text-sm mb-1 line-clamp-1 text-primary dark:text-gray-100">
              {product.name}
            </h3>
            
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-base font-bold text-secondary dark:text-green-400">
                KES {product.price?.toLocaleString()}
              </span>
              {product.original_price && (
                <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                  KES {product.original_price?.toLocaleString()}
                </span>
              )}
            </div>
            
            {/* Description with ellipsis */}
            <p className="text-xs text-primary/70 dark:text-gray-300 mb-2 line-clamp-2 min-h-[2.5rem] italic">
              {product.description || "No description available"}
            </p>
            
            <div className="text-xs text-primary/70 dark:text-gray-400 mb-3 flex justify-between">
              <span className="line-clamp-1">Condition: {product.condition}</span>
              {product.location && (
                <span className="line-clamp-1 text-primary/60 dark:text-gray-500">{product.location}</span>
              )}
            </div>
            
            {/* Seller Link */}
            {product.seller_id && !isOwner && (
              <div className="mb-2">
                <Link 
                  to={`/seller/${product.seller_id}`}
                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={(e) => e.stopPropagation()} // Prevent the main card click event
                >
                  View Seller
                </Link>
              </div>
            )}
          </div>
          
          {!isOwner && (
            <Button 
              className="w-full text-sm py-1.5 h-auto text-xs bg-secondary text-primary hover:bg-secondary/90 dark:hover:bg-secondary/80 mt-auto"
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