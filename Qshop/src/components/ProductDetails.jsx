import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Heart, 
  Share2, 
  User, 
  MapPin, 
  ChevronRight,
  ExternalLink,
  Package
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '../components/SupabaseClient';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { productToasts } from '../utils/toastConfig';
import Navbar from './Navbar';
import ProductCard from './ProductCard';

const ProductDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchProductData();
  }, [id]);

  useEffect(() => {
    if (id) {
      setIsWishlisted(isInWishlist(id));
    }
  }, [id, isInWishlist]);

  const fetchProductData = async () => {
    try {
      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          seller_details:seller_id (
            id,
            full_name,
            campus_location,
            phone,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch shop details if they exist
      if (productData?.seller_id) {
        const { data: shopData } = await supabase
          .from('shops')
          .select('*')
          .eq('id', productData.seller_id)
          .single();
          
        setShop(shopData);

        // Fetch related products from same shop
        const { data: relatedData } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', productData.seller_id)
          .neq('id', id) // Exclude current product
          .eq('status', 'active')
          .limit(4);

        setRelatedProducts(relatedData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      productToasts.loadError();
    } finally {
      setLoading(false);
    }
  };

  const handleWishlist = async () => {
    try {
      if (isWishlisted) {
        await removeFromWishlist(id);
        setIsWishlisted(false);
      } else {
        await addToWishlist(product);
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto p-4">
          <div className="animate-pulse">
            <div className="h-96 bg-primary/5 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-8 bg-primary/5 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-primary/5 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto p-4">
          <p className="text-center text-primary/80 dark:text-gray-300">Product not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-primary/10 dark:border-gray-600">
              <img 
                src={imageError ? "/api/placeholder/600/600" : (product.image_url || "/api/placeholder/600/600")} 
                alt={product.name}
                className="w-full h-full object-contain"
                onError={() => setImageError(true)}
              />
            </div>
            <button 
              onClick={handleWishlist}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-colors"
            >
              <Heart 
                className={`h-6 w-6 ${isWishlisted ? 'fill-secondary text-secondary' : 'text-primary/60 dark:text-gray-300'}`}
              />
            </button>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2 text-primary dark:text-gray-100">
                {product.name}
              </h1>
              <div className="flex items-baseline space-x-4">
                <span className="text-2xl font-bold text-secondary dark:text-green-400">
                  KES {product.price?.toLocaleString()}
                </span>
                {product.original_price && (
                  <span className="text-lg text-primary/60 dark:text-gray-400 line-through">
                    KES {product.original_price?.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Details */}
            <Card className="border border-primary/10 dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4 space-y-4">
                <p className="text-primary/80 dark:text-gray-300">{product.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-primary/60 dark:text-gray-400">Condition:</span>
                    <span className="ml-2 text-primary dark:text-gray-200">{product.condition}</span>
                  </div>
                  <div>
                    <span className="text-primary/60 dark:text-gray-400">Location:</span>
                    <span className="ml-2 text-primary dark:text-gray-200">
                      {product.location || product.seller_details?.campus_location}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                onClick={handleAddToCart}
                className="flex-1 bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
              >
                Add to Cart
              </Button>
              <Button
                variant="outline"
                className="border-primary/20 text-primary hover:bg-primary/5 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: product.name,
                      text: `Check out this ${product.name} on UniHive!`,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    productToasts.shareSuccess();
                  }
                }}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Seller Card */}
            <Card className="border border-primary/10 dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary/60 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary dark:text-gray-200">
                        {shop?.shop_name || product.seller_details?.full_name || "Seller"}
                      </h3>
                      <div className="flex items-center text-sm text-primary/60 dark:text-gray-400">
                        <MapPin className="w-4 h-4 mr-1" />
                        {product.seller_details?.campus_location || "Location not specified"}
                      </div>
                    </div>
                  </div>
                  
                </div>

                {shop?.description && (
                  <p className="text-sm text-primary/70 dark:text-gray-300 mb-3">
                    {shop.description}
                  </p>
                )}

                <Link 
                  to={`/seller/${product.seller_id}`}
                  className="flex items-center justify-between text-sm text-secondary hover:text-secondary/80 dark:text-green-400 dark:hover:text-green-500"
                >
                  <span>View Shop</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif font-bold text-primary dark:text-gray-100">
                More from this Shop
              </h2>
              <Link 
                to={`/seller/${product.seller_id}`}
                className="flex items-center text-sm text-secondary hover:text-secondary/80 dark:text-green-400 dark:hover:text-green-500"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map(relatedProduct => (
                <ProductCard 
                  key={relatedProduct.id} 
                  product={relatedProduct}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductDetails;