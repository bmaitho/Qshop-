// src/components/MyShop.jsx
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
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
  Clock,
  Book // Added for ToS icon
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
import TosModal from './TosModal'; // Import the TosModal component
import TosBanner from './TosBanner'; // Import the TosBanner component

// Lazy load the SellerOrders component
const SellerOrders = React.lazy(() => import('./SellerOrders'));

// Function to determine if a string is a UUID
const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

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
  const [statsLoading, setStatsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('listings');
  const [productToEdit, setProductToEdit] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showShopSettings, setShowShopSettings] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [categoriesMap, setCategoriesMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  
  // Add state for ToS modal
  const [tosModalOpen, setTosModalOpen] = useState(false);
  
  // Path to your ToS image - update this with your actual image path
  const tosImageUrl = "/src/assets/tos-image.jpg";

  // Define all the callbacks first, then use them in useEffect

  // Get a properly formatted category display name
  const getCategoryDisplayName = useCallback((categoryValue) => {
    // If it's a UUID, look up in the categoriesMap
    if (isUUID(categoryValue)) {
      return categoriesMap[categoryValue] || "Other";
    }
    // If it's a string name, capitalize first letter
    if (typeof categoryValue === 'string') {
      return categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1);
    }
    // Default fallback
    return "Other";
  }, [categoriesMap]);

  // Process products with categories
  const processProducts = useCallback((productsData) => {
    return (productsData || []).map(product => {
      const displayCategory = getCategoryDisplayName(product.category);
      
      return {
        ...product,
        display_category: displayCategory
      };
    });
  }, [getCategoryDisplayName]);

  // Fetch categories - optimize and avoid redundant fetches
  const fetchCategories = useCallback(async () => {
    try {
      // Use caching to avoid repeated calls
      if (Object.keys(categoriesMap).length > 0) return;
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id,name')
        .eq('status', 'approved');

      if (categoriesError) throw categoriesError;
      
      // Create a mapping of category IDs to names
      const mapping = {};
      if (categoriesData) {
        categoriesData.forEach(cat => {
          mapping[cat.id] = cat.name;
        });
      }
      setCategoriesMap(mapping);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [categoriesMap]);

  // Fetch shop data
  const fetchShopData = useCallback(async (userId) => {
    try {
      if (!userId) return;

      const { data: shop, error } = await supabase
        .from('shops')
        .select('id,shop_name,description,banner_url,offers_delivery,business_hours,policies')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setShopData(shop);
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async (userId) => {
    try {
      if (!userId) return;
      setProductsLoading(true);
  
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          original_price,
          image_url,
          condition,
          category,
          status,
          description,
          seller_id,
          created_at,
          location
        `)
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const processedProducts = processProducts(data);
      setProducts(processedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      shopToasts.loadError();
    } finally {
      setProductsLoading(false);
    }
  }, [processProducts]);

  // Fetch statistics
  const fetchStatistics = useCallback(async (userId) => {
    try {
      if (!userId) return;
      setStatsLoading(true);
      
      // Execute these queries in parallel for better performance
      const [orderStats, productStats] = await Promise.all([
        supabase
          .from('order_items')
          .select('id,subtotal,status')
          .eq('seller_id', userId),
          
        supabase
          .from('products')
          .select('id,status')
          .eq('seller_id', userId)
      ]);
      
      if (orderStats.error) {
        console.error("Error fetching order data:", orderStats.error);
        throw orderStats.error;
      }
      
      if (productStats.error) {
        console.error("Error fetching product stats:", productStats.error);
        throw productStats.error;
      }

      // Calculate statistics from order_items
      const pendingOrders = (orderStats.data || []).filter(order => order.status === 'processing').length;
      const totalSales = (orderStats.data || []).length;
      const totalRevenue = (orderStats.data || []).reduce(
        (sum, order) => sum + (order.subtotal || 0), 0
      );
      
      // Calculate product statistics
      const activeListings = (productStats.data || []).filter(p => p.status === 'active').length;
      const soldItems = (productStats.data || []).filter(p => p.status === 'sold').length;
  
      // Update state with real statistics
      setStatistics({
        totalSales,
        totalRevenue,
        activeListings,
        soldItems,
        averageRating: 4.5, // Placeholder
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
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Call resize handler once to set initial state
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Fetch current user only once
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        return user;
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    };
    
    fetchCurrentUser().then(user => {
      if (user) {
        // Load data in parallel for better performance
        fetchShopData(user.id);
        fetchCategories().then(() => fetchProducts(user.id));
        fetchStatistics(user.id);
      } else {
        setLoading(false);
        setProductsLoading(false);
        setStatsLoading(false);
      }
    });
    
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchShopData, fetchCategories, fetchProducts, fetchStatistics]);

  // Handle product status change
  const handleStatusChange = async (productId, newStatus) => {
    try {
      // Get the current product to properly update stats
      const currentProduct = products.find(p => p.id === productId);
      if (!currentProduct) return;
      
      const currentStatus = currentProduct.status;
      
      // Optimistically update UI immediately for better UX
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, status: newStatus } 
            : product
        )
      );
      
      // Update statistics without full refetch
      if (currentStatus !== newStatus) {
        if (newStatus === 'active') {
          setStatistics(prev => ({
            ...prev,
            activeListings: prev.activeListings + 1,
            soldItems: currentStatus === 'sold' ? prev.soldItems - 1 : prev.soldItems
          }));
        } else if (newStatus === 'sold') {
          setStatistics(prev => ({
            ...prev,
            activeListings: currentStatus === 'active' ? prev.activeListings - 1 : prev.activeListings,
            soldItems: prev.soldItems + 1
          }));
        } else if (currentStatus === 'active') {
          // Product going from active to something other than sold
          setStatistics(prev => ({
            ...prev,
            activeListings: prev.activeListings - 1
          }));
        } else if (currentStatus === 'sold') {
          // Product going from sold to something other than active
          setStatistics(prev => ({
            ...prev,
            soldItems: prev.soldItems - 1
          }));
        }
      }
      
      // Then do the actual API call
      const { error } = await supabase
        .from('products')
        .update({ 
          status: newStatus,
          ...(newStatus === 'sold' ? { sold_at: new Date().toISOString() } : {})
        })
        .eq('id', productId);

      if (error) {
        throw error;
      }
      
      shopToasts.statusUpdateSuccess(newStatus);
      
    } catch (error) {
      console.error('Error updating product status:', error);
      shopToasts.statusUpdateError();
      
      // Revert UI changes if API call fails
      fetchProducts(currentUser?.id);
    }
  };

  // Handle product deletion with optimistic UI update
  const handleDeleteProduct = async (productId) => {
    try {
      // Get the product before removal to handle stats correctly
      const deletedProduct = products.find(p => p.id === productId);
      
      // Optimistically update UI first
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      
      // Update statistics optimistically
      if (deletedProduct) {
        setStatistics(prev => ({
          ...prev,
          activeListings: prev.activeListings - (deletedProduct.status === 'active' ? 1 : 0),
          soldItems: prev.soldItems - (deletedProduct.status === 'sold' ? 1 : 0)
        }));
      }
      
      // Then perform the actual delete operation
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Supabase delete error:', error);
        // If there's an error, revert the optimistic update
        fetchProducts(currentUser?.id);
        fetchStatistics(currentUser?.id);
        throw error;
      }
      
      shopToasts.deleteProductSuccess();
    } catch (error) {
      console.error('Error in handleDeleteProduct:', error);
      shopToasts.deleteProductError();
    }
  };

  // Handle product edit
  const handleEditProduct = (product) => {
    setProductToEdit(product);
    setShowEditProduct(true);
  };

  // Handle shop update
  const handleShopUpdate = () => {
    fetchShopData(currentUser?.id);
    setShowShopSettings(false);
  };

  // Handle product update
  const handleProductUpdate = () => {
    fetchProducts(currentUser?.id);
    fetchStatistics(currentUser?.id);
    setShowEditProduct(false);
    setProductToEdit(null);
  };

  // Handle add new product
  const handleAddNewProduct = () => {
    fetchProducts(currentUser?.id);
    fetchStatistics(currentUser?.id);
    setShowAddProduct(false);
  };
  
  // Get shop name
  const getShopName = useMemo(() => {
    if (shopData?.shop_name) return shopData.shop_name;
    return "My Shop";
  }, [shopData]);

  // Optional: Auto-show ToS for first-time sellers
  useEffect(() => {
    // Check if this is the first time the user is visiting the shop page
    const hasSeenToS = localStorage.getItem('hasSeenToS') === 'true';
    
    if (!hasSeenToS && !loading && shopData) {
      // Wait a short delay to avoid showing modal immediately on page load
      const timer = setTimeout(() => {
        setTosModalOpen(true);
        localStorage.setItem('hasSeenToS', 'true');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [shopData, loading]);

  // Statistics loading placeholder
  const StatisticsPlaceholder = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 w-1/2 rounded"></div>
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 w-1/4 rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Memoize the product grid
  const productGrid = useMemo(() => {
    if (productsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 h-64 rounded animate-pulse"></div>
          ))}
        </div>
      );
    }
    
    if (products.length === 0) {
      return (
        <div className="col-span-full text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="mb-4">You haven't posted any listings yet</p>
          <Button onClick={() => setShowAddProduct(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Listing
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {products.map(product => (
          <ProductCard 
            key={product.id} 
            product={product}
            isOwner={true}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteProduct}
            onEdit={() => handleEditProduct(product)}
          />
        ))}
      </div>
    );
  }, [products, productsLoading]);

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 mt-12 mb-16">
        {/* ToS Banner - notification for first-time sellers */}
        <TosBanner onViewToS={() => setTosModalOpen(true)} />
        
        {/* Shop Banner - only render if exists */}
        {shopData?.banner_url && (
          <div className="w-full h-32 md:h-48 lg:h-64 rounded-lg overflow-hidden mb-6">
            <img 
              src={shopData.banner_url} 
              alt={`${getShopName} banner`}
              className="w-full h-full object-cover"
              loading="lazy"
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
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-2`}>{getShopName}</h1>
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
                    <Button size="sm" className="flex-1 add-product-button mr-2">
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
                
                {/* ToS Button for Mobile */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTosModalOpen(true)}
                  className="tos-button"
                >
                  <Book className="w-4 h-4 mr-1" />
                  ToS
                </Button>
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
                
                {/* ToS Button for Desktop */}
                <Button 
                  variant="outline" 
                  onClick={() => setTosModalOpen(true)}
                  className="tos-button"
                >
                  <Book className="w-4 h-4 mr-2" />
                  Terms of Service
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Statistics Cards - Mobile Responsive with loading state */}
        {statsLoading ? (
          <StatisticsPlaceholder />
        ) : (
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
        )}
        
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

          {/* Listings Tab - Memoized content */}
          <TabsContent value="listings" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Listings</h2>
            </div>
            
            {/* Use memoized product grid */}
            {productGrid}
          </TabsContent>
          
          {/* Orders Tab - Lazy loaded */}
          <TabsContent value="orders" className="mt-6">
            <Suspense fallback={
              <div className="text-center py-10">
                <div className="animate-spin w-8 h-8 border-2 border-primary rounded-full border-t-transparent mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading orders...</p>
              </div>
            }>
              {activeTab === 'orders' && <SellerOrders />}
            </Suspense>
          </TabsContent>
        </Tabs>
        
        {/* Edit Product Sheet */}
        {showEditProduct && (
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
        )}
        
        {/* ToS Modal */}
        <TosModal 
          isOpen={tosModalOpen} 
          onClose={() => setTosModalOpen(false)} 
        />
      </div>
    </>
  );
};

export default React.memo(MyShop);