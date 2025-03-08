// WholesalerProducts.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Filter, Search, Box } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import ProductCard from './ProductCard';

const WholesalerProducts = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchCategories();
    fetchWholesalerProducts();
    
    // Set up listener for screen size changes
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch distinct categories from wholesaler products only
      const { data, error } = await supabase
        .from('products')
        .select(`
          category,
          profiles!inner(seller_type)
        `)
        .eq('profiles.seller_type', 'wholesaler')
        .not('category', 'is', null)
        .order('category');

      if (error) throw error;

      // Remove duplicates and null values
      const uniqueCategories = [...new Set(data.map(item => item.category))].filter(Boolean);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchWholesalerProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!inner(
            id,
            full_name,
            email,
            campus_location,
            seller_type
          ),
          wholesaler_details(
            business_name,
            business_description,
            business_address
          )
        `)
        .eq('profiles.seller_type', 'wholesaler')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching wholesaler products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&seller_type=wholesaler`);
    }
  };

  const FilterContent = () => (
    <div className="space-y-4">
      <h3 className="font-semibold">Categories</h3>
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => navigate(`/category/${category}?seller_type=wholesaler`)}
            className="block w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className={`max-w-7xl mx-auto px-4 ${isMobile ? 'mt-14 mb-16' : ''}`}>
        {/* Welcome header */}
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Wholesaler Products
            </h1>
            
            {!isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <FilterContent />
                </SheetContent>
              </Sheet>
            )}
          </div>
          
          <p className="text-gray-600 dark:text-gray-400">
            Quality products from verified wholesalers at the best prices.
          </p>
          
          {/* Only show search on desktop - mobile has search in navbar */}
          {!isMobile && (
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="search"
                placeholder="Search wholesaler products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Search</Button>
            </form>
          )}
        </div>
        
        {/* Mobile search bar */}
        {isMobile && (
          <div className="mb-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>
          </div>
        )}
        
        {/* Mobile categories quick access */}
        {isMobile && categories.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Categories</h2>
            <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
              {categories.slice(0, 10).map((category) => (
                <button
                  key={category}
                  onClick={() => navigate(`/category/${category}?seller_type=wholesaler`)}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Main content layout */}
        <div className="flex gap-6">
          {/* Desktop side filters */}
          {!isMobile && (
            <div className="hidden lg:block w-64 space-y-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-900/30">
                <FilterContent />
              </div>
            </div>
          )}
          
          {/* Product grid */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-primary/5 dark:bg-gray-700 h-48 rounded-t-lg"></div>
                    <div className="space-y-3 p-4 bg-white dark:bg-gray-800 border border-primary/10 dark:border-gray-700 rounded-b-lg">
                      <div className="h-4 bg-primary/5 dark:bg-gray-600 rounded w-3/4"></div>
                      <div className="h-4 bg-primary/5 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Box className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No wholesaler products available at the moment.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default WholesalerProducts;