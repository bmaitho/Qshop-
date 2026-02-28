// backend/routes/pickupMtaani.js
// ✅ FIX 1: Added missing /nearest-origin/:sellerId route
// ✅ FIX 2: Fixed FK ambiguity in confirm-parcel-creation (order_items!fk_order_items_order_id)
// ✅ FIX 3: Fixed paymentOption 'Vendor' → 'vendor' (lowercase required by API)
// ✅ FIX 4: Smart origin point selection using campus coordinates in confirm-parcel-creation
// ✅ V2: Multi-seller support — one parcel per seller in confirm-parcel-creation + order tracking

import express from 'express';
import {
  syncPickupPoints,
  getPickupPoints,
  searchNearestPoints,
  searchNearestPointsByCoordinates,
  calculateDeliveryFee,
  createParcel,
  trackParcel
} from '../services/pickupMtaaniService.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// ============================================
// CAMPUS COORDINATES HELPER
// ============================================

function getCampusCoordinates(campusLocation) {
  if (!campusLocation) return null;
  const campus = campusLocation.toLowerCase().trim();

  const campusCoords = {
    // Universities
    'university of nairobi': { latitude: -1.2791, longitude: 36.8172 },
    'uon': { latitude: -1.2791, longitude: 36.8172 },
    'uon main': { latitude: -1.2791, longitude: 36.8172 },
    'jkuat': { latitude: -1.0912, longitude: 37.0109 },
    'jkuat main': { latitude: -1.0912, longitude: 37.0109 },
    'jkuat juja': { latitude: -1.0912, longitude: 37.0109 },
    'strathmore': { latitude: -1.3098, longitude: 36.8125 },
    'strathmore university': { latitude: -1.3098, longitude: 36.8125 },
    'kenyatta university': { latitude: -1.1771, longitude: 36.9278 },
    'ku': { latitude: -1.1771, longitude: 36.9278 },
    'ku main': { latitude: -1.1771, longitude: 36.9278 },
    'kca': { latitude: -1.2544, longitude: 36.8849 },
    'kca university': { latitude: -1.2544, longitude: 36.8849 },
    'kca survey': { latitude: -1.2544, longitude: 36.8849 },
    'usiu': { latitude: -1.2211, longitude: 36.8834 },
    'usiu africa': { latitude: -1.2211, longitude: 36.8834 },
    'daystar': { latitude: -1.4667, longitude: 36.9500 },
    'daystar university': { latitude: -1.4667, longitude: 36.9500 },
    'mount kenya university': { latitude: -1.0450, longitude: 37.0750 },
    'mku': { latitude: -1.0450, longitude: 37.0750 },
    'multimedia university': { latitude: -1.3800, longitude: 36.7400 },
    'mmu': { latitude: -1.3800, longitude: 36.7400 },
    'zetech': { latitude: -1.2133, longitude: 36.8816 },
    'zetech university': { latitude: -1.2133, longitude: 36.8816 },
    'technical university of kenya': { latitude: -1.2863, longitude: 36.8313 },
    'tuk': { latitude: -1.2863, longitude: 36.8313 },
    'cooperative university': { latitude: -1.2623, longitude: 36.9622 },
    'cuk': { latitude: -1.2623, longitude: 36.9622 },
    'riara university': { latitude: -1.2471, longitude: 36.7137 },
    'riara': { latitude: -1.2471, longitude: 36.7137 },
    // Nairobi areas
    'nairobi': { latitude: -1.2864, longitude: 36.8172 },
    'nairobi cbd': { latitude: -1.2864, longitude: 36.8172 },
    'westlands': { latitude: -1.2676, longitude: 36.8060 },
    'kasarani': { latitude: -1.2219, longitude: 36.8977 },
    'roysambu': { latitude: -1.2161, longitude: 36.8802 },
    'ruaraka': { latitude: -1.2406, longitude: 36.8726 },
    'south b': { latitude: -1.3072, longitude: 36.8358 },
    'south c': { latitude: -1.3147, longitude: 36.8297 },
    'langata': { latitude: -1.3593, longitude: 36.7578 },
    'kilimani': { latitude: -1.2883, longitude: 36.7847 },
    'kileleshwa': { latitude: -1.2764, longitude: 36.7815 },
    'buruburu': { latitude: -1.2835, longitude: 36.8785 },
    'umoja': { latitude: -1.2720, longitude: 36.8990 },
    'embakasi': { latitude: -1.3106, longitude: 36.9030 },
    'donholm': { latitude: -1.2927, longitude: 36.8840 },
    'pipeline': { latitude: -1.3015, longitude: 36.8929 },
    'kahawa': { latitude: -1.1900, longitude: 36.9234 },
    'kahawa west': { latitude: -1.1849, longitude: 36.9100 },
    'thika road': { latitude: -1.2200, longitude: 36.8850 },
    'garden estate': { latitude: -1.2326, longitude: 36.8657 },
    'zimmerman': { latitude: -1.2000, longitude: 36.9000 },
    'githurai': { latitude: -1.1800, longitude: 36.9200 },
    'mirema': { latitude: -1.2100, longitude: 36.8850 },
    'rongai': { latitude: -1.3964, longitude: 36.7617 },
    'kitengela': { latitude: -1.4631, longitude: 36.9558 },
    // Other cities
    'mombasa': { latitude: -4.0435, longitude: 39.6682 },
    'kisumu': { latitude: -0.0917, longitude: 34.7680 },
    'nakuru': { latitude: -0.3031, longitude: 36.0800 },
    'eldoret': { latitude: 0.5143, longitude: 35.2698 },
    'thika': { latitude: -1.0396, longitude: 37.0900 },
    'kiambu': { latitude: -1.1714, longitude: 36.8356 },
    'machakos': { latitude: -1.5177, longitude: 37.2634 },
    'nyeri': { latitude: -0.4197, longitude: 36.9511 },
  };

  if (campusCoords[campus]) return campusCoords[campus];
  for (const [key, coords] of Object.entries(campusCoords)) {
    if (campus.includes(key) || key.includes(campus)) return coords;
  }
  return null;
}

