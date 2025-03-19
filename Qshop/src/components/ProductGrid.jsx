// ProductGrid.jsx with category fixes
import React, { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import ProductCard from './ProductCard';
import { supabase } from '../components/SupabaseClient';
import { Loader } from 'lucide-react';

// Function to determine if a string is a UUID
const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const ProductGrid = ({ category, searchQuery, categoriesMap = {} }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define breakpoints for the masonry layout
  const breakpointColumnsObj = {
    default: 4, // 4 columns for default desktop view (>1280px)
    1280: 3,    // 3 columns for medium desktop view
    768: 2,     // 2 columns for tablet view
    640: 2      // 2 columns for mobile view
  };

  useEffect(() => {
    fetchProducts();
  }, [category, searchQuery, categoriesMap]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('Fetching products...', { category, searchQuery });
      
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
        .order('created_at', { ascending: false });
      
      // Apply category filter if specified, handling both direct names and UUIDs
      if (category) {
        // Check if the category is a UUID or a name
        if (isUUID(category)) {
          // Direct UUID from categories table
          query = query.eq('category', category);
        } else {
          // It's a display name, need to find matching categories
          // First, look for direct matches with the string name (old format)
          // Then look for matches in the categories map (new format)
          
          // Convert category to lowercase for case-insensitive matching
          const lowercaseCategory = category.toLowerCase();
          
          // Find any category IDs that map to this category name
          const matchingCategoryIds = Object.entries(categoriesMap)
            .filter(([id, name]) => name.toLowerCase() === lowercaseCategory)
            .map(([id]) => id);
          
          if (matchingCategoryIds.length > 0) {
            // If we found matching IDs in the categories map
            // Use .in() to match any of these IDs
            query = query.in('category', [...matchingCategoryIds, category]);
          } else {
            // Otherwise, just use the direct category name
            query = query.eq('category', category);
          }
        }
      }
      
      // Apply search filter if specified
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      console.log('Products response:', { data, error });

      if (error) throw error;
      
      // Process products to have display_category
      const processedProducts = (data || []).map(product => {
        let displayCategory = product.category;
        
        // If the category is a UUID, try to get the display name from the map
        if (isUUID(product.category) && categoriesMap[product.category]) {
          displayCategory = categoriesMap[product.category];
        } else if (typeof product.category === 'string') {
          // For string categories, capitalize the first letter
          displayCategory = product.category.charAt(0).toUpperCase() + product.category.slice(1);
        }
        
        return {
          ...product,
          display_category: displayCategory
        };
      });
      
      setProducts(processedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="text-center py-10">
        <p className="text-primary/70 dark:text-gray-300">No products found</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Masonry 
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid -ml-4 w-auto"
        columnClassName="masonry-grid-column pl-4 bg-clip-padding"
      >
        {products.map((product) => (
          <div key={product.id} className="mb-4">
            <ProductCard 
              product={product} 
              className="product-card"
              // Add a randomized description length to create variable heights
              useFullDescription={Math.random() > 0.5}
            />
          </div>
        ))}
      </Masonry>
    </div>
  );
};

export default ProductGrid;