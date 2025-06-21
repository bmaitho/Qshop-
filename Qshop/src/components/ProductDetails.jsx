import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart, Plus, Minus, Zap, MapPin, User, MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import MessageDialog from './MessageDialog';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [quantity, setQuantity] = useState(1); // NEW: Quantity state
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
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle quantity changes with validation
  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    if (newQuantity > 99) {
      toast.warning('Maximum quantity is 99');
      return;
    }
    setQuantity(newQuantity);
  };

  // ENHANCED: Add to cart with quantity
  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      setAddingToCart(true);
      // Add the selected quantity to the product object
      const productWithQuantity = { ...product, quantity };
      await addToCart(productWithQuantity);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  // NEW: Buy Now functionality
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

      // Create order directly without going through cart
      const orderData = {
        user_id: user.id,
        amount: product.price * quantity,
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

      const orderId = orderResult.id;

      // Create order item
      const orderItem = {
        order_id: orderId,
        product_id: product.id,
        seller_id: product.seller_id,
        quantity: quantity,
        price_per_unit: product.price,
        subtotal: product.price * quantity,
        status: 'pending_payment'
      };

      const { error: itemError } = await supabase
        .from('order_items')
        .insert([orderItem]);

      if (itemError) throw itemError;

      // Navigate directly to checkout
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
      console.error('Error updating wishlist:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 mt-12">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-200 dark:bg-gray-700 h-96 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
        <div className="max-w-7xl mx-auto px-4 py-8 mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4 text-primary dark:text-gray-100">Product Not Found</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link to="/studentmarketplace">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={`max-w-7xl mx-auto px-4 py-8 ${isMobile ? 'mt-12 mb-16' : 'mt-12'}`}>
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-2 gap-12'}`}>
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={imageError ? "/api/placeholder/600/600" : (product.image_url || "/api/placeholder/600/600")}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary dark:text-gray-100 mb-2">
                {product.name}
              </h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                  <span className="text-2xl md:text-3xl font-bold text-secondary dark:text-green-400">
                    KES {product.price?.toLocaleString()}
                  </span>
                  {product.original_price && (
                    <span className="ml-2 text-lg text-gray-500 dark:text-gray-400 line-through">
                      KES {product.original_price?.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                  {product.condition}
                </Badge>
                <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                  <MapPin className="w-3 h-3 mr-1" />
                  {product.location}
                </Badge>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary dark:text-gray-100">Description</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Seller Info */}
            {seller && (
              <div className="border border-primary/10 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-lg font-semibold mb-2 text-primary dark:text-gray-100">Seller Information</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary/60 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-primary dark:text-gray-100">{seller.full_name || 'Anonymous Seller'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{seller.campus_location || 'Location not specified'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <MessageDialog 
                      recipientId={product.seller_id}
                      productId={product.id}
                      buttonText="Message"
                      buttonVariant="outline"
                      buttonSize="sm"
                      productName={product.name}
                    />
                    <Link to={`/seller/${product.seller_id}`}>
                      <Button variant="outline" size="sm" className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                        View Shop
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* NEW: Quantity Selector */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-primary dark:text-gray-200 mb-2 block">
                  Quantity
                </label>
                <div className="flex items-center border rounded-md border-primary/20 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 w-fit">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-10 w-10 text-primary dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-gray-600 disabled:opacity-50"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="w-16 text-center">
                    <span className="text-lg font-medium text-primary dark:text-gray-300">
                      {quantity}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-10 w-10 text-primary dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-gray-600"
                    onClick={() => handleQuantityChange(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {quantity > 1 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Total: KES {(product.price * quantity).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-3`}>
                {/* NEW: Buy Now Button */}
                <Button 
                  className={`${isMobile ? 'w-full' : 'flex-1'} bg-orange-600 hover:bg-orange-700 text-white`}
                  onClick={handleBuyNow}
                  disabled={buyingNow}
                >
                  {buyingNow ? (
                    "Processing..."
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Buy Now
                    </>
                  )}
                </Button>

                {/* Enhanced Add to Cart */}
                <Button 
                  className={`${isMobile ? 'w-full' : 'flex-1'} bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700`}
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                >
                  {addingToCart ? (
                    "Adding..."
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart {quantity > 1 ? `(${quantity})` : ''}
                    </>
                  )}
                </Button>

                {/* Wishlist Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className={`${isMobile ? 'w-full' : ''} border-primary/20 dark:border-gray-600 hover:bg-primary/5 dark:hover:bg-gray-700`}
                  onClick={handleWishlistToggle}
                >
                  <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-400'}`} />
                  {isMobile && <span className="ml-2">{isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}</span>}
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