// ============================================
// PICKUP POINTS MANAGEMENT
// ============================================

/**
 * GET /api/pickup-mtaani/sync-points
 */
router.get('/sync-points', async (req, res) => {
  try {
    console.log('📡 Syncing pickup points from PickUp Mtaani API...');
    const result = await syncPickupPoints();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        details: result.details,
        message: 'Failed to sync pickup points from PickUp Mtaani API'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully synced ${result.count} pickup points`,
      count: result.count,
      points: result.points
    });
    
  } catch (error) {
    console.error('Error in sync-points endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/pickup-mtaani/points
 */
router.get('/points', async (req, res) => {
  try {
    const { town, search, limit } = req.query;
    const filters = {};
    if (town) filters.town = town;
    if (search) filters.search = search;
    
    const result = await getPickupPoints(filters);
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    const points = limit ? result.points.slice(0, parseInt(limit)) : result.points;
    
    return res.status(200).json({
      success: true,
      count: points.length,
      points
    });
    
  } catch (error) {
    console.error('Error in get points endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// ✅ FIX 1: NEW ROUTE - nearest-origin/:sellerId
// ============================================

/**
 * GET /api/pickup-mtaani/nearest-origin/:sellerId
 * Find nearest PickUp Mtaani agent to a seller based on their campus location.
 * Used by pickupMtaaniHelper.js during parcel creation after payment.
 *
 * Query params:
 *   ?productId=uuid  - Optional product ID for location lookup
 *   ?limit=1         - Number of results (default 1)
 */
router.get('/nearest-origin/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { productId, limit: limitStr } = req.query;
    const limit = parseInt(limitStr) || 1;

    console.log(`📍 Finding nearest origin for seller ${sellerId}, product ${productId || 'none'}`);

    // 1. Get seller profile
    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('id, full_name, campus_location')
      .eq('id', sellerId)
      .single();

    if (sellerError || !seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    let latitude = null;
    let longitude = null;
    let locationSource = 'none';

    // 2. Try product's campus_location first
    if (productId) {
      try {
        const { data: product } = await supabase
          .from('products')
          .select('campus_location')
          .eq('id', productId)
          .single();

        if (product?.campus_location) {
          const coords = getCampusCoordinates(product.campus_location);
          if (coords) {
            latitude = coords.latitude;
            longitude = coords.longitude;
            locationSource = 'product_campus';
            console.log(`📍 Using product campus: ${product.campus_location} → ${latitude}, ${longitude}`);
          }
        }
      } catch (e) {
        console.log('Could not get product location, trying seller campus');
      }
    }

    // 3. Fall back to seller's campus_location
    if (!latitude && seller.campus_location) {
      const coords = getCampusCoordinates(seller.campus_location);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
        locationSource = 'seller_campus';
        console.log(`📍 Using seller campus: ${seller.campus_location} → ${latitude}, ${longitude}`);
      }
    }

    // 4. Search by proximity if we have coordinates
    if (latitude && longitude) {
      const result = await searchNearestPointsByCoordinates(latitude, longitude, 20, limit);

      if (result.success && result.points.length > 0) {
        const points = result.points.map(p => ({
          ...p,
          distance_km: p.distance ? parseFloat(p.distance.toFixed(2)) : null
        }));

        return res.status(200).json({
          success: true,
          sellerId,
          locationSource,
          latitude,
          longitude,
          count: points.length,
          points
        });
      }
    }

    // 5. Fallback: return any active point with coordinates
    console.log('⚠️ No coordinates resolved, using fallback');
    const { data: fallbackPoints, error: fbError } = await supabase
      .from('pickup_mtaani_points')
      .select('*')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(limit);

    if (fbError || !fallbackPoints?.length) {
      return res.status(404).json({ success: false, error: 'No active PickUp Mtaani points found' });
    }

    return res.status(200).json({
      success: true,
      sellerId,
      locationSource: 'fallback',
      count: fallbackPoints.length,
      points: fallbackPoints.map(p => ({ ...p, distance_km: null }))
    });

  } catch (error) {
    console.error('Error in nearest-origin endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// TOWN & COORDINATE BASED SEARCH
// ============================================

/**
 * GET /api/pickup-mtaani/points/near/:town
 */
router.get('/points/near/:town', async (req, res) => {
  try {
    const { town } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!town) {
      return res.status(400).json({ success: false, error: 'Town parameter is required' });
    }
    
    const result = await searchNearestPoints(town, limit);
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    return res.status(200).json({
      success: true,
      town,
      count: result.points.length,
      points: result.points
    });
    
  } catch (error) {
    console.error('Error in search nearest points endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/pickup-mtaani/points/:shopId
 */
router.get('/points/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const { data, error } = await supabase
      .from('pickup_mtaani_points')
      .select('*')
      .eq('shop_id', shopId)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Pickup point not found' });
    }
    
    return res.status(200).json({ success: true, point: data });
    
  } catch (error) {
    console.error('Error fetching pickup point:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/pickup-mtaani/points-nearby
 */
router.get('/points-nearby', async (req, res) => {
  try {
    const { lat, lng, radius, limit } = req.query;
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 10;
    const maxResults = limit ? parseInt(limit) : 20;
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Valid lat and lng parameters are required'
      });
    }
    
    const result = await searchNearestPointsByCoordinates(latitude, longitude, radiusKm, maxResults);
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    return res.status(200).json({
      success: true,
      latitude,
      longitude,
      radius: radiusKm,
      count: result.points.length,
      points: result.points
    });
    
  } catch (error) {
    console.error('Error in points-nearby endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// DELIVERY FEE CALCULATION
// ============================================

/**
 * POST /api/pickup-mtaani/calculate-fee
 */
router.post('/calculate-fee', async (req, res) => {
  try {
    const { originTown, destinationTown } = req.body;
    
    if (!originTown || !destinationTown) {
      return res.status(400).json({
        success: false,
        error: 'Both originTown and destinationTown are required'
      });
    }
    
    const result = await calculateDeliveryFee(originTown, destinationTown);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        fee: result.fee
      });
    }
    
    return res.status(200).json({
      success: true,
      originTown,
      destinationTown,
      deliveryFee: result.fee,
      currency: 'KES'
    });
    
  } catch (error) {
    console.error('Error calculating delivery fee:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      fee: 200
    });
  }
});

// ============================================
// PARCEL CREATION & TRACKING
// ============================================

/**
 * POST /api/pickup-mtaani/create-parcel
 */
router.post('/create-parcel', async (req, res) => {
  try {
    const {
      orderId,
      businessId,
      orderNumber,
      senderAgentId,
      receiverAgentId,
      packageValue,
      customerName,
      packageName,
      customerPhoneNumber,
      paymentOption,
      onDeliveryBalance,
      paymentNumber
    } = req.body;
    
    if (!orderId || !businessId || !senderAgentId || !receiverAgentId || 
        !packageValue || !customerName || !customerPhoneNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    console.log(`📦 Creating parcel for order ${orderNumber || orderId}...`);
    
    // ✅ FIX 3: Force lowercase paymentOption
    const result = await createParcel({
      businessId,
      orderNumber: orderNumber || orderId,
      senderAgentId,
      receiverAgentId,
      packageValue,
      customerName,
      packageName: packageName || 'UniHive Order',
      customerPhoneNumber,
      paymentOption: (paymentOption || 'vendor').toLowerCase(),
      onDeliveryBalance: onDeliveryBalance || 0,
      paymentNumber: paymentNumber || orderNumber || orderId
    });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
    
    // Update order in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pickup_mtaani_tracking_code: result.trackingCode,
        pickup_mtaani_parcel_id: result.packageId,
        pickup_mtaani_business_id: businessId,
        pickup_mtaani_origin_id: senderAgentId,
        pickup_mtaani_destination_id: receiverAgentId,
        pickup_mtaani_status: 'pending_pickup'
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error('Error updating order with tracking info:', updateError);
    }
    
    return res.status(200).json({
      success: true,
      trackingCode: result.trackingCode,
      packageId: result.packageId,
      businessId: result.businessId,
      message: 'Parcel created successfully'
    });
    
  } catch (error) {
    console.error('Error in create-parcel endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/pickup-mtaani/track/:trackingCode
 */
router.get('/track/:trackingCode', async (req, res) => {
  try {
    const { trackingCode } = req.params;
    
    if (!trackingCode) {
      return res.status(400).json({ success: false, error: 'Tracking code is required' });
    }
    
    const result = await trackParcel(trackingCode);
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    return res.status(200).json({
      success: true,
      trackingCode,
      status: result.status,
      parcelData: result.parcelData
    });
    
  } catch (error) {
    console.error('Error tracking parcel:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// ✅ V2: ORDER TRACKING — Multi-Seller Support
// ============================================

/**
 * GET /api/pickup-mtaani/order/:orderId/tracking
 * Returns tracking info for all parcels in an order (one per seller).
 */
router.get('/order/:orderId/tracking', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order-level info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('pickup_mtaani_tracking_code, pickup_mtaani_parcel_id, pickup_mtaani_status, pickup_mtaani_business_id, pickup_mtaani_origin_id, pickup_mtaani_origin_name, pickup_mtaani_destination_id, pickup_mtaani_destination_name, delivery_method')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.delivery_method !== 'pickup_mtaani') {
      return res.status(400).json({ success: false, error: 'Not a PickUp Mtaani order' });
    }

    // Get per-seller tracking from order_items
    const { data: items } = await supabase
      .from('order_items')
      .select('id, seller_id, pickup_mtaani_tracking_code, pickup_mtaani_parcel_id, pickup_mtaani_status, pickup_mtaani_business_id, pickup_mtaani_origin_name, pickup_mtaani_origin_address')
      .eq('order_id', orderId)
      .not('pickup_mtaani_tracking_code', 'is', null);

    // Group by seller for unique parcels
    const sellerParcels = new Map();
    for (const item of (items || [])) {
      if (!item.pickup_mtaani_tracking_code) continue;
      if (!sellerParcels.has(item.seller_id)) {
        sellerParcels.set(item.seller_id, {
          sellerId: item.seller_id,
          trackingCode: item.pickup_mtaani_tracking_code,
          parcelId: item.pickup_mtaani_parcel_id,
          status: item.pickup_mtaani_status,
          businessId: item.pickup_mtaani_business_id,
          originName: item.pickup_mtaani_origin_name,
          originAddress: item.pickup_mtaani_origin_address
        });
      }
    }

    // If we have per-seller parcels, try live tracking for each
    const parcels = [];
    for (const [sellerId, parcel] of sellerParcels) {
      let liveStatus = parcel.status;
      let parcelData = null;

      if (parcel.parcelId && parcel.businessId) {
        try {
          const trackResult = await trackParcel(parcel.parcelId, parcel.businessId);
          if (trackResult.success) {
            liveStatus = trackResult.status;
            parcelData = trackResult.parcelData;

            // Update order_items with latest status
            await supabase
              .from('order_items')
              .update({ pickup_mtaani_status: liveStatus })
              .eq('order_id', orderId)
              .eq('seller_id', sellerId)
              .not('pickup_mtaani_tracking_code', 'is', null);
          }
        } catch (e) {
          console.error(`Tracking failed for parcel ${parcel.trackingCode}:`, e.message);
        }
      }

      // Get seller name
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', sellerId)
        .single();

      parcels.push({
        sellerId,
        sellerName: sellerProfile?.full_name || 'Seller',
        trackingCode: parcel.trackingCode,
        parcelId: parcel.parcelId,
        status: liveStatus,
        originName: parcel.originName,
        originAddress: parcel.originAddress,
        parcelData
      });
    }

    // Fallback: if no per-seller data, use order-level (backward compat)
    if (parcels.length === 0 && order.pickup_mtaani_tracking_code) {
      let liveStatus = order.pickup_mtaani_status || 'pending_pickup';
      let parcelData = null;

      if (order.pickup_mtaani_parcel_id && order.pickup_mtaani_business_id) {
        const trackResult = await trackParcel(order.pickup_mtaani_parcel_id, order.pickup_mtaani_business_id);
        if (trackResult.success) {
          liveStatus = trackResult.status;
          parcelData = trackResult.parcelData;
        }
      }

      parcels.push({
        sellerId: null,
        sellerName: 'Seller',
        trackingCode: order.pickup_mtaani_tracking_code,
        parcelId: order.pickup_mtaani_parcel_id,
        status: liveStatus,
        originName: order.pickup_mtaani_origin_name,
        parcelData
      });
    }

    if (parcels.length === 0) {
      return res.status(200).json({
        success: true,
        trackingCode: null,
        status: 'awaiting_parcel_creation',
        message: 'Parcel(s) have not been created yet',
        parcels: []
      });
    }

    return res.status(200).json({
      success: true,
      // Backward compat fields
      trackingCode: order.pickup_mtaani_tracking_code || parcels[0]?.trackingCode,
      parcelId: order.pickup_mtaani_parcel_id || parcels[0]?.parcelId,
      originName: order.pickup_mtaani_origin_name || parcels[0]?.originName,
      destinationName: order.pickup_mtaani_destination_name,
      status: parcels[0]?.status || 'pending_pickup',
      // New multi-seller fields
      parcels,
      totalParcels: parcels.length
    });

  } catch (error) {
    console.error('Error in order tracking:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * GET /api/pickup-mtaani/towns
 */
router.get('/towns', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pickup_mtaani_points')
      .select('town')
      .eq('is_active', true)
      .order('town');
    
    if (error) throw error;
    
    const uniqueTowns = [...new Set(data.map(item => item.town))].filter(Boolean);
    
    return res.status(200).json({
      success: true,
      count: uniqueTowns.length,
      towns: uniqueTowns
    });
    
  } catch (error) {
    console.error('Error fetching towns:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/pickup-mtaani/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { data: allPoints, error: allError } = await supabase
      .from('pickup_mtaani_points')
      .select('*');
    
    if (allError) throw allError;
    
    const { data: activePoints, error: activeError } = await supabase
      .from('pickup_mtaani_points')
      .select('*')
      .eq('is_active', true);
    
    if (activeError) throw activeError;
    
    const towns = [...new Set(activePoints.map(p => p.town))].filter(Boolean);
    
    return res.status(200).json({
      success: true,
      stats: {
        totalPoints: allPoints.length,
        activePoints: activePoints.length,
        inactivePoints: allPoints.length - activePoints.length,
        townsCount: towns.length,
        lastSync: allPoints[0]?.last_synced_at || null
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/pickup-mtaani/test-connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    console.log('🔍 Testing PickUp Mtaani connection...');

    const apiKey = process.env.PICKUP_MTAANI_API_KEY;
    const baseUrl = process.env.PICKUP_MTAANI_BASE_URL || 'https://api.pickupmtaani.com/api/vv1';

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'PICKUP_MTAANI_API_KEY is not set in environment variables',
        configured: false
      });
    }

    const { count: cachedCount, error: countError } = await supabase
      .from('pickup_mtaani_points')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (countError) console.error('DB count error:', countError);

    let apiReachable = false;
    let apiError = null;
    let agentCount = 0;

    try {
      const { default: axios } = await import('axios');
      const response = await axios.get(`${baseUrl}/agents`, {
        headers: {
          'apiKey': apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        timeout: 10000
      });

      const agents = response.data?.data || response.data;
      if (Array.isArray(agents)) {
        apiReachable = true;
        agentCount = agents.length;
      }
    } catch (err) {
      apiError = err.message;
      console.error('❌ PickUp Mtaani API test failed:', err.message);
    }

    const status = {
      configured: true,
      apiKeyPresent: true,
      apiReachable,
      apiError,
      cachedPoints: cachedCount || 0,
      liveAgents: agentCount,
      baseUrl,
      recommendation: apiReachable
        ? (cachedCount > 0 ? '✅ Integration is fully active' : '⚠️ API works but no cached points — run /sync-points')
        : '❌ API not reachable — check API key and base URL'
    };

    return res.status(200).json({
      success: apiReachable,
      message: status.recommendation,
      status
    });

  } catch (error) {
    console.error('Error in test-connection:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ✅ V2: CONFIRM PARCEL CREATION — Multi-Seller Support
// ============================================

/**
 * POST /api/pickup-mtaani/confirm-parcel-creation/:orderId
 * Creates one parcel PER SELLER for multi-shop orders.
 * Stores tracking info on order_items (per-seller) + order (backward compat).
 */
router.post('/confirm-parcel-creation/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items!fk_order_items_order_id(*, products(name))')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order query error:', orderError);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.delivery_method !== 'pickup_mtaani') {
      return res.status(400).json({ success: false, error: 'Order does not use PickUp Mtaani delivery' });
    }

    if (!order.pickup_mtaani_destination_id) {
      return res.status(400).json({ success: false, error: 'No destination pickup point set for this order' });
    }

    // Fetch buyer profile
    const { data: buyer } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.user_id)
      .single();

    const businessId = process.env.PICKUP_MTAANI_BUSINESS_ID
      ? parseInt(process.env.PICKUP_MTAANI_BUSINESS_ID)
      : 77680;

    const customerPhone = (buyer?.phone || order.phone_number || '')
      .replace(/\+/g, '')
      .replace(/^0/, '254');

    // 2. Group order items by seller
    const sellerGroups = new Map();
    for (const item of (order.order_items || [])) {
      const sid = item.seller_id;
      if (!sid) continue;
      if (!sellerGroups.has(sid)) {
        sellerGroups.set(sid, []);
      }
      sellerGroups.get(sid).push(item);
    }

    if (sellerGroups.size === 0) {
      return res.status(400).json({ success: false, error: 'No order items found' });
    }

    console.log(`📦 Order ${orderId} has ${sellerGroups.size} seller(s)`);

    const results = [];
    let firstTrackingCode = null;
    let firstOriginPoint = null;

    // 3. Create one parcel per seller
    for (const [sellerId, items] of sellerGroups) {
      try {
        // Check if these items already have tracking (retry safety)
        const alreadyTracked = items.some(i => i.pickup_mtaani_tracking_code);
        if (alreadyTracked) {
          console.log(`✓ Seller ${sellerId} items already tracked, skipping`);
          results.push({ sellerId, success: true, skipped: true });
          continue;
        }

        // Get seller profile
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('full_name, phone, campus_location')
          .eq('id', sellerId)
          .single();

        // Find origin point for this seller
        let originPoint = null;

        if (sellerProfile?.campus_location) {
          const coords = getCampusCoordinates(sellerProfile.campus_location);
          if (coords) {
            console.log(`📍 Seller "${sellerProfile.full_name}" campus → ${coords.latitude}, ${coords.longitude}`);
            const nearbyResult = await searchNearestPointsByCoordinates(coords.latitude, coords.longitude, 20, 1);
            if (nearbyResult.success && nearbyResult.points.length > 0) {
              originPoint = nearbyResult.points[0];
            }
          }
        }

        // Fallback to any active point
        if (!originPoint) {
          const { data: fallbackPoints } = await supabase
            .from('pickup_mtaani_points')
            .select('shop_id, shop_name, street_address, town')
            .eq('is_active', true)
            .not('latitude', 'is', null)
            .limit(1);
          originPoint = fallbackPoints?.[0];
        }

        if (!originPoint) {
          console.error(`⚠️ No origin point for seller ${sellerId}`);
          results.push({ sellerId, success: false, error: 'No origin point found' });
          continue;
        }

        // Build parcel data for this seller's items
        const itemDescription = items
          .map(i => `${i.quantity}x ${i.products?.name || 'Item'}`)
          .join(', ')
          .substring(0, 100);

        const sellerSubtotal = items.reduce((sum, i) => sum + parseFloat(i.subtotal || 0), 0);

        const parcelData = {
          businessId,
          orderNumber: `${order.id.substring(0, 6)}-${sellerId.substring(0, 2)}`.toUpperCase(),
          senderAgentId: originPoint.shop_id,
          receiverAgentId: order.pickup_mtaani_destination_id,
          packageValue: Math.round(sellerSubtotal || 0),
          customerName: buyer?.full_name || 'UniHive Customer',
          packageName: itemDescription || 'UniHive Order',
          customerPhoneNumber: customerPhone,
          paymentOption: 'vendor',
          onDeliveryBalance: 0,
          paymentNumber: `${order.id.substring(0, 6)}-${sellerId.substring(0, 2)}`.toUpperCase()
        };

        console.log(`📦 Creating parcel for seller ${sellerProfile?.full_name || sellerId}:`, parcelData);
        const result = await createParcel(parcelData);

        if (!result.success) {
          console.error(`⚠️ Parcel failed for seller ${sellerId}:`, result.error);
          results.push({ sellerId, success: false, error: result.error });
          continue;
        }

        const trackingCode = result.trackingCode;
        const parcelId = result.packageId;

        // Track first seller for backward compat
        if (!firstTrackingCode) {
          firstTrackingCode = trackingCode;
          firstOriginPoint = originPoint;
        }

        // Update order_items with per-seller tracking
        const itemIds = items.map(i => i.id);
        await supabase
          .from('order_items')
          .update({
            pickup_mtaani_tracking_code: trackingCode,
            pickup_mtaani_parcel_id: parcelId,
            pickup_mtaani_origin_id: originPoint.shop_id,
            pickup_mtaani_origin_name: originPoint.shop_name,
            pickup_mtaani_origin_address: originPoint.street_address || originPoint.town,
            pickup_mtaani_status: 'pending_pickup',
            pickup_mtaani_business_id: businessId,
            updated_at: new Date().toISOString()
          })
          .in('id', itemIds);

        results.push({
          sellerId,
          sellerName: sellerProfile?.full_name,
          success: true,
          trackingCode,
          parcelId
        });

        console.log(`✅ Parcel for seller "${sellerProfile?.full_name}": ${trackingCode}`);

      } catch (sellerErr) {
        console.error(`⚠️ Error for seller ${sellerId}:`, sellerErr.message);
        results.push({ sellerId, success: false, error: sellerErr.message });
      }
    }

    // 4. Update order-level tracking (backward compat)
    if (firstTrackingCode) {
      await supabase
        .from('orders')
        .update({
          pickup_mtaani_tracking_code: firstTrackingCode,
          pickup_mtaani_parcel_id: results.find(r => r.success && r.parcelId)?.parcelId || null,
          pickup_mtaani_status: 'pending_pickup',
          pickup_mtaani_origin_id: firstOriginPoint?.shop_id,
          pickup_mtaani_origin_name: firstOriginPoint?.shop_name,
          pickup_mtaani_business_id: businessId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    const successCount = results.filter(r => r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.skipped).length;

    return res.status(200).json({
      success: successCount > 0 || skippedCount > 0,
      message: `Created ${successCount} parcel(s), ${skippedCount} skipped`,
      parcels: results,
      trackingCode: firstTrackingCode // backward compat
    });

  } catch (error) {
    console.error('Error in confirm-parcel-creation:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;