// ProductGrid.jsx
import React, { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import ProductCard from './ProductCard';
import { supabase } from '../components/SupabaseClient';
import { Loader } from 'lucide-react';

const ProductGrid = ({ category, searchQuery }) => {
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
  }, [category, searchQuery]);

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
      
      // Apply category filter if specified
      if (category) {
        query = query.eq('category', category);
      }
      
      // Apply search filter if specified
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      console.log('Products response:', { data, error });

      if (error) throw error;
      setProducts(data || []);
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