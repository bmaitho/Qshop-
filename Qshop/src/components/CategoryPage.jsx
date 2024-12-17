import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import ProductCard from './ProductCard';

const CategoryPage = () => {
  const [selectedFilters, setSelectedFilters] = React.useState({
    condition: [],
    price: null,
    location: []
  });

  const products = [
    {
      id: 1,
      name: "iPhone 13 Pro",
      price: 85000,
      condition: "Used - Like New",
      location: "Nairobi",
      rating: 4.5,
      reviews: 12,
      image: "/api/placeholder/400/300"
    },
    // Add more products as needed
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Electronics</h1>
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
                      price: e.target.value
                    }));
                  }}
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>KES 0</span>
                  <span>KES 100,000+</span>
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