// backend/services/pickupMtaaniService.js
import axios from 'axios';
import { supabase } from '../supabaseClient.js';

const API_KEY = process.env.PICKUP_MTAANI_API_KEY;
const BASE_URL = process.env.PICKUP_MTAANI_BASE_URL || 'https://api.pickupmtaani.com/api/vv1';

const pickupMtaaniAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'apiKey': API_KEY,
    'Content-Type': 'application/json',
    'accept': 'application/json'
  },
  timeout: 30000
});

// ============================================
// PICKUP POINTS
// ============================================

/**
 * Fetch all pickup points from PickUp Mtaani and cache in database
 */
export const syncPickupPoints = async () => {
  try {
    console.log('🔄 Syncing PickUp Mtaani pickup points...');
    const response = await pickupMtaaniAPI.get('/agents');
    const shops = response.data.data || response.data;

    if (!Array.isArray(shops)) {
      throw new Error('Invalid response format from PickUp Mtaani API');
    }

    console.log(`📦 Received ${shops.length} pickup points from API`);
    if (shops.length === 0) {
      return { success: true, count: 0, points: [] };
    }

    const pointsToInsert = shops
      .filter(shop => shop.id && shop.business_name)
      .map(shop => ({
        shop_id: shop.id.toString(),
        shop_name: shop.business_name,
        town: shop.loc?.name || 'Unknown',
        street_address: shop.agent_description || null,
        latitude: shop.loc?.lat ? parseFloat(shop.loc.lat) : null,
        longitude: shop.loc?.lng ? parseFloat(shop.loc.lng) : null,
        phone_number: shop.phone_number || shop.contact || null,
        opening_time: shop.opening_hours || null,
        closing_time: shop.closing_hours || null,
        is_active: true,
        last_synced_at: new Date().toISOString()
      }));

    const { data, error } = await supabase
      .from('pickup_mtaani_points')
      .upsert(pointsToInsert, { onConflict: 'shop_id', ignoreDuplicates: false })
      .select();

    if (error) throw error;

    console.log(`✅ Successfully synced ${data.length} pickup points`);
    return { success: true, count: data.length, points: data };

  } catch (error) {
    console.error('❌ Error syncing pickup points:', error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: { status: error.response?.status, data: error.response?.data }
    };
  }
};

/**
 * Get cached pickup points from database with optional filtering
 */
