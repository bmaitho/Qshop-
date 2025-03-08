import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import ProductCard from './ProductCard';
import Slideshow from './Slideshow';

// Import local images for categories
import TextbooksImage from '../assets/categories/textbooks.jpg';
import ElectronicsImage from '../assets/categories/electronics.jpg';
import StationeryImage from '../assets/categories/stationery.jpg';
import StudyMaterialsImage from '../assets/categories/study-materials.jpg';

const Home = () => {
  const [wholesalerProducts, setWholesalerProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWholesalerProducts();
  }, []);

  const fetchWholesalerProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (
            id,
            email,
            campus_location,
            seller_type
          )
        `)
        .eq('profiles.seller_type', 'wholesaler')
        .eq('status', 'active')
        .limit(8)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWholesalerProducts(data || []);
    } catch (error) {
      console.error('Error fetching wholesaler products:', error);
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section with Slideshow */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Slideshow />
        </div>
        
        {/* Wholesaler Products Section */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-serif font-semibold text-primary">Wholesaler Deals</h2>
          </div>
          <p className="text-primary/80 mb-6 max-w-2xl">
            Great deals from trusted wholesalers at student-friendly prices!
          </p>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-primary/5 dark:bg-gray-700 h-48 rounded-t-lg"></div>
                  <div className="space-y-3 p-4 bg-white dark:bg-gray-800 border border-primary/10 dark:border-gray-700 rounded-b-lg">
                    <div className="h-4 bg-primary/5 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-4 bg-primary/5 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : wholesalerProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {wholesalerProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">No wholesaler products available right now.</p>
            </div>
          )}
          
          <div className="mt-4 text-right">
            <Link to="/wholesalers">
              <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 dark:border-gray-600 dark:text-gray-300">
                View All Wholesaler Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Student Marketplace Banner */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mb-8 border border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-secondary" />
                <h2 className="text-xl font-serif font-semibold text-primary">Student Marketplace</h2>
              </div>
              <p className="text-primary/80 max-w-2xl">
                Browse and buy from fellow students! Find textbooks, electronics, and more at student-friendly prices.
              </p>
            </div>
            <Link to="/studentmarketplace">
              <Button className="bg-secondary text-primary hover:bg-secondary/90 shadow-md">
                Visit Student Marketplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Categories Section */}
        <h2 className="text-2xl font-serif font-bold mb-6 text-primary dark:text-gray-100">Popular Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {categories.map((category, index) => (
            <Link 
              key={index} 
              to={`/category/${category.name.toLowerCase()}`}
              className="group"
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow border border-primary/10">
                <div className="relative">
                  <div className="w-full h-40 overflow-hidden">
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-70"></div>
                </div>
                <CardContent className="p-4 relative z-10 -mt-16">
                  <h3 className="font-serif text-lg font-semibold mb-1 text-white">{category.name}</h3>
                  <p className="text-sm text-white/90">{category.description}</p>
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