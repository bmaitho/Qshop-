import React from 'react';
import Navbar from './Navbar';
import ProductGrid from './ProductGrid';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter } from 'lucide-react';

const StudentMarketplace = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-gray-800">Student Marketplace</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              {/* Filter content goes here */}
              <div className="space-y-4">
                <h3 className="font-semibold">Categories</h3>
                {/* Add filter options */}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="flex gap-6">
          {/* Desktop filters */}
          <div className="hidden lg:block w-64 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Categories</h3>
              {/* Add filter options */}
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