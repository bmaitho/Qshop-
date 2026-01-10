import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MoreVertical, 
  Edit, 
  Pencil, 
  MapPin, 
  Tag,
  ShoppingCart
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { wishlistToasts, productToasts } from '../utils/toastConfig';

// Helper function to determine if a string is a UUID
const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper function to get display category name
const getDisplayCategory = (category) => {
  if (!category) return "Other";
  if (typeof category === 'string') {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
  return "Other";
};

// Helper function to truncate description to 3 words
const truncateToThreeWords = (text) => {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  return words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
};

const ProductCard = ({ 
  product, 
  isOwner = false, 
  onStatusChange, 
  onDelete, 
  onEdit, 
  className = '',
  useFullDescription = false
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  
  // Fixed aspect ratio for all products
  const aspectRatioClass = "aspect-[4/3]";

  useEffect(() => {
    const status = isInWishlist(product.id);
    setIsWishlisted(status);
  }, [product.id, isInWishlist]);

  const handleProductClick = (e) => {
    // Navigate to product detail page
    navigate(`/product/${product.id}`);
  };

  const handleWishlist = (e) => {
    e.stopPropagation(); // Prevent navigation
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        wishlistToasts.error("Please login to add items to wishlist");
        return;
      }

      if (isWishlisted) {
        removeFromWishlist(product.id);
        setIsWishlisted(false);
      } else {
        addToWishlist(product);
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation(); // Prevent navigation
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        return;
      }
  
      addToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleSellerClick = (e) => {
    e.stopPropagation(); // Prevent navigation to product
    navigate(`/seller/${product.seller_id}`);
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

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent navigation
    if (onDelete) {
      onDelete(product.id);
    } else {
      console.error("onDelete function is not provided");
      productToasts.error();
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent navigation
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
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(product.id, 'active');
            }}
            disabled={product.status === 'active'}
          >
            Mark as Active
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(product.id, 'sold');
            }}
            disabled={product.status === 'sold'}
          >
            Mark as Sold
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
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
              e.stopPropagation();
              if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
                handleDeleteClick(e);
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

  // Get the display category, prioritizing processed display_category or properly formatted category
  const displayCategory = product.display_category || 
    (isUUID(product.category) ? "Other" : getDisplayCategory(product.category));

  return (
    <div 
      className={`${className} bg-olive-700 dark:bg-olive-900 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 border border-primary/10 dark:border-gray-700 overflow-hidden h-full cursor-pointer text-white`}
      onClick={handleProductClick}
    >
      <div className="relative">
        {/* Image container with fixed aspect ratio */}
        <div className={`${aspectRatioClass} w-full overflow-hidden bg-gray-100 dark:bg-gray-700`}>
          <img 
            src={product.image_url || "/api/placeholder/400/300"} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 product-image"
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
      
      <div className="p-4 flex flex-col h-[calc(100%-33%)]">
        {/* Product title */}
        <h3 className="font-serif font-medium text-sm line-clamp-1 text-primary dark:text-gray-100 mb-2">
          {product.name}
        </h3>
        
        {/* Price section */}
        <div className="mb-3">
          <span className="text-base font-bold block" style={{ color: '#E7C65F' }}>
            KES {product.price?.toLocaleString()}
          </span>
          {product.original_price && (
            <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
              KES {product.original_price?.toLocaleString()}
            </span>
          )}
        </div>
        
        {/* Description - truncated to 3 words */}
        <p className="text-xs text-primary/70 dark:text-gray-300 mb-3">
          {truncateToThreeWords(product.description) || "No description available"}
        </p>
        
        {/* Tags section - condition only */}
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-2">
            <Tag className="h-3 w-3 text-primary/60 dark:text-gray-400" />
            <span className="text-xs text-primary/70 dark:text-gray-400">
              {product.condition}
            </span>
          </div>
          
          {product.location && (
            <div className="flex items-center gap-1 text-xs text-primary/60 dark:text-gray-500">
              <MapPin className="h-3 w-3" />
              <span>{product.location}</span>
            </div>
          )}
        </div>
        
        {/* Footer section */}
        <div className="mt-auto">
          {product.seller_id && !isOwner && (
            <button 
              className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-2 block"
              onClick={handleSellerClick}
            >
              View Seller
            </button>
          )}
          
          {!isOwner && (
            <Button 
              className="w-full text-sm py-1.5 h-auto text-xs bg-secondary text-primary hover:bg-secondary/90 dark:hover:bg-secondary/80"
              onClick={handleAddToCart}
              disabled={product.status !== 'active'}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              {product.status === 'active' ? 'Add to Cart' : 'Not Available'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;