// StudentMarketplace.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import ProductGrid from './ProductGrid';

const StudentMarketplace = ({token}) => {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {token.user.user_metadata.full_name}</h1>
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
          </div>

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
        </div>
        
        <div className="flex gap-6">
          {/* Desktop filters */}
          <div className="hidden lg:block w-64 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <FilterContent />
            </div>
          </div>
          
          {/* Main content */}
          <main className="flex-1">
            <ProductGrid />
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentMarketplace;