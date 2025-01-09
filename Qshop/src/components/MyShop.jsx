// MyShop.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Settings, Package, Star, DollarSign, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from '../components/SupabaseClient';
import { shopToasts } from '../utils/toastConfig';
import ProductCard from './ProductCard';
import Navbar from './Navbar';
import AddProductForm from './AddProductForm';
import ShopSettingsForm from './ShopSettingsForm';

const MyShop = () => {
  const [shopData, setShopData] = useState(null);
  const [products, setProducts] = useState([]);
  const [statistics, setStatistics] = useState({
    totalSales: 0,
    totalRevenue: 0,
    activeListings: 0,
    soldItems: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopData();
    fetchProducts();
    fetchStatistics();
  }, []);

  const fetchShopData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: shop, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setShopData(shop);
    } catch (error) {
      console.error('Error fetching shop data:', error);
      shopToasts.loadError();
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('products')
        .select('*, product_ratings(*)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      shopToasts.loadError();
    }
  };

  const fetchStatistics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get sales statistics
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('sale_price')
        .eq('seller_id', user.id);

      if (salesError) throw salesError;

      // Get product statistics
      const { data: productStats, error: productError } = await supabase
        .from('products')
        .select('status')
        .eq('seller_id', user.id);

      if (productError) throw productError;

      // Get average rating
      const { data: ratingData, error: ratingError } = await supabase
        .from('shop_ratings')
        .select('rating')
        .eq('shop_id', user.id);

      if (ratingError) throw ratingError;

      // Calculate statistics
      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.sale_price || 0), 0) || 0;
      const activeListings = productStats?.filter(p => p.status === 'active').length || 0;
      const soldItems = productStats?.filter(p => p.status === 'sold').length || 0;
      const averageRating = ratingData?.length 
        ? (ratingData.reduce((sum, rating) => sum + rating.rating, 0) / ratingData.length)
        : 0;

      setStatistics({
        totalSales,
        totalRevenue,
        activeListings,
        soldItems,
        averageRating
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      shopToasts.statsError();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (productId, newStatus) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          status: newStatus,
          ...(newStatus === 'sold' ? { sold_at: new Date().toISOString() } : {})
        })
        .eq('id', productId);

      if (error) throw error;
      
      fetchProducts();
      fetchStatistics();
      shopToasts.statusUpdateSuccess(newStatus);
    } catch (error) {
      console.error('Error updating product status:', error);
      shopToasts.statusUpdateError();
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      fetchProducts();
      fetchStatistics();
      shopToasts.deleteProductSuccess();
    } catch (error) {
      console.error('Error deleting product:', error);
      shopToasts.deleteProductError();
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
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
      <div className="max-w-7xl mx-auto p-4">
        {/* Shop Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {shopData?.shop_name || "My Shop"}
            </h1>
            <p className="text-gray-600">
              {shopData?.description || "No description available"}
            </p>
          </div>
          <div className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Shop Settings
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Shop Settings</SheetTitle>
                  <SheetDescription>
                    Update your shop information and preferences
                  </SheetDescription>
                </SheetHeader>
                <ShopSettingsForm 
                  shopData={shopData} 
                  onUpdate={fetchShopData} 
                />
              </SheetContent>
            </Sheet>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Add New Product</SheetTitle>
                  <SheetDescription>
                    Add a new product to your shop
                  </SheetDescription>
                </SheetHeader>
                <AddProductForm onSuccess={fetchProducts} />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sales
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalSales}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KES {statistics.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Listings
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.activeListings}/{statistics.activeListings + statistics.soldItems}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rating
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.averageRating.toFixed(1)}/5.0
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Listings</TabsTrigger>
            <TabsTrigger value="sold">Sold Items</TabsTrigger>
            <TabsTrigger value="out_of_stock">Out of Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products
                .filter(product => product.status === 'active')
                .map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    isOwner={true}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteProduct}
                  />
                ))
              }
            </div>
          </TabsContent>

          <TabsContent value="sold" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products
                .filter(product => product.status === 'sold')
                .map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    isOwner={true}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteProduct}
                  />
                ))
              }
            </div>
          </TabsContent>

          <TabsContent value="out_of_stock" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products
                .filter(product => product.status === 'out_of_stock')
                .map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    isOwner={true}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteProduct}
                  />
                ))
              }
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default MyShop;