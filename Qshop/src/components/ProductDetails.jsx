import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart, Plus, Minus, Zap, MapPin, User, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
    fetchProduct();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setProduct(data);
      setSeller(data.profiles);

      // Fetch product images
      const { data: images, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('display_order');

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
      }

      if (images && images.length > 0) {
        setProductImages(images);
      } else if (data.image_url) {
        // Fallback to single image_url if no images in product_images table
        setProductImages([{ image_url: data.image_url, display_order: 0, is_primary: true }]);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    if (newQuantity > 99) {
      toast.warning('Maximum quantity is 99');
      return;
    }
    setQuantity(newQuantity);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      setAddingToCart(true);
      const productWithQuantity = { ...product, quantity };
      await addToCart(productWithQuantity);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;

    try {
      setBuyingNow(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to continue');
        navigate('/auth');
        return;
      }

      const totalAmount = product.price * quantity;

      // Cancel stale pending orders (older than 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      await supabase
        .from('orders')
        .update({
          order_status: 'cancelled',
          payment_status: 'cancelled'
        })
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .lt('created_at', thirtyMinutesAgo);

      // Check for existing recent pending order with same product
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false });

      // Check if any existing order has this exact product with same quantity
      const matchingOrder = existingOrders?.find(order => {
        const hasProduct = order.order_items.some(
          item => item.product_id === product.id && item.quantity === quantity
        );
        return hasProduct && order.order_items.length === 1; // Single product order
      });

      let orderId;

      if (matchingOrder) {
        // Reuse existing pending order
        orderId = matchingOrder.id;
        console.log('Reusing existing pending order:', orderId);
        toast.info('Resuming your pending order');
      } else {
        // Create new order
        const orderData = {
          user_id: user.id,
          amount: totalAmount,
          payment_status: 'pending',
          order_status: 'pending_payment',
          created_at: new Date().toISOString()
        };

        const { data: orderResult, error: orderError } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = orderResult.id;

        // Create order item with buyer_user_id
        const orderItem = {
          order_id: orderId,
          product_id: product.id,
          seller_id: product.seller_id,
          buyer_user_id: user.id,
          quantity: quantity,
          price_per_unit: product.price,
          subtotal: product.price * quantity,
          status: 'pending_payment'
        };

        const { error: itemError } = await supabase
          .from('order_items')
          .insert([orderItem]);

        if (itemError) throw itemError;
        console.log('Created new order:', orderId);
      }

      navigate(`/checkout/${orderId}`);

    } catch (error) {
      console.error('Error with buy now:', error);
      toast.error('Failed to process purchase');
    } finally {
      setBuyingNow(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;
    
    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id, product.name);
      } else {
        await addToWishlist(product);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
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

  const displayCategory = product?.display_category || 
    (isUUID(product?.category) ? "Other" : getDisplayCategory(product?.category));

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-gray-300"></div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4 text-center">
          <h2 className="text-2xl font-bold mb-4 text-primary dark:text-gray-100">Product Not Found</h2>
          <Link to="/studentmarketplace">
            <Button className="bg-secondary text-primary hover:bg-secondary/90">
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const currentImage = productImages[currentImageIndex];
  const hasMultipleImages = productImages.length > 1;

  return (
    <>
      <Navbar />
      <div className={`max-w-7xl mx-auto p-4 ${isMobile ? 'mt-12 mb-16' : 'mt-4'}`}>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className={`${isMobile ? 'flex flex-col space-y-6' : 'grid grid-cols-1 md:grid-cols-2 gap-8'}`}>
          {/* Image Carousel */}
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 relative">
              {productImages.length > 0 ? (
                <>
                  <img
                    src={imageError ? 'https://via.placeholder.com/500?text=No+Image' : currentImage?.image_url}
                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                  
                  {/* Navigation Arrows */}
                  {hasMultipleImages && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {productImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-400">No image available</p>
                </div>
              )}
            </div>
            
            {/* Thumbnail Navigation */}
            {hasMultipleImages && (
              <div className="mt-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {productImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-secondary scale-95'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            
            {/* Status Badge */}
            {product.status === 'sold' && (
              <Badge className="absolute top-4 right-4 bg-blue-500 dark:bg-blue-600">
                Sold
              </Badge>
            )}
            {product.status === 'out_of_stock' && (
              <Badge className="absolute top-4 right-4 bg-red-500 dark:bg-red-600">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-primary dark:text-gray-100">
                {product.name}
              </h1>
              <p className="text-2xl font-bold text-secondary dark:text-green-500">
                KES {product.price?.toFixed(2)}
              </p>
            </div>

            {product.category && (
              <div>
                <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                  {displayCategory}
                </Badge>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary dark:text-gray-100">
                Description
              </h3>
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {product.description || 'No description available.'}
              </p>
            </div>

            {product.location && (
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{product.location}</span>
              </div>
            )}

            {seller && (
              <div className="border-t border-primary/10 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold mb-3 text-primary dark:text-gray-100">
                  Seller Information
                </h3>
                <Link
                  to={`/seller/${product.seller_id}`}
                  className="flex items-center space-x-3 hover:bg-primary/5 dark:hover:bg-gray-800 p-3 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 bg-primary/10 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="font-medium text-primary dark:text-gray-100">
                      {seller.full_name || 'Anonymous Seller'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      View seller profile →
                    </p>
                  </div>
                </Link>
                
                <MessageDialog 
                  recipientId={product.seller_id}
                  recipientName={seller.full_name || 'Seller'}
                  productId={product.id}
                  productName={product.name}
                >
                  <Button 
                    variant="outline" 
                    className="w-full mt-3 border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message Seller
                  </Button>
                </MessageDialog>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary dark:text-gray-100">
                Quantity
              </h3>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-semibold min-w-[40px] text-center text-primary dark:text-gray-100">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 99}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
                onClick={handleBuyNow}
                disabled={buyingNow || product.status === 'sold' || product.status === 'out_of_stock'}
              >
                {buyingNow ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Buy Now
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full border-primary/20 text-primary dark:border-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
                onClick={handleAddToCart}
                disabled={addingToCart || product.status === 'sold' || product.status === 'out_of_stock'}
              >
                {addingToCart ? (
                  <>Adding...</>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className={`w-full border-primary/20 dark:border-gray-600 hover:bg-primary/5 dark:hover:bg-gray-700 ${
                  isInWishlist(product.id)
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-primary dark:text-gray-300'
                }`}
                onClick={handleWishlistToggle}
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${
                    isInWishlist(product.id) ? 'fill-current' : ''
                  }`}
                />
                {isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </Button>
            </div>

            {product.status === 'sold' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300 text-center font-medium">
                  This item has been sold
                </p>
              </div>
            )}
            {product.status === 'out_of_stock' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-center font-medium">
                  This item is currently out of stock
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;