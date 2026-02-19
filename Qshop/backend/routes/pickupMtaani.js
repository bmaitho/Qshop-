// backend/routes/pickupMtaani.js
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
// PICKUP POINTS MANAGEMENT
// ============================================

/**
 * GET /api/pickup-mtaani/sync-points
 * Sync all pickup points from PickUp Mtaani API to database
 * Should be called periodically (e.g., daily cron job)
 */
router.get('/sync-points', async (req, res) => {
  try {
    console.log('📡 Syncing pickup points from PickUp Mtaani API...');
    console.log('Request headers:', req.headers);
    
    const result = await syncPickupPoints();
    
    if (!result.success) {
      console.error('Sync failed:', result);
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
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/pickup-mtaani/points
 * Get all cached pickup points with optional filtering
 * Query params: ?town=Nairobi&search=cbd
 */
router.get('/points', async (req, res) => {
  try {
    const { town, search } = req.query;
    
    const filters = {};
    if (town) filters.town = town;
    if (search) filters.search = search;
    
    const result = await getPickupPoints(filters);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    return res.status(200).json({
      success: true,
      count: result.points.length,
      points: result.points
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

/**
 * GET /api/pickup-mtaani/points/near/:town
 * Search for nearest pickup points based on town
 * Example: /api/pickup-mtaani/points/near/Nairobi?limit=10
 */
router.get('/points/near/:town', async (req, res) => {
  try {
    const { town } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!town) {
      return res.status(400).json({
        success: false,
        error: 'Town parameter is required'
      });
    }
    
    const result = await searchNearestPoints(town, limit);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    return res.status(200).json({
      success: true,
      town: town,
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
 * Get a specific pickup point by shop ID
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
      return res.status(404).json({
        success: false,
        error: 'Pickup point not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      point: data
    });
    
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
 * GET /api/pickup-mtaani/points/nearby
 * Search pickup points near coordinates
 * Query params: ?lat=-1.2921&lng=36.8219&radius=5&limit=10
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
    
    const result = await searchNearestPointsByCoordinates(
      latitude,
      longitude,
      radiusKm,
      maxResults
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
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
 * Calculate delivery fee between origin and destination
 * Body: { originTown: "Nairobi", destinationTown: "Mombasa" }
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
        fee: result.fee // Return default fee even on error
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
      fee: 200 // Default fallback fee
    });
  }
});

// ============================================
// PARCEL CREATION & TRACKING
// ============================================

/**
 * POST /api/pickup-mtaani/create-parcel
 * Create a parcel booking with PickUp Mtaani
 * Body: {
 *   orderId: "uuid",
 *   orderNumber: "ORD-123",
 *   senderName: "John Seller",
 *   senderPhone: "254712345678",
 *   recipientName: "Jane Buyer",
 *   recipientPhone: "254787654321",
 *   originShopId: "shop_123",
 *   destinationShopId: "shop_456",
 *   itemDescription: "Electronics",
 *   itemValue: 5000
 * }
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
    
    // Validation
    if (!orderId || !businessId || !senderAgentId || !receiverAgentId || 
        !packageValue || !customerName || !customerPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    console.log(`📦 Creating parcel for order ${orderNumber || orderId}...`);
    
    // Create parcel with PickUp Mtaani
    const result = await createParcel({
      businessId,
      orderNumber: orderNumber || orderId,
      senderAgentId,
      receiverAgentId,
      packageValue,
      customerName,
      packageName: packageName || 'UniHive Order',
      customerPhoneNumber,
      paymentOption: paymentOption || 'Vendor',
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
    
    // Update order in database with tracking information
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pickup_mtaani_tracking_code: result.trackingCode,
        pickup_mtaani_parcel_id: result.packageId, // Note: packageId not parcelId
        pickup_mtaani_business_id: businessId, // Store business ID for tracking
        pickup_mtaani_origin_id: senderAgentId,
        pickup_mtaani_destination_id: receiverAgentId,
        pickup_mtaani_status: 'pending_pickup'
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error('Error updating order with tracking info:', updateError);
      // Continue even if update fails - parcel was created successfully
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
 * Track parcel status using tracking code
 */
router.get('/track/:trackingCode', async (req, res) => {
  try {
    const { trackingCode } = req.params;
    
    if (!trackingCode) {
      return res.status(400).json({
        success: false,
        error: 'Tracking code is required'
      });
    }
    
    const result = await trackParcel(trackingCode);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    // Update order status in database
    if (result.status) {
      await supabase
        .from('orders')
        .update({
          pickup_mtaani_status: result.status
        })
        .eq('pickup_mtaani_tracking_code', trackingCode);
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

/**
 * GET /api/pickup-mtaani/order/:orderId/tracking
 * Get tracking information for a specific order
 */
router.get('/order/:orderId/tracking', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Fetch order with tracking info
    const { data: order, error } = await supabase
      .from('orders')
      .select('pickup_mtaani_tracking_code, pickup_mtaani_status, pickup_mtaani_parcel_id')
      .eq('id', orderId)
      .single();
    
    if (error || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    if (!order.pickup_mtaani_tracking_code) {
      return res.status(404).json({
        success: false,
        error: 'No PickUp Mtaani tracking information for this order'
      });
    }
    
    // Get latest tracking info from API
    const trackingResult = await trackParcel(order.pickup_mtaani_tracking_code);
    
    return res.status(200).json({
      success: true,
      orderId,
      trackingCode: order.pickup_mtaani_tracking_code,
      parcelId: order.pickup_mtaani_parcel_id,
      status: trackingResult.success ? trackingResult.status : order.pickup_mtaani_status,
      parcelData: trackingResult.parcelData
    });
    
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * GET /api/pickup-mtaani/towns
 * Get list of all unique towns with pickup points
 */
router.get('/towns', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pickup_mtaani_points')
      .select('town')
      .eq('is_active', true)
      .order('town');
    
    if (error) throw error;
    
    // Get unique towns
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
 * Get statistics about pickup points
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

export default router;