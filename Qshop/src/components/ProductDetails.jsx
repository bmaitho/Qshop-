import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Zap, 
  MapPin, 
  User, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  Star
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import MessageDialog from './MessageDialog';

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

// Component to display product shop locations (full view for detail page)
const ProductLocationsFull = ({ productId }) => {
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
              id,
              shop_name,
              physical_address,
              is_primary,
              campus_locations:campus_id(name)
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!locations || locations.length === 0) return null;

  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="font-semibold text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <Building2 className="h-5 w-5 text-green-600" />
        Pickup Locations ({locations.length})
      </h4>
      <div className="space-y-2">
        {locations.map((location, index) => (
          <div 
            key={location.id || index}
            className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {location.shop_name}
                  </span>
                  {location.is_primary && (
                    <Badge className="bg-green-600 text-white text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>{location.physical_address}</span>
                </div>
                {location.campus_locations?.name && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
                    📍 {location.campus_locations.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        Contact seller to arrange pickup at any of these locations
      </p>
    </div>
  );
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            email,
            phone,
            campus_location
          )
        `)
        .eq('id', id)
        .single();

      if (productError) throw productError;

      setProduct(productData);
      setSeller(productData.profiles);

      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('display_order');

      if (!imagesError && imagesData && imagesData.length > 0) {
        setProductImages(imagesData);
      } else if (productData.image_url) {
        setProductImages([{ image_url: productData.image_url, is_primary: true }]);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to add items to cart');
        navigate('/auth');
        return;
      }

      addToCart(product, quantity);
      toast.success('Added to cart successfully');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    try {
      setBuyingNow(true);
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to purchase');
        navigate('/auth');
        return;
      }

      addToCart(product, quantity);
      navigate('/checkout');
    } catch (error) {
      console.error('Error during buy now:', error);
      toast.error('Failed to process purchase');
    } finally {
      setBuyingNow(false);
    }
  };

  const handleWishlist = () => {
    const token = sessionStorage.getItem('token');
    
    if (!token) {
      toast.error('Please login to add to wishlist');
      navigate('/auth');
      return;
    }

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist(product);
      toast.success('Added to wishlist');
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Button onClick={() => navigate('/studentmarketplace')}>
            Back to Marketplace
          </Button>
        </div>
      </>
    );
  }

  const displayCategory = isUUID(product.category) ? "Other" : getDisplayCategory(product.category);

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={productImages[currentImageIndex]?.image_url || product.image_url || "/api/placeholder/600/600"}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              
              {productImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {productImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? 'bg-white w-6'
                            : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-green-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {product.name}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleWishlist}
                  className="flex-shrink-0"
                >
                  <Heart
                    className={`h-6 w-6 ${
                      isInWishlist(product.id)
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  />
                </Button>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Badge variant="secondary">{displayCategory}</Badge>
                <Badge variant="outline">{product.condition}</Badge>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-4xl font-bold text-green-600">
                KES {product.price?.toLocaleString()}
              </p>
            </div>

            {/* NEW: Product Locations Display */}
            <ProductLocationsFull productId={product.id} />

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Description
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* Seller Information */}
            {seller && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Seller Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {seller.full_name}
                    </span>
                  </div>
                  {seller.campus_location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span>{seller.campus_location}</span>
                    </div>
                  )}
                  <MessageDialog
                    recipientId={product.seller_id}
                    recipientDetails={seller}
                    productId={product.id}
                    productName={product.name}
                    buttonText="Message Seller"
                    buttonVariant="outline"
                    buttonClassName="w-full mt-2"
                  />
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Quantity:
                </span>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleAddToCart}
                  disabled={addingToCart || product.status !== 'active'}
                  className="w-full"
                  variant="outline"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </Button>
                <Button
                  onClick={handleBuyNow}
                  disabled={buyingNow || product.status !== 'active'}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {buyingNow ? 'Processing...' : 'Buy Now'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;