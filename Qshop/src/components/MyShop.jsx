import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Settings, 
  Package, 
  Star, 
  DollarSign, 
  ShoppingBag, 
  Edit, 
  Pencil,
  Clock
} from 'lucide-react';
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
  SheetClose,
} from "@/components/ui/sheet";
import { supabase } from '../components/SupabaseClient';
import { shopToasts } from '../utils/toastConfig';
import ProductCard from './ProductCard';
import Navbar from './Navbar';
import AddProductForm from './AddProductForm';
import ShopSettingsForm from './ShopSettingsForm';
import EditProductForm from './EditProductForm';
import SellerOrders from './SellerOrders'; // Import the SellerOrders component

const MyShop = () => {
  const [shopData, setShopData] = useState(null);
  const [products, setProducts] = useState([]);
  const [statistics, setStatistics] = useState({
    totalSales: 0,
    totalRevenue: 0,
    activeListings: 0,
    soldItems: 0,
    averageRating: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSeller, setIsSeller] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [productToEdit, setProductToEdit] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showShopSettings, setShowShopSettings] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);

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

  // Set the initial activeTab after determining seller status
  useEffect(() => {
    if (shopData) {
      // Default to listings tab
      setActiveTab('listings');
    }
  }, [shopData]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      console.log("Fetching statistics for user:", user.id);
      
      // Get order statistics (replace with your order_items table)
      const { data: orderData, error: orderError } = await supabase
        .from('order_items')
        .select(`
          id,
          subtotal,
          status
        `)
        .eq('seller_id', user.id);
      
      if (orderError) {
        console.error("Error fetching order data:", orderError);
        throw orderError;
      }
      
      console.log("Order data fetched:", orderData);
      
      // Get product statistics
      const { data: productStats, error: productError } = await supabase
        .from('products')
        .select('id, status')
        .eq('seller_id', user.id);
  
      if (productError) {
        console.error("Error fetching product stats:", productError);
        throw productError;
      }
      
      console.log("Product stats fetched:", productStats);
  
      // Calculate statistics from order_items
      const pendingOrders = orderData?.filter(order => order.status === 'processing').length || 0;
      const totalSales = orderData?.length || 0;
      const totalRevenue = orderData?.reduce((sum, order) => sum + (order.subtotal || 0), 0) || 0;
      
      // Calculate product statistics
      const activeListings = productStats?.filter(p => p.status === 'active').length || 0;
      const soldItems = productStats?.filter(p => p.status === 'sold').length || 0;
  
      // Update state with real statistics
      setStatistics({
        totalSales,
        totalRevenue,
        activeListings,
        soldItems,
        averageRating: 4.5, // Placeholder until you implement ratings
        pendingOrders
      });
      
      console.log("Statistics calculated:", {
        totalSales,
        totalRevenue,
        activeListings,
        soldItems,
        pendingOrders
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Set default values so the UI doesn't break
      setStatistics({
        totalSales: 0,
        totalRevenue: 0,
        activeListings: 0,
        soldItems: 0,
        averageRating: 0,
        pendingOrders: 0
      });
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
      // Optimistically update UI first
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      
      // Then perform the actual delete operation
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Supabase delete error:', error);
        // If there's an error, revert the optimistic update by fetching products again
        fetchProducts();
        throw error;
      }
      
      // Only fetch statistics as products are already updated optimistically
      fetchStatistics();
      shopToasts.deleteProductSuccess();
    } catch (error) {
      console.error('Error in handleDeleteProduct:', error);
      shopToasts.deleteProductError();
    }
  };

  const handleEditProduct = (product) => {
    setProductToEdit(product);
    setShowEditProduct(true);
  };

  const handleShopUpdate = () => {
    fetchShopData();
    setShowShopSettings(false);
  };

  const handleProductUpdate = () => {
    fetchProducts();
    fetchStatistics();
    setShowEditProduct(false);
    setProductToEdit(null);
  };

  const handleAddNewProduct = () => {
    fetchProducts();
    fetchStatistics();
    setShowAddProduct(false);
  };
  
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 mt-12">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-32 rounded-lg mb-8"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Get shop name - use profile email as fallback
  const getShopName = () => {
    if (shopData?.shop_name) return shopData.shop_name;
    return "My Shop";
  };

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 mt-12 mb-16">
        {/* Shop Banner */}
        {shopData?.banner_url && (
          <div className="w-full h-32 md:h-48 lg:h-64 rounded-lg overflow-hidden mb-6">
            <img 
              src={shopData.banner_url} 
              alt={`${getShopName()} banner`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/api/placeholder/1200/400";
              }}
            />
          </div>
        )}
        
        {/* Shop Header - Mobile Responsive */}
        <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between items-center'} mb-4`}>
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-2`}>{getShopName()}</h1>
            <div className={`flex items-center gap-6 mb-4`}>
              <div className="text-center">
                <div className="font-bold">{statistics.activeListings}</div>
                <div className="text-sm text-gray-600">Listings</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{statistics.pendingOrders}</div>
                <div className="text-sm text-gray-600">Pending Orders</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">
                  Seller
                </div>
                <div className="text-sm text-gray-600">Account Type</div>
              </div>
            </div>
          </div>
          
          <div className={`flex ${isMobile ? 'w-full' : 'gap-2'}`}>
            {isMobile ? (
              <>
                <Sheet open={showShopSettings} onOpenChange={setShowShopSettings}>
                  <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 mr-2 customize-shop-button">
  <Settings className="w-4 h-4 mr-1" /> Edit Shop
</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Shop Settings</SheetTitle>
                      <SheetDescription>
                        Customize your shop information
                      </SheetDescription>
                    </SheetHeader>
                    <ShopSettingsForm 
                      shopData={shopData} 
                      onUpdate={handleShopUpdate} 
                    />
                  </SheetContent>
                </Sheet>
                
                <Sheet open={showAddProduct} onOpenChange={setShowAddProduct}>
                  <SheetTrigger asChild>
                    <Button size="sm" className="flex-1 add-product-button">
                      <Plus className="w-4 h-4 mr-1" />
                      New Listing
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Add New Product</SheetTitle>
                      <SheetDescription>
                        Add a new product to your shop
                      </SheetDescription>
                    </SheetHeader>
                    <AddProductForm onSuccess={handleAddNewProduct} />
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <Sheet open={showShopSettings} onOpenChange={setShowShopSettings}>
                  <SheetTrigger asChild>
                  <Button variant="outline" className="customize-shop-button">
  <Settings className="w-4 h-4 mr-2" />
  Customize Shop
</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Shop Settings</SheetTitle>
                      <SheetDescription>
                        Customize your shop information
                      </SheetDescription>
                    </SheetHeader>
                    <ShopSettingsForm 
                      shopData={shopData} 
                      onUpdate={handleShopUpdate} 
                    />
                  </SheetContent>
                </Sheet>
                
                <Sheet open={showAddProduct} onOpenChange={setShowAddProduct}>
                  <SheetTrigger asChild>
                    <Button className="add-product-button">
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
                    <AddProductForm onSuccess={handleAddNewProduct} />
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>

        {/* Statistics Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
         <Card className="shadow-sm">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
             <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
               Active Listings
             </CardTitle>
             <Package className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent className="p-3 pt-0">
             <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
               {statistics.activeListings || 0}
             </div>
           </CardContent>
         </Card>
         
         <Card className="shadow-sm">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
             <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
               Total Sales
             </CardTitle>
             <ShoppingBag className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent className="p-3 pt-0">
             <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
               {statistics.totalSales || 0}
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
               KES {(statistics.totalRevenue || 0).toLocaleString()}
             </div>
           </CardContent>
         </Card>
         
         <Card className="shadow-sm">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
             <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
               Pending Orders
             </CardTitle>
             <Clock className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent className="p-3 pt-0">
             <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${(statistics.pendingOrders || 0) > 0 ? 'text-orange-600' : ''}`}>
               {statistics.pendingOrders || 0}
             </div>
           </CardContent>
         </Card>
       </div>
        {/* Main Tabs */}
        <Tabs 
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-6"
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="listings">
              <Package className="w-4 h-4 mr-2" />
              <span className={isMobile ? "text-xs" : ""}>Products</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="orders-tab">
              <ShoppingBag className="w-4 h-4 mr-2" />
              <span className={isMobile ? "text-xs" : ""}>Orders</span>
              {statistics.pendingOrders > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {statistics.pendingOrders}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Listings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {products.length > 0 ? (
                products.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    isOwner={true}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteProduct}
                    onEdit={() => handleEditProduct(product)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="mb-4">You haven't posted any listings yet</p>
                  <Button onClick={() => setShowAddProduct(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Listing
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            
            
            {/* Integrate the SellerOrders component */}
            <SellerOrders />
          </TabsContent>
        </Tabs>
        
        {/* Edit Product Sheet */}
        <Sheet open={showEditProduct} onOpenChange={setShowEditProduct}>
          <SheetContent>
            {productToEdit && (
              <EditProductForm 
                product={productToEdit} 
                onSuccess={handleProductUpdate}
                onCancel={() => setShowEditProduct(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default MyShop;