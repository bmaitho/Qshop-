// StudentMarketplace.jsx
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
      <h3 className="font-semibold">Categories</h3>
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => navigate(`/category/${category}`)}
            className="block w-full text-left px-2 py-1.5 rounded hover:bg-gray-100"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className={`max-w-7xl mx-auto px-4 ${isMobile ? 'mt-14 mb-16' : ''}`}>
        {/* Welcome header */}
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
            <h2 className="text-lg font-semibold mb-3">Categories</h2>
            <div className="grid grid-cols-4 gap-2">
              {categories.slice(0, 8).map((category) => (
                <button
                  key={category}
                  onClick={() => navigate(`/category/${category}`)}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-1">
                    <span className="text-orange-600 font-bold">{category.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-xs text-center truncate w-full">{category}</span>
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
              <div className="bg-white p-4 rounded-lg shadow">
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