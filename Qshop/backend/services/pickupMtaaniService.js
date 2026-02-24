// src/utils/pickupMtaaniHelper.js
// Helper functions for PickUp Mtaani integration
// ✅ FIXED: Explicit FK relationship hint for order_items
// ✅ FIXED: profiles column names (phone not phone_number, no town column)

import { supabase } from '../supabaseClient.js';

const backendUrl = process.env.VITE_API_URL || process.env.APP_URL;

/**
 * Create a PickUp Mtaani parcel after successful payment
 * Called automatically when order is paid and delivery method is pickup_mtaani
 */
export const createPickupMtaaniParcel = async (orderId) => {
  try {
    console.log('🚚 Creating PickUp Mtaani parcel for order:', orderId);

    // 1. Fetch order details with delivery info
    // ✅ FIX: Use explicit FK hint to avoid ambiguous relationship error
    // ✅ FIX: Use correct column names from profiles table (phone, campus_location — no town column)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items!fk_order_items_order_id(
          *,
          products(name),
          seller:seller_id(full_name, phone, campus_location)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Check if this order uses PickUp Mtaani delivery
    if (order.delivery_method !== 'pickup_mtaani') {
      console.log('✓ Order does not use PickUp Mtaani delivery, skipping parcel creation');
      return { success: true, skipped: true };
    }

    // Check if already has tracking code
    if (order.pickup_mtaani_tracking_code) {
      console.log('✓ Order already has tracking code, skipping parcel creation');
      return { success: true, skipped: true, trackingCode: order.pickup_mtaani_tracking_code };
    }

    // Validate required delivery info
    if (!order.pickup_mtaani_destination_id) {
      throw new Error('No pickup point selected for PickUp Mtaani delivery');
    }

    // 2. Get buyer info
    // ✅ FIX: Use correct column name 'phone' (not 'phone_number')
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.user_id)
      .single();

    if (buyerError) throw buyerError;

    // 3. Get seller info from first order item
    const firstItem = order.order_items[0];
    const seller = firstItem?.seller;

    if (!seller) {
      throw new Error('Could not find seller information for this order');
    }

    // 4. Find seller's nearest PickUp Mtaani point (origin)
    // ✅ FIX: Use campus_location instead of town (profiles has no town column)
    const sellerLocation = seller.campus_location || 'Nairobi';
    const originResponse = await fetch(
      `${backendUrl}/pickup-mtaani/points/near/${encodeURIComponent(sellerLocation)}?limit=1`
    );
    const originData = await originResponse.json();

    if (!originData.success || !originData.points || originData.points.length === 0) {
      throw new Error(`No PickUp Mtaani point found near seller location: ${sellerLocation}`);
    }

    const originPoint = originData.points[0];

    // 5. Prepare parcel data matching PickUp Mtaani API format
    const itemDescriptions = order.order_items
      .map(item => `${item.quantity}x ${item.products.name}`)
      .join(', ');

    // ✅ FIX: Use seller.phone (not seller.phone_number)
    const customerPhone = (buyerProfile.phone || order.phone_number || '')
      .replace(/\+/g, '')
      .replace(/^0/, '254');

    const parcelData = {
      businessId: 77680, // TODO: Replace with actual PickUp Mtaani business ID
      orderNumber: order.id.substring(0, 8).toUpperCase(),
      senderAgentId: originPoint.shop_id,
      receiverAgentId: order.pickup_mtaani_destination_id,
      packageValue: Math.round(order.amount),
      customerName: buyerProfile.full_name || 'UniHive Buyer',
      packageName: itemDescriptions.substring(0, 100),
      customerPhoneNumber: customerPhone,
      paymentOption: 'Vendor',
      onDeliveryBalance: 0,
      paymentNumber: order.id.substring(0, 8).toUpperCase()
    };

    console.log('📦 Parcel data:', parcelData);

    // 6. Create parcel via backend
    const response = await fetch(`${backendUrl}/pickup-mtaani/create-parcel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parcelData)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create parcel');
    }

    console.log('✅ Parcel created successfully:', result.trackingCode);

    return {
      success: true,
      trackingCode: result.trackingCode,
      parcelId: result.parcelId,
      originPoint: originPoint.shop_name,
      destinationPoint: order.pickup_mtaani_destination_name
    };

  } catch (error) {
    console.error('❌ Error creating PickUp Mtaani parcel:', error);
    
    // Don't throw error - just log it and return failure
    // The order is already paid, so we don't want to block the flow
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Track a PickUp Mtaani parcel
 */
export const trackPickupMtaaniParcel = async (trackingCode) => {
  try {
    const response = await fetch(`${backendUrl}/pickup-mtaani/track/${trackingCode}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to track parcel');
    }

    return {
      success: true,
      status: data.status,
      parcelData: data.parcelData
    };

  } catch (error) {
    console.error('Error tracking parcel:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get order tracking information
 */
export const getOrderTrackingInfo = async (orderId) => {
  try {
    const response = await fetch(`${backendUrl}/pickup-mtaani/order/${orderId}/tracking`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'No tracking information available');
    }

    return {
      success: true,
      trackingCode: data.trackingCode,
      status: data.status,
      parcelData: data.parcelData
    };

  } catch (error) {
    console.error('Error getting order tracking info:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  createPickupMtaaniParcel,
  trackPickupMtaaniParcel,
  getOrderTrackingInfo
};