import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import ProductCard from './ProductCard';

// Import local images for categories
import TextbooksImage from '../assets/categories/textbooks.jpg';
import ElectronicsImage from '../assets/categories/electronics.jpg';
import StationeryImage from '../assets/categories/stationery.jpg';
import StudyMaterialsImage from '../assets/categories/study-materials.jpg';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (
            id,
            email,
            campus_location
          )
        `)
        .limit(4)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeaturedProducts(data || []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { 
      name: "Textbooks", 
      image: TextbooksImage, 
      description: "Find your course materials" 
    },
    { 
      name: "Electronics", 
      image: ElectronicsImage, 
      description: "Student tech deals" 
    },
    { 
      name: "Stationery", 
      image: StationeryImage, 
      description: "Notes and supplies" 
    },
    { 
      name: "Study Materials", 
      image: StudyMaterialsImage, 
      description: "Past papers and notes" 
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Featured Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-orange-100 to-orange-50 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-semibold">Student Marketplace Deals</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Save up to 70% on textbooks and supplies from fellow students!
          </p>
          <Link to="/studentmarketplace">
            <Button className="bg-orange-600 hover:bg-orange-700">
              View All Student Deals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Featured Products Grid */}
        <h2 className="text-2xl font-bold mb-6">Latest Listings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {loading ? (
            [...Array(4)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>

        {/* Categories Section */}
        <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {categories.map((category, index) => (
            <Link 
              key={index} 
              to={`/category/${category.name.toLowerCase()}`}
              className="group"
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <img 
                  src={category.image} 
                  alt={category.name}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                />
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;