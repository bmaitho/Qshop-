// CategoryPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { supabase } from '../components/SupabaseClient';
import ProductCard from './ProductCard';

const CategoryPage = () => {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState({
    condition: [],
    price: null,
    location: []
  });

  useEffect(() => {
    fetchProducts();
  }, [categoryName, selectedFilters]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (*)
        `)
        .eq('category', categoryName);

      // Apply filters
      if (selectedFilters.condition.length > 0) {
        query = query.in('condition', selectedFilters.condition);
      }

      if (selectedFilters.price) {
        query = query.lte('price', selectedFilters.price);
      }

      if (selectedFilters.location.length > 0) {
        query = query.in('location', selectedFilters.location);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 w-1/4 mb-6 rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold capitalize">{categoryName}</h1>
        <div className="text-sm text-gray-600">
          {products.length} items found
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <h2 className="text-lg font-semibold">Filters</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Condition</h3>
                <div className="space-y-2">
                  {['New', 'Used - Like New', 'Used - Good', 'Used - Fair'].map(condition => (
                    <label key={condition} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={selectedFilters.condition.includes(condition)}
                        onChange={() => {
                          setSelectedFilters(prev => ({
                            ...prev,
                            condition: prev.condition.includes(condition)
                              ? prev.condition.filter(c => c !== condition)
                              : [...prev.condition, condition]
                          }));
                        }}
                      />
                      {condition}
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Price Range</h3>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="1000"
                  className="w-full"
                  onChange={(e) => {
                    setSelectedFilters(prev => ({
                      ...prev,
                      price: Number(e.target.value)
                    }));
                  }}
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>KES 0</span>
                  <span>KES {selectedFilters.price || '100,000'}+</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;