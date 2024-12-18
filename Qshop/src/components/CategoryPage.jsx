// src/components/CategoryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ProductCard from './ProductCard';
import Navbar from './Navbar';

// Mock data for categories and their properties
const categories = {
  electronics: {
    name: "Electronics",
    icon: "💻",
    subCategories: ["Laptops", "Phones", "Tablets", "Accessories"],
    brands: ["Apple", "Samsung", "HP", "Dell", "Lenovo"]
  },
  books: {
    name: "Books",
    icon: "📚",
    subCategories: ["Textbooks", "Novels", "Study Materials", "Magazines"],
    subjects: ["Engineering", "Medicine", "Business", "Arts", "Sciences"]
  },
  furniture: {
    name: "Furniture",
    icon: "🪑",
    subCategories: ["Chairs", "Desks", "Storage", "Decor"],
    materials: ["Wood", "Metal", "Plastic", "Glass"]
  },
  clothing: {
    name: "Clothing",
    icon: "👕",
    subCategories: ["Men's Wear", "Women's Wear", "Shoes", "Accessories"],
    sizes: ["S", "M", "L", "XL", "XXL"]
  }
};

// Mock products data
const mockProducts = [
  {
    id: 1,
    name: "MacBook Pro 2022",
    price: 180000,
    originalPrice: 200000,
    condition: "Used - Like New",
    location: "Main Campus",
    category: "electronics",
    subCategory: "Laptops",
    brand: "Apple",
    rating: 4.5,
    reviews: 15,
    description: "13-inch, 16GB RAM, 512GB SSD",
    image: "/api/placeholder/400/300"
  },
  {
    id: 2,
    name: "iPhone 13 Pro",
    price: 85000,
    originalPrice: 95000,
    condition: "Used - Good",
    location: "South Campus",
    category: "electronics",
    subCategory: "Phones",
    brand: "Apple",
    rating: 4.0,
    reviews: 8,
    description: "128GB, Graphite",
    image: "/api/placeholder/400/300"
  },
  {
    id: 3,
    name: "Samsung Galaxy Tab S7",
    price: 55000,
    condition: "Used - Fair",
    location: "North Campus",
    category: "electronics",
    subCategory: "Tablets",
    brand: "Samsung",
    rating: 4.2,
    reviews: 12,
    description: "256GB, Mystic Black",
    image: "/api/placeholder/400/300"
  }
];

const CategoryPage = () => {
  const { categoryName } = useParams();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryName || "electronics");
  const [filters, setFilters] = useState({
    subCategories: [],
    condition: [],
    priceRange: [0, 200000],
    location: [],
    brands: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryName && categories[categoryName]) {
      setSelectedCategory(categoryName);
      // Reset filters when category changes
      setFilters({
        subCategories: [],
        condition: [],
        priceRange: [0, 200000],
        location: [],
        brands: []
      });
    }
    // Simulate loading
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, [categoryName]);

  const FilterPanel = ({ className }) => (
    <div className={className}>
      {/* SubCategories */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">SubCategories</h3>
        <div className="space-y-2">
          {categories[selectedCategory]?.subCategories.map(sub => (
            <label key={sub} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.subCategories.includes(sub)}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    subCategories: e.target.checked
                      ? [...prev.subCategories, sub]
                      : prev.subCategories.filter(s => s !== sub)
                  }));
                }}
                className="rounded border-gray-300"
              />
              <span>{sub}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Brands/Properties based on category */}
      {selectedCategory === 'electronics' && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">Brands</h3>
          <div className="space-y-2">
            {categories[selectedCategory].brands.map(brand => (
              <label key={brand} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={(e) => {
                    setFilters(prev => ({
                      ...prev,
                      brands: e.target.checked
                        ? [...prev.brands, brand]
                        : prev.brands.filter(b => b !== brand)
                    }));
                  }}
                  className="rounded border-gray-300"
                />
                <span>{brand}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Condition */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Condition</h3>
        <div className="space-y-2">
          {['New', 'Used - Like New', 'Used - Good', 'Used - Fair'].map(condition => (
            <label key={condition} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.condition.includes(condition)}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    condition: e.target.checked
                      ? [...prev.condition, condition]
                      : prev.condition.filter(c => c !== condition)
                  }));
                }}
                className="rounded border-gray-300"
              />
              <span>{condition}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Price Range</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Min Price: KES {filters.priceRange[0].toLocaleString()}</label>
            <input
              type="range"
              min="0"
              max="200000"
              step="1000"
              value={filters.priceRange[0]}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFilters(prev => ({
                  ...prev,
                  priceRange: [value, Math.max(value, prev.priceRange[1])]
                }));
              }}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Max Price: KES {filters.priceRange[1].toLocaleString()}</label>
            <input
              type="range"
              min="0"
              max="200000"
              step="1000"
              value={filters.priceRange[1]}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFilters(prev => ({
                  ...prev,
                  priceRange: [Math.min(value, prev.priceRange[0]), value]
                }));
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Reset Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setFilters({
            subCategories: [],
            condition: [],
            priceRange: [0, 200000],
            location: [],
            brands: []
          });
          setSearch("");
        }}
      >
        Reset Filters
      </Button>
    </div>
  );

  // Filter products based on all criteria
  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = search === "" ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = product.category === selectedCategory;

    const matchesSubCategory = filters.subCategories.length === 0 ||
      filters.subCategories.includes(product.subCategory);

    const matchesCondition = filters.condition.length === 0 ||
      filters.condition.includes(product.condition);

    const matchesPrice = product.price >= filters.priceRange[0] &&
      product.price <= filters.priceRange[1];

    const matchesBrand = filters.brands.length === 0 ||
      filters.brands.includes(product.brand);

    return matchesSearch && matchesCategory && matchesSubCategory && 
           matchesCondition && matchesPrice && matchesBrand;
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-64 bg-gray-200 rounded"></div>
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {categories[selectedCategory]?.icon} {categories[selectedCategory]?.name}
            </h1>
            <p className="text-gray-600 mt-1">{filteredProducts.length} items found</p>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <FilterPanel className="mt-6" />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters */}
          <Card className="hidden md:block w-64 h-fit">
            <CardHeader>
              <h2 className="font-semibold">Filters</h2>
            </CardHeader>
            <CardContent>
              <FilterPanel />
            </CardContent>
          </Card>

          {/* Product Grid */}
          <div className="flex-1">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-600">No products found matching your criteria</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setFilters({
                      subCategories: [],
                      condition: [],
                      priceRange: [0, 200000],
                      location: [],
                      brands: []
                    });
                    setSearch("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryPage;