import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import ProductGrid from './ProductGrid';

const StudentMarketplace = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchCategories();
    
    // Set up listener for screen size changes
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch distinct categories from products
      const { data, error } = await supabase
        .from('products')
        .select('category')
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const FilterContent = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-primary dark:text-gray-100">Categories</h3>
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => navigate(`/category/${category}`)}
            className="block w-full text-left px-2 py-1.5 rounded text-primary dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-gray-700"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <Navbar />
      
      <div className={`max-w-7xl mx-auto px-4 ${isMobile ? 'mt-14 mb-16' : ''}`}>
        {/* Welcome header */}
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-primary dark:text-gray-100">
              Welcome, {token?.user?.user_metadata?.full_name || 'Student'}
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
          
          {/* Only show search on desktop - mobile has search in navbar */}
          {!isMobile && (
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="search"
                placeholder="Search products..."
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/50 dark:text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
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
            <h2 className="text-lg font-semibold mb-3 text-primary dark:text-gray-100">Categories</h2>
            <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
              {categories.slice(0, 10).map((category) => (
                <button
                  key={category}
                  onClick={() => navigate(`/category/${category}`)}
                  className="flex-shrink-0 px-3 py-1.5 bg-primary/10 dark:bg-gray-700 rounded-full text-sm text-primary dark:text-gray-300 hover:bg-primary/20 dark:hover:bg-gray-600 transition-colors"
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
              <div className="bg-card dark:bg-card p-4 rounded-lg shadow dark:shadow-gray-900/30 border border-primary/10 dark:border-gray-700">
                <FilterContent />
              </div>
            </div>
          )}
          
          {/* Product grid */}
          <main className="flex-1">
            <ProductGrid />
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentMarketplace;