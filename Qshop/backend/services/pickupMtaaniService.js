// backend/services/pickupMtaaniService.js
import axios from 'axios';
import { supabase } from '../supabaseClient.js';

const API_KEY = process.env.PICKUP_MTAANI_API_KEY;
const BASE_URL = process.env.PICKUP_MTAANI_BASE_URL || 'https://api.pickupmtaani.com/api/v1';

// Configure axios instance
const pickupMtaaniAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

/**
 * Fetch all pickup points from PickUp Mtaani and cache in database
 */
export const syncPickupPoints = async () => {
  try {
    console.log('🔄 Syncing PickUp Mtaani pickup points...');
    
    const response = await pickupMtaaniAPI.get('/parcel_shops');
    const shops = response.data.data || response.data;

    if (!Array.isArray(shops)) {
      throw new Error('Invalid response format from PickUp Mtaani API');
    }

    console.log(`📦 Received ${shops.length} pickup points from API`);

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

    // Upsert to database (insert or update if exists)
    const { data, error } = await supabase
      .from('pickup_mtaani_points')
      .upsert(pointsToInsert, { 
        onConflict: 'shop_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) throw error;

    console.log(`✅ Successfully synced ${data.length} pickup points to database`);
    return { success: true, count: data.length, points: data };

  } catch (error) {
    console.error('❌ Error syncing pickup points:', error.response?.data || error.message);
    return { success: false, error: error.message };
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
 * NOTE: PickUp Mtaani API doesn't provide pricing endpoint, so we use zone-based pricing
 */
export const calculateDeliveryFee = async (originTown, destinationTown) => {
  try {
    // Normalize town names
    const origin = originTown.toLowerCase().trim();
    const destination = destinationTown.toLowerCase().trim();

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

    const payload = {
      sender_name: senderName,
      sender_phone: senderPhone,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      origin_shop_id: originShopId,
      destination_shop_id: destinationShopId,
      item_description: itemDescription || 'UniHive Order',
      item_value: itemValue,
      payment_method: paymentMethod,
      reference_number: orderNumber
    };

    console.log('📦 Creating parcel with PickUp Mtaani:', payload);

    const response = await pickupMtaaniAPI.post('/parcels', payload);
    const parcelInfo = response.data.data || response.data;

    console.log('✅ Parcel created successfully:', parcelInfo);

    return {
      success: true,
      trackingCode: parcelInfo.tracking_code || parcelInfo.code,
      parcelId: parcelInfo.id,
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
 */
export const trackParcel = async (trackingCode) => {
  try {
    const response = await pickupMtaaniAPI.get(`/parcels/${trackingCode}`);
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