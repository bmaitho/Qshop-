import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MoreVertical, 
  Edit, 
  Pencil, 
  MapPin, 
  Tag,
  ShoppingCart,
  Building2
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
import { supabase } from '../components/SupabaseClient';

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

// Component to display product shop locations (compact view for cards)
const ProductLocationsCompact = ({ productId }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('product_shop_locations')
          .select(`
            seller_shop_locations!inner(
              shop_name,
              physical_address,
              is_primary
            )
          `)
          .eq('product_id', productId);

        if (error) throw error;

        const locationDetails = data?.map(item => item.seller_shop_locations) || [];
        locationDetails.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
        
        setLocations(locationDetails);
      } catch (err) {
        console.error('Error fetching product locations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [productId]);

  if (loading || !locations || locations.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-primary/60 dark:text-gray-400 mt-1">
      <Building2 className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">
        {locations.length === 1
          ? locations[0].physical_address
          : `${locations.length} pickup locations`
        }
      </span>
    </div>
  );
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

  useEffect(() => {
    const status = isInWishlist(product.id);
    setIsWishlisted(status);
  }, [product.id, isInWishlist]);

  const handleProductClick = (e) => {
    navigate(`/product/${product.id}`);
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
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
    e.stopPropagation();
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        productToasts.error("Please login to add items to cart");
        return;
      }

      if (product.status !== 'active') {
        productToasts.error("This product is not available");
        return;
      }

      addToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
      productToasts.error("Failed to add to cart");
    }
  };

  const handleSellerClick = (e) => {
    e.stopPropagation();
    if (product.seller_id) {
      navigate(`/seller/${product.seller_id}`);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit?.(product);
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    onDelete?.(product.id);
  };

  const handleStatusChange = async (e, newStatus) => {
    e.stopPropagation();
    onStatusChange?.(product.id, newStatus);
  };

  const getStatusBadge = () => {
    const statusConfig = {
      active: { label: 'Active', variant: 'default', className: 'bg-green-500' },
      inactive: { label: 'Inactive', variant: 'secondary', className: 'bg-gray-500' },
      sold: { label: 'Sold', variant: 'destructive', className: 'bg-red-500' }
    };
    
    const config = statusConfig[product.status] || statusConfig.active;
    return (
      <Badge className={`${config.className} text-white text-xs`}>
        {config.label}
      </Badge>
    );
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
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={(e) => handleStatusChange(e, product.status === 'active' ? 'inactive' : 'active')}>
            {product.status === 'active' ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-red-600"
            onClick={(e) => {
              if (window.confirm('Are you sure you want to delete this product?')) {
                handleDeleteClick(e);
              }
            }}
          >
            Delete Listing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

  const displayCategory = product.display_category || 
    (isUUID(product.category) ? "Other" : getDisplayCategory(product.category));

  return (
    <div 
      className={`${className} bg-olive-700 dark:bg-olive-900 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 border border-primary/10 dark:border-gray-700 overflow-hidden cursor-pointer text-white flex flex-col`}
      onClick={handleProductClick}
    >
      {/* ── Image section ── fixed aspect ratio, never collapses ── */}
      <div className="relative flex-shrink-0">
        <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
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
      
      {/* ── Content section ── flex-grow so it fills remaining space ── */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow min-h-0">
        {/* Product name */}
        <h3 className="font-serif font-medium text-sm line-clamp-1 text-primary dark:text-gray-100 mb-1.5">
          {product.name}
        </h3>
        
        {/* Price */}
        <div className="mb-2">
          <span className="text-sm sm:text-base font-bold block" style={{ color: '#E7C65F' }}>
            KES {product.price?.toLocaleString()}
          </span>
          {product.original_price && (
            <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
              KES {product.original_price?.toLocaleString()}
            </span>
          )}
        </div>
        
        {/* Description */}
        <p className="text-xs text-primary/70 dark:text-gray-300 mb-2">
          {truncateToThreeWords(product.description) || "No description available"}
        </p>
        
        {/* Meta info */}
        <div className="mb-2">
          <div className="flex items-center gap-1 mb-1">
            <Tag className="h-3 w-3 text-primary/60 dark:text-gray-400 flex-shrink-0" />
            <span className="text-xs text-primary/70 dark:text-gray-400 truncate">
              {product.condition}
            </span>
          </div>
          
          {/* Shop locations */}
          <ProductLocationsCompact productId={product.id} />
          
          {/* Fallback campus location */}
          {product.location && !product.id && (
            <div className="flex items-center gap-1 text-xs text-primary/60 dark:text-gray-500">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{product.location}</span>
            </div>
          )}
        </div>
        
        {/* ── Bottom actions ── mt-auto pushes to bottom of flex column ── */}
        <div className="mt-auto pt-1">
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
              className="w-full py-1.5 h-auto text-xs bg-secondary text-primary hover:bg-secondary/90 dark:hover:bg-secondary/80"
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