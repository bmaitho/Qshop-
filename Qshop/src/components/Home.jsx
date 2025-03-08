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
    <div className="min-h-screen bg-[#0D2B20] text-white">
      <Navbar />
      
      {/* Featured Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mb-8 border border-primary/20 transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-serif font-semibold text-white">Student Marketplace Deals</h2>
          </div>
          <p className="text-white mb-6 max-w-2xl">
            Save up to 70% on textbooks and supplies from fellow students!
          </p>
          <Link to="/studentmarketplace">
            <Button className="bg-secondary text-primary hover:bg-secondary/90 shadow-md">
              View All Student Deals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Categories Section */}
        <h2 className="text-2xl font-serif font-bold mb-6 text-white">Popular Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {categories.map((category, index) => (
            <Link 
              key={index} 
              to={`/category/${category.name.toLowerCase()}`}
              className="group"
            >
              <Card className="overflow-hidden border border-primary/10 transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                <div className="relative">
                  <div className="w-full h-40 sm:h-48 md:h-52 overflow-hidden">
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-70"></div>
                </div>
                <CardContent className="p-4 relative z-10 -mt-16">
                  <h3 className="font-['Playfair_Display'] text-lg font-bold mb-1 text-white group-hover:text-secondary transition-colors duration-300 transform group-hover:scale-105">
                    {category.name}
                  </h3>
                  <p className="font-['Lato'] text-sm text-white/90 group-hover:text-white transition-colors duration-300 transform group-hover:scale-105">
                    {category.description}
                  </p>
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
