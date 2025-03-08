// StudentProductGrid.jsx
import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { supabase } from '../components/SupabaseClient';

const StudentProductGrid = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudentProducts();
  }, []);

  const fetchStudentProducts = async () => {
    try {
      console.log('Fetching student products...');
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!inner(
            id,
            full_name,
            campus_location,
            seller_type
          )
        `)
        .eq('profiles.seller_type', 'student')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      console.log('Student products response:', { data, error });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching student products:', err);
      setError('Failed to load student products');
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

  if (products.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600 dark:text-gray-400">No student products available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default StudentProductGrid;