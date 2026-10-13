import React, { useEffect, useState } from 'react';
import {
  MapPin, MessageCircle, Package, Heart, ShoppingBag, ShoppingCart, Plus, Settings, Save, X, Store, Ticket, Wallet,
  QrCode, ScanLine, BarChart3, ChevronRight, CalendarDays, Link2, Check, Shield, Mail, Truck, Sparkles,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '../components/SupabaseClient';
import { ToastContainer, toast } from 'react-toastify';
import { productToasts, wishlistToasts } from '../utils/toastConfig';
import 'react-toastify/dist/ReactToastify.css';
import ProductCard from './ProductCard';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';
import OrderHistory from './OrderHistory';
import MessageCenter from './MessageCenter';
import { HIVE_SLUG } from './hive/hiveMedia';



const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';

function ProfileHeader({ profile, isSeller, hub, copied, onEdit, onCopyStore }) {
  const roles = [
    'Buyer',
    isSeller && 'Seller',
    hub.tickets > 0 && 'Attending',
    hub.partners.length > 0 && 'Partner',
    profile.is_staff && 'Staff',
    profile.is_admin && 'Admin',
  ].filter(Boolean);
  return (
    <section aria-label="Your profile" className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-card">
      <div className="h-24 sm:h-32 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(231,198,95,0.35),transparent_55%),linear-gradient(120deg,#0D2B20,#113b1e_55%,#1a1205)]" aria-hidden="true" />
      <div className="px-5 sm:px-8 pb-6 -mt-12 sm:-mt-14 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-card" />
        ) : (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-card bg-[#E7C65F] text-[#0D2B20] flex items-center justify-center font-serif text-3xl font-bold" aria-hidden="true">
            {initials(profile.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight truncate">{profile.full_name}</h1>
          <ul className="flex flex-wrap gap-1.5 mt-2" aria-label="Account roles">
            {roles.map((r) => (
              <li key={r} className="rounded-full border border-[#E7C65F]/50 bg-[#E7C65F]/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-foreground/80">{r}</li>
            ))}
          </ul>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-foreground/60">
            {profile.campus_location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" aria-hidden="true" />{profile.campus_location}</span>}
            <span>Member since {new Date(profile.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEdit} className="rounded-full">
            <Settings className="w-4 h-4 mr-1.5" aria-hidden="true" /> Edit profile
          </Button>
          {isSeller && (
            <Button variant="outline" size="icon" onClick={onCopyStore} className="rounded-full" aria-label={copied ? 'Store link copied' : 'Copy store link'} title="Copy store link">
              {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Link2 className="w-4 h-4" aria-hidden="true" />}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function HubGroup({ title, icon: Icon, children }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-foreground/60 mb-3">
        <Icon className="w-4 h-4 text-[#a8841f] dark:text-[#E7C65F]" aria-hidden="true" /> {title}
      </h3>
      <div className="grid grid-cols-2 gap-2.5">{children}</div>
    </div>
  );
}

function HubTile({ to, icon: Icon, label, hint, count, countLabel, alert }) {
  const showCount = typeof count === 'number';
  return (
    <Link
      to={to}
      aria-label={showCount ? `${label}: ${count}${countLabel ? ` ${countLabel}` : ''}` : label}
      className={`group relative flex flex-col justify-between min-h-[96px] rounded-2xl border p-3.5 transition-colors hover:bg-foreground/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${alert ? 'border-orange-500/60' : 'border-border'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon className="w-5 h-5 text-[#a8841f] dark:text-[#E7C65F] shrink-0" aria-hidden="true" />
        {showCount && (
          <span className={`text-xl font-bold tabular-nums leading-none ${alert ? 'text-orange-500' : ''}`} aria-hidden="true">{count}</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold leading-tight flex items-center gap-1">{label}<ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80 transition-opacity" aria-hidden="true" /></p>
        {hint && <p className="text-[11px] text-foreground/55 mt-0.5 leading-snug line-clamp-2">{hint}</p>}
      </div>
    </Link>
  );
}

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [userListings, setUserListings] = useState([]);
  const [userWishlist, setUserWishlist] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSeller, setIsSeller] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hub, setHub] = useState({ orders: 0, toFulfil: 0, tickets: 0, drinks: 0, partners: [] });
  const [copied, setCopied] = useState(false);
  const location = useLocation();

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    campus_location: '',
    phone: '',
    buzz: true
  });

  useEffect(() => {
    fetchUserData();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse URL query parameters to set the active tab
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    
    if (tabParam && ['messages', 'wishlist', 'orders', 'listings'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (profileData) {
      // Set default tab based on seller status
      setActiveTab(isSeller ? 'listings' : 'wishlist');
    }
  }, [location.search, isSeller, profileData]);

  // Load appropriate data when tab changes
  useEffect(() => {
    if (!activeTab) return;
    
    if (activeTab === 'listings' && isSeller) {
      fetchUserListings();
    } else if (activeTab === 'wishlist') {
      fetchUserWishlist();
    } else if (activeTab === 'orders') {
      fetchUserOrders();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to get profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);

      // Handle case where profile might not exist yet
      let profileInfo = null;
      
      if (error) {
        console.error('Error fetching profile:', error);
      } else if (profile && profile.length > 0) {
        // Use the first profile if multiple exist
        profileInfo = profile[0];
        setIsSeller(profileInfo.is_seller === true);
      } else {
        // No profile exists yet, create a default profile object
        profileInfo = {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          campus_location: user.user_metadata?.campus_location || 'Not specified',
          phone: '',
          created_at: new Date().toISOString(),
          is_seller: user.user_metadata?.is_seller || false
        };
        
        setIsSeller(profileInfo.is_seller === true);
        
        // Optionally create a profile in the database
        try {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([profileInfo]);
            
          if (insertError) console.error('Error creating profile:', insertError);
        } catch (insertErr) {
          console.error('Failed to create profile:', insertErr);
        }
      }

      // Counts for every part of the account: buying, selling, events, vending.
      const head = { count: 'exact', head: true };
      const [listingsCount, wishlistCount, ordersCount, fulfilCount, ticketsCount, drinksCount, memberships] = await Promise.all([
        supabase.from('products').select('id', head).eq('seller_id', user.id),
        supabase.from('wishlist').select('id', head).eq('user_id', user.id),
        supabase.from('orders').select('id', head).eq('user_id', user.id).eq('payment_status', 'completed'),
        supabase.from('order_items').select('id', head).eq('seller_id', user.id).in('status', ['pending', 'processing']),
        supabase.from('event_tickets').select('id', head).or(`user_id.eq.${user.id},hive_claimed_by.eq.${user.id}`).eq('payment_status', 'completed'),
        supabase.from('event_entitlements').select('id', head).eq('user_id', user.id).eq('status', 'unused'),
        supabase.from('event_partner_members').select('event_partners(name)').eq('user_id', user.id),
      ]);
      setHub({
        orders: ordersCount.count || 0,
        toFulfil: fulfilCount.count || 0,
        tickets: ticketsCount.count || 0,
        drinks: drinksCount.count || 0,
        partners: (memberships.data || []).map((m) => m.event_partners?.name).filter(Boolean),
      });

      setProfileData({
        ...profileInfo,
        email: user.email,
        listings: listingsCount.count || 0,
        wishlist: wishlistCount.count || 0
      });

      // Initialize edit form with current data
      setEditForm({
        full_name: profileInfo.full_name || '',
        campus_location: profileInfo.campus_location || '',
        phone: profileInfo.phone || '',
        buzz: !profileInfo.marketing_opt_out
      });
    } catch (error) {
      console.error('Error in profile data flow:', error);
      productToasts.loadError();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserListings = async () => {
    try {
      console.log('Fetching user listings...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Listings data:', data);
      setUserListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      productToasts.loadError();
    }
  };

  const fetchUserWishlist = async () => {
    try {
      console.log('Fetching wishlist items...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      console.log('Wishlist data:', data);
      setUserWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      wishlistToasts.error();
    }
  };

  const fetchUserOrders = async () => {
    try {
      console.log('Fetching orders...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query the ORDERS table, not the cart table
      // Use !fk_order_items_order_id to specify which foreign key to avoid ambiguity
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items!fk_order_items_order_id (
            *,
            products (*),
            profiles:seller_id (*)
          )
        `)
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      console.log('Orders data:', ordersData);
      setUserOrders(ordersData || []);

    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleEditProfile = () => {
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Validate input
      if (!editForm.full_name.trim()) {
        toast.error('Name cannot be empty');
        return;
      }

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          campus_location: editForm.campus_location.trim(),
          phone: editForm.phone.trim(),
          // Only once the column exists (migration 20261022).
          ...(profileData && 'marketing_opt_out' in profileData ? { marketing_opt_out: !editForm.buzz } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfileData(prev => ({
        ...prev,
        full_name: editForm.full_name.trim(),
        campus_location: editForm.campus_location.trim(),
        phone: editForm.phone.trim()
      }));

      toast.success('Profile updated successfully!');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={`max-w-6xl mx-auto px-4 py-8 ${isMobile ? 'mt-12 mb-16' : ''}`}>
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

  if (!profileData) {
    return (
      <>
        <Navbar />
        <div className={`max-w-6xl mx-auto px-4 py-8 ${isMobile ? 'mt-12 mb-16' : ''}`}>
          <p className="text-center text-gray-600">
            Profile not found. Please sign in again or contact support.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className={`max-w-6xl mx-auto px-4 pt-20 md:pt-24 pb-10 ${isMobile ? 'mb-16' : ''}`}>
        <ToastContainer />
        
        {/* Edit Profile Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your profile information below
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={editForm.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="campus_location">{isSeller ? 'Shop location' : 'Location'}</Label>
                <Input
                  id="campus_location"
                  name="campus_location"
                  value={editForm.campus_location}
                  onChange={handleInputChange}
                  placeholder="e.g., Westlands, Nairobi"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleInputChange}
                  placeholder="e.g., +254 700 000000"
                />
              </div>

              {'marketing_opt_out' in profileData && (
                <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm cursor-pointer">
                  <input type="checkbox" checked={editForm.buzz} onChange={(e) => setEditForm((f) => ({ ...f, buzz: e.target.checked }))} className="mt-0.5 h-4 w-4" />
                  <span><strong>The Buzz</strong> — the occasional UniHive email: events, new shops and what’s worth knowing. Order and account emails always come through.</span>
                </label>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProfileHeader
          profile={profileData}
          isSeller={isSeller}
          hub={hub}
          copied={copied}
          onEdit={handleEditProfile}
          onCopyStore={async () => {
            try { await navigator.clipboard.writeText(`${window.location.origin}/seller/${profileData.id}`); } catch { /* blocked */ }
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        />

        <section aria-labelledby="hub-title" className="mb-10">
          <h2 id="hub-title" className="sr-only">Your UniHive</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <HubGroup title="Buying" icon={ShoppingBag}>
              <HubTile to="/my-orders" icon={Truck} label="My orders" hint="Track, confirm delivery" count={hub.orders} />
              <HubTile to="/profile?tab=wishlist" icon={Heart} label="Wishlist" count={profileData.wishlist} />
              <HubTile to="/cart" icon={ShoppingCart} label="Cart" hint="Checkout with M-Pesa" />
              <HubTile to="/profile?tab=messages" icon={MessageCircle} label="Messages" hint="Chat with sellers" />
            </HubGroup>

            {isSeller ? (
              <HubGroup title="Selling" icon={Store}>
                <HubTile to="/myshop?tab=orders" icon={Package} label="Orders to fulfil" hint="Pending & processing" count={hub.toFulfil} alert={hub.toFulfil > 0} />
                <HubTile to="/myshop" icon={Store} label="My shop" hint="Banner, products, earnings" />
                <HubTile to="/myshop?new=1" icon={Plus} label="New listing" hint="Add a product" />
                <HubTile to={`/seller/${profileData.id}`} icon={BarChart3} label="Public storefront" hint="See what buyers see" count={profileData.listings} />
              </HubGroup>
            ) : (
              <HubGroup title="Selling" icon={Store}>
                <div className="col-span-2 rounded-2xl border border-dashed border-border p-5">
                  <p className="font-semibold">Open your shop</p>
                  <p className="text-sm text-foreground/60 mt-1">Sell to the Hive in minutes. You’re paid once the buyer confirms delivery.</p>
                  <Link to="/myshop" className="inline-flex items-center gap-1 mt-4 rounded-full bg-[#E7C65F] text-[#0D2B20] px-5 py-2.5 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2">
                    Start selling <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </HubGroup>
            )}

            <HubGroup title="Events" icon={CalendarDays}>
              <HubTile to="/my-tickets" icon={Ticket} label="My tickets" hint="Entry QR codes" count={hub.tickets} />
              <HubTile to={`/events/${HIVE_SLUG}/wallet`} icon={Wallet} label="HIVE wallet" hint="Credit, drinks & QR codes" count={hub.drinks} countLabel="to collect" />
              <HubTile to={`/claim/${HIVE_SLUG}`} icon={QrCode} label="Claim a Little ticket" hint="Unlock wallet & perks" />
              <HubTile to="/services" icon={CalendarDays} label="The Buzz" hint="Events & experiences" />
            </HubGroup>

            {(hub.partners.length > 0 || profileData.is_staff || profileData.is_admin) && (
              <HubGroup title="Vending & staff" icon={ScanLine}>
                {(hub.partners.length > 0 || profileData.is_admin) && (
                  <HubTile to="/partner" icon={BarChart3} label="Partner dashboard" hint={profileData.is_admin ? 'All brands · live sales' : hub.partners.join(' · ')} />
                )}
                <HubTile to="/staff/scanner" icon={ScanLine} label="Scanner" hint="Entry & redemptions" />
                <HubTile to="/staff/redeem" icon={QrCode} label="Redeem" hint="Serve drinks & items" />
              </HubGroup>
            )}

            {profileData.is_admin && (
              <HubGroup title="Admin" icon={Shield}>
                <HubTile to="/admin/buzz" icon={Sparkles} label="The Buzz emails" hint="Agent drafts · you approve" />
                <HubTile to="/admin/broadcast" icon={Mail} label="Email shop owners" />
                <HubTile to="/admin/events/import-tickets" icon={Ticket} label="Import Little tickets" />
                <HubTile to="/admin/services" icon={Settings} label="Services" />
                <HubTile to="/admin/codes" icon={Shield} label="Wholesaler codes" />
              </HubGroup>
            )}
          </div>
        </section>

        {/* Different tabs based on seller status */}
        <Tabs 
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-6"
        >
          <TabsList className={`grid w-full max-w-md mx-auto ${isSeller ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {isSeller && (
              <TabsTrigger value="listings">
                <Package className="w-4 h-4 mr-2" aria-hidden="true" />
                <span className={isMobile ? "text-xs" : ""}>Listings</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="wishlist">
              <Heart className="w-4 h-4 mr-2" />
              <span className={isMobile ? "text-xs" : ""}>Wishlist</span>
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="w-4 h-4 mr-2" />
              <span className={isMobile ? "text-xs" : ""}>Orders</span>
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageCircle className="w-4 h-4 mr-2" />
              <span className={isMobile ? "text-xs" : ""}>Messages</span>
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab (Sellers only) */}
          {isSeller && (
            <TabsContent value="listings" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">My Listings</h2>
                <Link to="/myshop?new=1">
                  <Button size={isMobile ? "sm" : "default"}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Listing
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {userListings.length > 0 ? (
                  userListings.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="mb-4">You haven't posted any listings yet</p>
                    <Link to="/myshop?new=1">
                      <Button variant="outline" size={isMobile ? "sm" : "default"}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Listing
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          
          {/* Wishlist Tab (Both sellers and buyers) */}
          <TabsContent value="wishlist" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">My Wishlist</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {userWishlist.length > 0 ? (
                userWishlist.map(item => (
                  <ProductCard key={item.product_id} product={item.products} />
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="mb-4">You haven't added any items to your wishlist yet</p>
                  <Link to="/studentmarketplace">
                    <Button variant="outline" size={isMobile ? "sm" : "default"}>
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Browse Products
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">My Messages</h2>
            <MessageCenter />
          </TabsContent>
          
          {/* Orders Tab (Both sellers and buyers) */}
          <TabsContent value="orders" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">My Orders</h2>
            <OrderHistory />
          </TabsContent>
          
        </Tabs>

        <footer className="mt-12 pt-6 border-t border-border flex flex-wrap gap-3 justify-center text-sm">
          <Link to="/terms" className="text-foreground/60 hover:text-foreground hover:underline">Terms & Conditions</Link>
          <span className="text-foreground/30" aria-hidden="true">•</span>
          <Link to="/privacy" className="text-foreground/60 hover:text-foreground hover:underline">Privacy Policy</Link>
        </footer>
      </main>
    </>
  );
};

export default Profile;