export const getPickupPoints = async (filters = {}) => {
  try {
    let query = supabase
      .from('pickup_mtaani_points')
      .select('*')
      .eq('is_active', true);

    if (filters.town) {
      query = query.ilike('town', `%${filters.town}%`);
    }
    if (filters.search) {
      query = query.or(`shop_name.ilike.%${filters.search}%,town.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('shop_name');
    if (error) throw error;
    return { success: true, points: data };

  } catch (error) {
    console.error('Error fetching pickup points:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Search for nearest pickup points based on town/location
 */
export const searchNearestPoints = async (town, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('pickup_mtaani_points')
      .select('*')
      .eq('is_active', true)
      .ilike('town', `%${town}%`)
      .limit(limit);

    if (error) throw error;
    return { success: true, points: data };

  } catch (error) {
    console.error('Error searching nearest points:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Search for pickup points near a specific coordinate
 */
export const searchNearestPointsByCoordinates = async (latitude, longitude, radiusKm = 10, limit = 20) => {
  try {
    const { data: allPoints, error } = await supabase
      .from('pickup_mtaani_points')
      .select('*')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) throw error;

    const pointsWithDistance = allPoints.map(point => {
      const distance = calculateDistance(latitude, longitude, point.latitude, point.longitude);
      return { ...point, distance };
    });

    const nearbyPoints = pointsWithDistance
      .filter(p => p.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return { success: true, points: nearbyPoints };

  } catch (error) {
    console.error('Error searching by coordinates:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// DISTANCE & FEE HELPERS
// ============================================

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate delivery fee based on origin and destination agent IDs
 * Falls back to zone-based pricing if API call fails
 */
export const calculateDeliveryFee = async (senderAgentID, receiverAgentID) => {
  try {
    // Try PickUp Mtaani API first
    try {
      const response = await pickupMtaaniAPI.get('/delivery-charge/agent-package', {
        params: { senderAgentID, receiverAgentID }
      });
      const feeData = response.data.data || response.data;
      if (feeData && feeData.charge) {
        console.log('✅ Got delivery fee from API:', feeData.charge);
        return { success: true, fee: feeData.charge };
      }
    } catch (apiError) {
      console.warn('Could not get fee from API, using fallback:', apiError.message);
    }

    // Fallback: zone-based pricing
    const { data: originPoint } = await supabase
      .from('pickup_mtaani_points')
      .select('town')
      .eq('shop_id', senderAgentID)
      .single();

    const { data: destPoint } = await supabase
      .from('pickup_mtaani_points')
      .select('town')
      .eq('shop_id', receiverAgentID)
      .single();

    if (!originPoint || !destPoint) {
      console.log('⚠️ Could not find town info, using default fee');
      return { success: true, fee: 200 };
    }

    const origin = originPoint.town.toLowerCase().trim();
    const destination = destPoint.town.toLowerCase().trim();

    // Same town
    if (origin === destination) {
      return { success: true, fee: 150 };
    }

    const majorCities = ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret'];
    const isOriginMajor = majorCities.some(city => origin.includes(city));
    const isDestMajor = majorCities.some(city => destination.includes(city));

    // Between major cities
    if (isOriginMajor && isDestMajor) {
      return { success: true, fee: 300 };
    }
    // One major, one minor
    if (isOriginMajor || isDestMajor) {
      return { success: true, fee: 250 };
    }
    // Both minor towns
    return { success: true, fee: 350 };

  } catch (error) {
    console.error('Error calculating delivery fee:', error);
    return { success: false, error: error.message, fee: 200 };
  }
};

// ============================================
// PARCEL CREATION & TRACKING
// ============================================

/**
 * Create a parcel booking with PickUp Mtaani
 * Uses POST /packages/agent-agent with business ID in query param
 */
export const createParcel = async (parcelData) => {
  try {
    const {
      businessId,
      orderNumber,
      senderAgentId,
      receiverAgentId,
      packageValue,
      customerName,
      packageName,
      customerPhoneNumber,
      paymentOption = 'Vendor',
      onDeliveryBalance = 0,
      paymentNumber = ''
    } = parcelData;

    const payload = {
      receiverAgentId: receiverAgentId,
      senderAgentId: senderAgentId,
      packageValue: packageValue,
      customerName: customerName,
      packageName: packageName,
      customerPhoneNumber: customerPhoneNumber,
      paymentOption: paymentOption,
      on_delivery_balance: onDeliveryBalance,
      payment_number: paymentNumber || orderNumber
    };

    console.log('📦 Creating parcel with PickUp Mtaani:', { businessId, payload });

    const response = await pickupMtaaniAPI.post('/packages/agent-agent', payload, {
      params: { b_id: businessId }
    });

    const parcelInfo = response.data.data || response.data;
    console.log('✅ Parcel created successfully:', parcelInfo);

    return {
      success: true,
      packageId: parcelInfo.id || parcelInfo.packageId,
      trackingCode: parcelInfo.trackingCode || parcelInfo.tracking_code || parcelInfo.code,
      businessId: businessId,
      parcelData: parcelInfo
    };

  } catch (error) {
    console.error('❌ Error creating parcel:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data
    };
  }
};

/**
 * Track parcel status
 */
export const trackParcel = async (packageId, businessId) => {
  try {
    const response = await pickupMtaaniAPI.get('/packages/agent-agent', {
      params: { id: packageId, b_id: businessId }
    });
    const parcelInfo = response.data.data || response.data;

    return {
      success: true,
      status: parcelInfo.status,
      parcelData: parcelInfo
    };

  } catch (error) {
    console.error('Error tracking parcel:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// DEFAULT EXPORT (matches named exports)
// ============================================

export default {
  syncPickupPoints,
  getPickupPoints,
  searchNearestPoints,
  searchNearestPointsByCoordinates,
  calculateDeliveryFee,
  createParcel,
  trackParcel
};