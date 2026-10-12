// Updated Home.jsx with green hue removed from category cards

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { Button } from "@/components/ui/button";
import { Store, ShoppingBag, Sparkles, Shirt, Coffee, BookOpen, Laptop, Headphones, Car, Pencil, GraduationCap } from 'lucide-react';
import FeaturedShops from './FeaturedShops';
import GoodsServicesToggle from './GoodsServicesToggle';
import UniHiveBillboard, { buildHomeSlides } from './hive/UniHiveBillboard';
import OfficialPartners from './hive/OfficialPartners';
import { supabase } from './SupabaseClient';

// Import local images for categories
import TextbooksImage from '../assets/categories/textbooks.jpg';
import ElectronicsImage from '../assets/categories/electronics.jpg';
import StationeryImage from '../assets/categories/stationery.jpg';
import StudyMaterialsImage from '../assets/categories/study-materials.jpg';

const Home = () => {
  const navigate = useNavigate();
  const [media, setMedia] = useState({ banners: [], products: [] });

  useEffect(() => {
    (async () => {
      const [{ data: shops }, { data: prods }] = await Promise.all([
        supabase.from('shops').select('banner_url').not('banner_url', 'is', null).limit(12),
        supabase.from('products').select('image_url').eq('status', 'active').not('image_url', 'is', null).order('created_at', { ascending: false }).limit(12),
      ]);
      setMedia({
        banners: (shops || []).map((x) => x.banner_url).filter(Boolean),
        products: (prods || []).map((x) => x.image_url).filter(Boolean),
      });
    })();
  }, []);
  const slides = useMemo(() => buildHomeSlides(media), [media]);

  const categories = [
    { 
      name: "Textbooks", 
      image: TextbooksImage,
      description: "Find your course materials",
      icon: BookOpen,
      path: "/category/textbooks"
    },
    { 
      name: "Electronics", 
      image: ElectronicsImage,
      description: "Student tech deals",
      icon: Laptop,
      path: "/category/electronics"
    },
    { 
      name: "Stationery", 
      image: StationeryImage,
      description: "Notes and supplies",
      icon: Pencil,
      path: "/category/stationery"
    },
    { 
      name: "Study Materials", 
      image: StudyMaterialsImage,
      description: "Past papers and notes",
      icon: GraduationCap,
      path: "/category/study-materials"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero — UniHive billboard (real event media + rotating tips) */}
      <UniHiveBillboard slides={slides}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            size="lg"
            className="bg-[#e7c65f] text-[#113b1e] hover:bg-[#e7c65f]/90 w-full sm:w-auto"
            onClick={() => navigate('/studentmarketplace')}
          >
            Start Shopping
            <ShoppingBag className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-black/40 backdrop-blur border-[#e7c65f] hover:bg-[#e7c65f]/20 w-full sm:w-auto text-[#e7c65f]"
            onClick={() => navigate('/myshop')}
          >
            Open Your Shop
            <Sparkles className="ml-2 h-5 w-5" />
          </Button>
          <div className="sm:ml-2 flex justify-center">
            <GoodsServicesToggle variant="dark" />
          </div>
        </div>
      </UniHiveBillboard>

      {/* Featured Shops Section */}
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-10 py-16 border-b border-gray-200 dark:border-gray-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold mb-4 text-[#113b1e] dark:text-white">
            Featured Shops
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover top Shops owned by entrepreneurs
          </p>
        </div>
        
        <FeaturedShops />
        
        <div className="text-center mt-10">
          <Button 
            onClick={() => navigate('/studentmarketplace')}
            className="bg-[#113b1e] text-white hover:bg-[#113b1e]/90 px-8"
          >
            Explore All Shops
            <Store className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <OfficialPartners />

      {/* Categories Section - UPDATED: Removed green hue */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold mb-4 text-[#113b1e] dark:text-white">
            Browse Categories
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Explore what the Hive is selling — from tech to everyday essentials
          </p>
        </div>
        
        <div className="category-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <div 
                key={index} 
                className="category-card cursor-pointer group"
                onClick={() => navigate(category.path)}
              >
                <div className="relative">
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent"></div>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-full">
                    <Icon className="w-6 h-6 text-[#113b1e]" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="font-serif text-xl font-bold mb-2 text-white group-hover:text-[#e7c65f] transition-colors drop-shadow-lg">
                      {category.name}
                    </h3>
                    <p className="text-white text-sm drop-shadow-lg font-medium">
                      {category.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Home;