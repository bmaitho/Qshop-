import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, MapPin, Star, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '../components/SupabaseClient';
import ProductCard from './ProductCard';
import Navbar from './Navbar';

const SellerProfile = () => {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    fetchSellerData();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const fetchSellerData = async () => {
    try {
      setLoading(true);
      
      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (sellerError) throw sellerError;
      setSeller(sellerData);
      
      // Fetch seller's shop details
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!shopError) {
        setShop(shopData);
      }
      
      // Fetch seller's products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      setProducts(productsData || []);
      
    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 h-40 rounded-lg mb-6"></div>
            <div className="bg-gray-200 dark:bg-gray-700 h-24 rounded-lg mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 dark:bg-gray-700 h-48 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!seller) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Seller Not Found</h2>
            <p className="mb-4">The seller you are looking for does not exist or has been removed.</p>
            <Link to="/studentmarketplace">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Shop Banner (if available) */}
        {shop?.banner_url && (
          <div className="w-full h-40 md:h-56 lg:h-64 rounded-lg overflow-hidden mb-6">
            <img 
              src={shop.banner_url} 
              alt={`${shop.shop_name || seller.full_name} banner`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/api/placeholder/1200/400";
              }}
            />
          </div>
        )}
        
        {/* Seller Profile Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mx-auto md:mx-0">
                <User className="w-12 h-12 text-gray-500 dark:text-gray-400" />
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold mb-2">
                  {shop?.shop_name || seller.full_name}
                </h1>
                
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {seller.campus_location || "Location not specified"}
                  </span>
                </div>
                
                {shop?.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {shop.description}
                  </p>
                )}
                
                {shop?.offers_delivery && (
                  <div className="text-sm text-green-600 dark:text-green-400 mb-2">
                    ✓ Offers delivery
                  </div>
                )}
                
                {shop?.preferred_contact && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Contact:</strong> {shop.preferred_contact}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Seller's Products */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Products by this Seller</h2>
          
          {products.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300">
                This seller has no active products at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-8">
          <Link to="/studentmarketplace">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default SellerProfile;