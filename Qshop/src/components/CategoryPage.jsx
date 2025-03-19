import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, SlidersHorizontal, ArrowLeft, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger
} from "@/components/ui/sheet";
import { supabase } from '../components/SupabaseClient';
import ProductCard from './ProductCard';
import Navbar from './Navbar';

// Function to determine if a string is a UUID
const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Custom debounce function
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const CategoryPage = () => {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortOrder, setSortOrder] = useState('price-asc');
  const [displayPriceRange, setDisplayPriceRange] = useState([0, 100000]);
  const [selectedFilters, setSelectedFilters] = useState({
    condition: [],
    priceRange: [0, 100000],
    location: []
  });
  const [categories, setCategories] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({});

  // Create debounced versions of filters for API calls
  const debouncedFilters = useDebounce(selectedFilters, 300);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch categories to build the mapping
  useEffect(() => {
    fetchCategories();
  }, []);

  // Separate useEffect for filter changes to show loading state
  useEffect(() => {
    if (JSON.stringify(debouncedFilters) !== JSON.stringify(selectedFilters)) {
      setIsFiltering(true);
    } else {
      fetchProducts();
    }
  }, [selectedFilters]);

  // Another useEffect that triggers when debounced filters change
  useEffect(() => {
    fetchProducts();
  }, [categoryName, debouncedFilters, sortOrder, categoriesMap]);

  const fetchCategories = async () => {
    try {
      // Fetch all categories from the categories table
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('status', 'approved');

      if (categoriesError) throw categoriesError;
      
      // Create a mapping from category ID to category name
      const mapping = {};
      categoriesData.forEach(cat => {
        mapping[cat.id] = cat.name;
      });
      
      setCategoriesMap(mapping);
      setCategories(categoriesData);
      
      // Also get distinct category values from products for backward compatibility
      const { data: distinctCategories, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .order('category');

      if (error) throw error;

      // Remove duplicates and null values
      const uniqueCategories = [...new Set(distinctCategories.map(item => item.category))].filter(Boolean);
      
      // Don't override the categories we got from the categories table
      // This is just for reference
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsFiltering(true);
      
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            campus_location
          )
        `)
        .eq('category', categoryName);

      // Apply filters
      if (debouncedFilters.condition.length > 0) {
        query = query.in('condition', debouncedFilters.condition);
      }

      // Price range filter (min and max)
      query = query.gte('price', debouncedFilters.priceRange[0])
                  .lte('price', debouncedFilters.priceRange[1]);

      // Campus location filter
      if (debouncedFilters.location.length > 0) {
        query = query.in('location', debouncedFilters.location);
      }

      // Add sorting
      if (sortOrder === 'price-asc') {
        query = query.order('price', { ascending: true });
      } else if (sortOrder === 'price-desc') {
        query = query.order('price', { ascending: false });
      } else if (sortOrder === 'newest') {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  // Get a display name for a category, handling both string names and UUIDs
  const getCategoryDisplayName = (categoryValue) => {
    // If it's a UUID, look up in the categoriesMap
    if (isUUID(categoryValue)) {
      return categoriesMap[categoryValue] || 'Unknown Category';
    }
    // If it's a string name, capitalize first letter
    return categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1);
  };

  // Immediate UI update for slider, but debounced filter application
  const handlePriceChange = (value) => {
    // Update the display value immediately for visual feedback
    setDisplayPriceRange(value);
    
    // Update the actual filter value (which will be debounced)
    setSelectedFilters(prev => ({
      ...prev,
      priceRange: value
    }));
  };

  const toggleCondition = (condition) => {
    setSelectedFilters(prev => ({
      ...prev,
      condition: prev.condition.includes(condition)
        ? prev.condition.filter(c => c !== condition)
        : [...prev.condition, condition]
    }));
  };

  const resetFilters = () => {
    setDisplayPriceRange([0, 100000]);
    setSelectedFilters({
      condition: [],
      priceRange: [0, 100000],
      location: []
    });
    setSortOrder('price-asc');
  };

  const FilterContent = ({ onClose }) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Reset
        </Button>
      </div>
      
      <div>
        <h4 className="font-medium mb-3">Sort By</h4>
        <div className="space-y-2">
          <select
            className="w-full p-2 border rounded-md bg-background"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-3">Condition</h4>
        <div className="space-y-2">
          {['New', 'Used - Like New', 'Used - Good', 'Used - Fair'].map(condition => (
            <div key={condition} className="flex items-center space-x-2">
              <Checkbox 
                id={`condition-${condition}`}
                checked={selectedFilters.condition.includes(condition)}
                onCheckedChange={() => toggleCondition(condition)}
              />
              <label 
                htmlFor={`condition-${condition}`}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {condition}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-3">Price Range</h4>
        <div className="space-y-4">
          <Slider
            defaultValue={displayPriceRange}
            min={0}
            max={100000}
            step={1000}
            value={displayPriceRange}
            onValueChange={handlePriceChange}
            className="z-0"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>KES {displayPriceRange[0].toLocaleString()}</span>
            <span>KES {displayPriceRange[1].toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-3">Campus Location</h4>
        <div className="space-y-2">
          {['Main Campus', 'City Campus', 'Parklands Campus', 'Westlands Campus'].map(location => (
            <div key={location} className="flex items-center space-x-2">
              <Checkbox 
                id={`location-${location}`}
                checked={selectedFilters.location.includes(location)}
                onCheckedChange={() => {
                  setSelectedFilters(prev => ({
                    ...prev,
                    location: prev.location.includes(location)
                      ? prev.location.filter(l => l !== location)
                      : [...prev.location, location]
                  }));
                }}
              />
              <label 
                htmlFor={`location-${location}`}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {location}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {isMobile && (
        <div className="pt-4 sticky bottom-0 bg-white border-t mt-6">
          <Button className="w-full" onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-4 mt-12">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 w-1/3 mb-4 rounded"></div>
            <div className="h-6 bg-gray-200 w-2/3 mb-6 rounded"></div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-48 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-4 mt-12">
        {/* Category header */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link to="/" className="hover:text-orange-600">Home</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {getCategoryDisplayName(categoryName)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold capitalize`}>
              {getCategoryDisplayName(categoryName)}
            </h1>
            {isMobile && (
              <Badge variant="outline">
                {products.length} items
              </Badge>
            )}
          </div>
        </div>

        {/* Mobile filter bar */}
        {isMobile && (
          <div className="bg-white shadow-sm py-2 px-2 rounded-lg mb-4 flex items-center justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center space-x-1">
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-xs overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <SheetClose asChild>
                  <div className="h-full overflow-y-auto pb-20">
                    <FilterContent onClose={() => {}} />
                  </div>
                </SheetClose>
              </SheetContent>
            </Sheet>
            
            <select
              className="py-1 px-2 border rounded-md text-sm bg-background flex-grow ml-2"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        )}

        {/* Desktop layout with sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop sidebar filters */}
          <Card className="lg:col-span-1 h-fit hidden lg:block">
            <CardContent className="p-4">
              <FilterContent onClose={() => {}} />
            </CardContent>
          </Card>

          {/* Product grid */}
          <div className="lg:col-span-3">
            {/* Desktop info bar */}
            {!isMobile && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">
                    {products.length} items
                  </Badge>
                  
                  {Object.values(selectedFilters).some(val => 
                    Array.isArray(val) && val.length > 0 && 
                    !(val.length === 2 && val[0] === 0 && val[1] === 100000)
                  ) && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8">
                      Clear filters
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Sort:</span>
                  <select
                    className="p-1 border rounded-md text-sm bg-background"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>
            )}

            {/* Filtering indicator */}
            {isFiltering && (
              <div className="mb-4 p-2 bg-orange-50 rounded-md text-sm text-orange-600 flex items-center justify-center">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-orange-600 border-t-transparent rounded-full"></div>
                Updating results...
              </div>
            )}

            {/* Products */}
            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <SlidersHorizontal className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or check back later for new items
                </p>
                <Button onClick={resetFilters}>Reset Filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {products.map(product => {
                  // Process product to handle category before passing to ProductCard
                  const processedProduct = {
                    ...product,
                    display_category: getCategoryDisplayName(product.category)
                  };
                  return (
                    <ProductCard key={product.id} product={processedProduct} />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryPage;