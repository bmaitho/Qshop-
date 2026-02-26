// ProductGrid.jsx — Recency-biased feed, per-shop cap, Load More pagination, responsive grid
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ProductCard from './ProductCard';
import { supabase } from '../components/SupabaseClient';
import { Loader, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";

// ── Helpers ──────────────────────────────────────────────────────────────────

const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

/**
 * Fisher-Yates shuffle (returns new array)
 */
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Build a fresh, fair feed:
 *
 * 1. Group products by seller
 * 2. Sort each seller's products newest-first
 * 3. Take at most `maxPerShop` from each seller (their newest)
 * 4. Group the surviving products into time bands (today, this week, older)
 * 5. Shuffle within each band so it's not a rigid list
 * 6. Concatenate bands: today → this week → older
 *
 * Result: newest stuff on top, variety from different sellers, slight
 * randomness so it feels alive on every visit.
 */
const buildFreshFeed = (products, maxPerShop = 3) => {
  // ── Step 1-3: Per-shop cap (keep newest per seller) ────────────────────
  const sellerBuckets = {};
  products.forEach((p) => {
    const sid = p.seller_id || 'unknown';
    if (!sellerBuckets[sid]) sellerBuckets[sid] = [];
    sellerBuckets[sid].push(p);
  });

  let capped = [];
  Object.values(sellerBuckets).forEach((bucket) => {
    // Sort each seller's products newest first
    const sorted = [...bucket].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    // Take only the newest maxPerShop
    capped.push(...sorted.slice(0, maxPerShop));
  });

  // ── Step 4-6: Time-band grouping + shuffle within bands ────────────────
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const bands = { today: [], thisWeek: [], older: [] };

  capped.forEach((p) => {
    const created = new Date(p.created_at);
    if (created >= todayStart) {
      bands.today.push(p);
    } else if (created >= weekAgo) {
      bands.thisWeek.push(p);
    } else {
      bands.older.push(p);
    }
  });

  // Shuffle within each band for variety
  return [
    ...shuffleArray(bands.today),
    ...shuffleArray(bands.thisWeek),
    ...shuffleArray(bands.older),
  ];
};

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 16;       // Products per page
const MAX_PER_SHOP = 3;     // Per-seller cap in the visible feed

// ── Component ────────────────────────────────────────────────────────────────

const ProductGrid = ({ category, searchQuery, categoriesMap = {} }) => {
  const [allProducts, setAllProducts] = useState([]);        // Raw from DB
  const [displayProducts, setDisplayProducts] = useState([]); // Feed-sorted
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (
            id,
            full_name,
            campus_location
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Category filter
      if (category) {
        if (isUUID(category)) {
          query = query.eq('category', category);
        } else {
          const lowercaseCategory = category.toLowerCase();
          const matchingCategoryIds = Object.entries(categoriesMap)
            .filter(([, name]) => name.toLowerCase() === lowercaseCategory)
            .map(([id]) => id);

          if (matchingCategoryIds.length > 0) {
            query = query.in('category', [...matchingCategoryIds, category]);
          } else {
            query = query.eq('category', category);
          }
        }
      }

      // Search filter
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Process categories for display
      const processed = (data || []).map((product) => {
        let displayCategory = product.category;
        if (isUUID(product.category) && categoriesMap[product.category]) {
          displayCategory = categoriesMap[product.category];
        } else if (typeof product.category === 'string') {
          displayCategory = product.category.charAt(0).toUpperCase() + product.category.slice(1);
        }
        return { ...product, display_category: displayCategory };
      });

      setAllProducts(processed);

      // Build the recency-biased, per-shop-capped feed
      const feed = buildFreshFeed(processed, MAX_PER_SHOP);
      setDisplayProducts(feed);
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [category, searchQuery, categoriesMap]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Reshuffle (re-rolls the within-band randomness) ──────────────────────

  const handleReshuffle = useCallback(() => {
    const feed = buildFreshFeed(allProducts, MAX_PER_SHOP);
    setDisplayProducts(feed);
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [allProducts]);

  // ── Pagination ───────────────────────────────────────────────────────────

  const visibleProducts = useMemo(
    () => displayProducts.slice(0, visibleCount),
    [displayProducts, visibleCount]
  );

  const hasMore = visibleCount < displayProducts.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, displayProducts.length));
  };

  // ── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg overflow-hidden">
            <div className="bg-primary/5 dark:bg-gray-700 aspect-[4/3]" />
            <div className="space-y-2 p-3 bg-white dark:bg-gray-800 border border-primary/10 dark:border-gray-700">
              <div className="h-3 bg-primary/5 dark:bg-gray-600 rounded w-3/4" />
              <div className="h-3 bg-primary/5 dark:bg-gray-600 rounded w-1/2" />
              <div className="h-6 bg-primary/5 dark:bg-gray-600 rounded w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 dark:text-red-400 mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchProducts}>
          Try Again
        </Button>
      </div>
    );
  }

  if (displayProducts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-primary/70 dark:text-gray-300">No products found</p>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Product count + shuffle control */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-primary/60 dark:text-gray-400">
          Showing {visibleProducts.length} of {displayProducts.length} products
        </p>
        <button
          onClick={handleReshuffle}
          className="flex items-center gap-1.5 text-xs text-primary/60 dark:text-gray-400 hover:text-primary dark:hover:text-gray-200 transition-colors px-2 py-1 rounded-md hover:bg-primary/5 dark:hover:bg-gray-700"
          title="Shuffle products"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Shuffle</span>
        </button>
      </div>

      {/* Responsive CSS Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {visibleProducts.map((product) => (
          <div key={product.id} className="product-card-wrapper">
            <ProductCard
              product={product}
              className="product-card h-full"
            />
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center mt-6 mb-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            className="px-8 py-2 text-sm border-primary/20 dark:border-gray-600 hover:bg-primary/5 dark:hover:bg-gray-700"
          >
            Load More ({displayProducts.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;