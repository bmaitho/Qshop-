// backend/services/pickupMtaaniService.js
import axios from 'axios';
import { supabase } from '../supabaseClient.js';

const API_KEY = process.env.PICKUP_MTAANI_API_KEY;
const BASE_URL = process.env.PICKUP_MTAANI_BASE_URL || 'https://api.pickupmtaani.com/api/vv1';

// Configure axios instance
const pickupMtaaniAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'apiKey': API_KEY,  // ✅ Changed from 'Authorization: Bearer' to 'apiKey'
    'Content-Type': 'application/json',
    'accept': 'application/json'
  },
  timeout: 30000
});

/**
 * Fetch all pickup points from PickUp Mtaani and cache in database
 */
/**
 * Fetch all pickup points from PickUp Mtaani and cache in database
 * Uses /agents endpoint to get all agent details
 */
export const syncPickupPoints = async () => {
  try {
    console.log('🔄 Syncing PickUp Mtaani pickup points...');
    console.log('📍 API Base URL:', BASE_URL);
    console.log('🔑 API Key present:', !!API_KEY);
    console.log('🔑 API Key (first 10 chars):', API_KEY ? API_KEY.substring(0, 10) : 'MISSING');
    
    // ✅ Use /agents endpoint to get all agent details
    const response = await pickupMtaaniAPI.get('/agents');
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    const shops = response.data.data || response.data;

    if (!Array.isArray(shops)) {
      console.error('❌ Invalid response format. Expected array, got:', typeof shops);
      console.error('Response data:', JSON.stringify(response.data).substring(0, 500));
      throw new Error('Invalid response format from PickUp Mtaani API');
    }

    console.log(`📦 Received ${shops.length} pickup points from API`);

    if (shops.length === 0) {
      console.warn('⚠️ API returned empty array of shops');
      return { success: true, count: 0, points: [] };
    }

    // Prepare data for database
    const pointsToInsert = shops.map(shop => ({
      shop_id: shop.id || shop.shop_id,
      shop_name: shop.name || shop.shop_name,
      town: shop.town,
      street_address: shop.street_address || shop.address,
      latitude: shop.latitude ? parseFloat(shop.latitude) : null,
      longitude: shop.longitude ? parseFloat(shop.longitude) : null,
      phone_number: shop.phone_number || shop.contact,
      opening_time: shop.opening_time,
      closing_time: shop.closing_time,
      is_active: true,
      last_synced_at: new Date().toISOString()
    }));

    console.log('💾 Attempting to save to database...');
    console.log('Sample point:', JSON.stringify(pointsToInsert[0], null, 2));

    // Upsert to database (insert or update if exists)
    const { data, error } = await supabase
      .from('pickup_mtaani_points')
      .upsert(pointsToInsert, { 
        onConflict: 'shop_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log(`✅ Successfully synced ${data.length} pickup points to database`);
    return { success: true, count: data.length, points: data };

  } catch (error) {
    console.error('❌ Error syncing pickup points:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Full error:', error);
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      details: {
        status: error.response?.status,
        data: error.response?.data
      }
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
 * Calculate delivery fee based on origin and destination
 * Can use PickUp Mtaani API or fallback to zone-based pricing
 */
export const calculateDeliveryFee = async (originLocationId, destinationLocationId) => {
  try {
    // Try to get actual price from PickUp Mtaani API first
    try {
      const response = await pickupMtaaniAPI.get('/delivery-charge/agent-package', {
        params: {
          originLocationId,
          destinationLocationId
        }
      });
      
      const feeData = response.data.data || response.data;
      if (feeData && feeData.charge) {
        return { success: true, fee: feeData.charge };
      }
    } catch (apiError) {
      console.warn('Could not get fee from API, using fallback:', apiError.message);
    }

    // Fallback to zone-based pricing if API fails
    // This requires knowing the towns, so we'll query database
    const { data: originPoint } = await supabase
      .from('pickup_mtaani_points')
      .select('town')
      .eq('shop_id', originLocationId)
      .single();
      
    const { data: destPoint } = await supabase
      .from('pickup_mtaani_points')
      .select('town')
      .eq('shop_id', destinationLocationId)
      .single();

    if (!originPoint || !destPoint) {
      return { success: true, fee: 200 }; // Default fallback
    }

    // Zone-based calculation
    const origin = originPoint.town.toLowerCase().trim();
    const destination = destPoint.town.toLowerCase().trim();

    // Same town
    if (origin === destination) {
      return { success: true, fee: 150 };
    }

    // Define major city zones
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
    return { success: false, error: error.message, fee: 200 }; // Default fallback
  }
};

/**
 * Create a parcel booking with PickUp Mtaani
 * Uses POST /packages/agent-agent endpoint
 */
export const createParcel = async (parcelData) => {
  try {
    const {
      orderNumber,
      senderName,
      senderPhone,
      recipientName,
      recipientPhone,
      originShopId,
      destinationShopId,
      itemDescription,
      itemValue,
      paymentMethod = 'prepaid' // Since buyer pays via M-Pesa
    } = parcelData;

    // Note: Check PickUp Mtaani docs for exact payload format
    // This is a best guess based on typical API patterns
    const payload = {
      senderName: senderName,
      senderPhone: senderPhone,
      recipientName: recipientName,
      recipientPhone: recipientPhone,
      originLocationId: originShopId, // May need to be businessId instead
      destinationLocationId: destinationShopId,
      description: itemDescription || 'UniHive Order',
      value: itemValue,
      paymentMethod: paymentMethod,
      referenceNumber: orderNumber
    };

    console.log('📦 Creating parcel with PickUp Mtaani:', payload);

    // ✅ Use /packages/agent-agent endpoint for agent-to-agent delivery
    const response = await pickupMtaaniAPI.post('/packages/agent-agent', payload);
    const parcelInfo = response.data.data || response.data;

    console.log('✅ Parcel created successfully:', parcelInfo);

    return {
      success: true,
      trackingCode: parcelInfo.trackingCode || parcelInfo.tracking_code || parcelInfo.code,
      parcelId: parcelInfo.id || parcelInfo.packageId,
      parcelData: parcelInfo
    };

  } catch (error) {
    console.error('❌ Error creating parcel:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Track parcel status
 * Uses GET /packages/agent-agent endpoint
 */
export const trackParcel = async (trackingCode) => {
  try {
    // ✅ Use /packages/agent-agent endpoint to get package details
    const response = await pickupMtaaniAPI.get(`/packages/agent-agent`, {
      params: {
        trackingCode: trackingCode
      }
    });
    const parcelInfo = response.data.data || response.data;

    return {
      success: true,
      status: parcelInfo.status,
      parcelData: parcelInfo
    };

  } catch (error) {
    console.error('Error tracking parcel:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  syncPickupPoints,
  getPickupPoints,
  searchNearestPoints,
  calculateDeliveryFee,
  createParcel,
  trackParcel
};