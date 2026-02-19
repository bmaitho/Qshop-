// src/utils/pickupMtaaniHelper.js
// Helper functions for PickUp Mtaani integration

import { supabase } from '../components/SupabaseClient';

const backendUrl = import.meta.env.VITE_API_URL;

/**
 * Create a PickUp Mtaani parcel after successful payment
 * Called automatically when order is paid and delivery method is pickup_mtaani
 */
export const createPickupMtaaniParcel = async (orderId) => {
  try {
    console.log('🚚 Creating PickUp Mtaani parcel for order:', orderId);

    // 1. Fetch order details with delivery info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          products(name),
          seller:seller_id(full_name, phone_number, town)
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
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('profiles')
      .select('full_name, phone_number')
      .eq('id', order.buyer_id)
      .single();

    if (buyerError) throw buyerError;

    // 3. Get seller info from first order item
    const firstItem = order.order_items[0];
    const seller = firstItem.seller;

    // 4. Find seller's nearest PickUp Mtaani point (origin)
    // For now, we'll use the seller's town to find a pickup point
    const originResponse = await fetch(
      `${backendUrl}/pickup-mtaani/points/near/${encodeURIComponent(seller.town)}?limit=1`
    );
    const originData = await originResponse.json();

    if (!originData.success || !originData.points || originData.points.length === 0) {
      throw new Error(`No PickUp Mtaani point found near seller location: ${seller.town}`);
    }

    const originPoint = originData.points[0];

    // 5. Prepare parcel data matching PickUp Mtaani API format
    const itemDescriptions = order.order_items
      .map(item => `${item.quantity}x ${item.products.name}`)
      .join(', ');

    const parcelData = {
      businessId: 505, // TODO: This should be your actual PickUp Mtaani business ID
      orderNumber: order.id.substring(0, 8).toUpperCase(),
      senderAgentId: originPoint.shop_id, // Sender agent ID (seller's nearest point)
      receiverAgentId: order.pickup_mtaani_destination_id, // Buyer's selected point
      packageValue: Math.round(order.amount), // Total order value
      customerName: buyerProfile.full_name || 'UniHive Buyer',
      packageName: itemDescriptions.substring(0, 100), // Description (max 100 chars)
      customerPhoneNumber: (buyerProfile.phone_number || order.phone_number).replace(/\+/g, ''), // Remove + prefix if present
      paymentOption: 'Vendor', // Vendor has already been paid via M-Pesa
      onDeliveryBalance: 0, // No balance to collect (already paid)
      paymentNumber: order.id.substring(0, 8).toUpperCase() // Reference number
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

    // Note: The backend already updates the order with tracking info
    // So we don't need to do it again here

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