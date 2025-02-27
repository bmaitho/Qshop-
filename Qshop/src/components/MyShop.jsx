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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    fetchShopData();
    fetchProducts();
    fetchStatistics();
    
    return () => window.removeEventListener('resize', handleResize);
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
    console.log('Delete function triggered for product ID:', productId);
    
    try {
      console.log('Sending delete request to Supabase');
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      console.log('Product successfully deleted, refreshing data');
      fetchProducts();
      fetchStatistics();
      shopToasts.deleteProductSuccess();
    } catch (error) {
      console.error('Error in handleDeleteProduct:', error);
      shopToasts.deleteProductError();
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4 mt-12">
          <div className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
      <div className="max-w-7xl mx-auto p-4 mt-12 mb-16">
        {/* Shop Header - Mobile Responsive */}
        <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between items-center'} mb-4`}>
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
              {shopData?.shop_name || "My Shop"}
            </h1>
            <p className="text-gray-600 text-sm line-clamp-2">
              {shopData?.description || "No description available"}
            </p>
          </div>
          
          <div className={`flex ${isMobile ? 'w-full' : 'gap-2'}`}>
            {isMobile ? (
              <>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 mr-2">
                      <Settings className="w-4 h-4 mr-1" />
                      Settings
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Shop Settings</SheetTitle>
                      <SheetDescription>
                        Update your shop information
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
                    <Button size="sm" className="flex-1">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
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
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Statistics - Mobile Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
              <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                Total Sales
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
                {statistics.totalSales}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
              <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
                KES {isMobile 
                  ? (statistics.totalRevenue > 9999 
                    ? `${(statistics.totalRevenue / 1000).toFixed(1)}K` 
                    : statistics.totalRevenue.toLocaleString())
                  : statistics.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
              <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                Active Listings
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
                {statistics.activeListings}/{statistics.activeListings + statistics.soldItems}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
              <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                Rating
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
                {statistics.averageRating.toFixed(1)}/5.0
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid - Mobile Responsive */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="w-full md:w-auto mb-1 grid grid-cols-3">
            <TabsTrigger value="active" className="text-xs md:text-sm">Active</TabsTrigger>
            <TabsTrigger value="sold" className="text-xs md:text-sm">Sold</TabsTrigger>
            <TabsTrigger value="out_of_stock" className="text-xs md:text-sm">Out of Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {products.filter(product => product.status === 'active').length === 0 ? (
              <div className="bg-gray-50 text-center p-6 rounded-lg">
                <Package className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <h3 className="font-medium text-gray-700 mb-1">No active listings</h3>
                <p className="text-gray-500 text-sm mb-4">Add your first product to start selling</p>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size={isMobile ? "sm" : "default"}>
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
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
            )}
          </TabsContent>

          <TabsContent value="sold" className="space-y-4">
            {products.filter(product => product.status === 'sold').length === 0 ? (
              <div className="bg-gray-50 text-center p-6 rounded-lg">
                <ShoppingBag className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <h3 className="font-medium text-gray-700 mb-1">No sold items yet</h3>
                <p className="text-gray-500 text-sm">Keep promoting your products to make sales</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
            )}
          </TabsContent>

          <TabsContent value="out_of_stock" className="space-y-4">
            {products.filter(product => product.status === 'out_of_stock').length === 0 ? (
              <div className="bg-gray-50 text-center p-6 rounded-lg">
                <Package className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <h3 className="font-medium text-gray-700 mb-1">No out of stock items</h3>
                <p className="text-gray-500 text-sm">Keep your inventory updated</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default MyShop;