// src/utils/pickupMtaaniHelper.js
// ✅ FIXED: Uses coordinate-based nearest-origin endpoint instead of text town search
// ✅ FIXED: Explicit FK relationship hint for order_items
// ✅ FIXED: profiles column names (phone not phone_number, no town column)
// ✅ NEW: Saves origin point name/address so seller knows where to drop off
// ✅ NEW: Sends email to seller with drop-off instructions + buyer confirmation

import { supabase } from '../components/SupabaseClient';

const backendUrl = import.meta.env.VITE_API_URL;

/**
 * Create a PickUp Mtaani parcel after successful payment
 */
export const createPickupMtaaniParcel = async (orderId) => {
  try {
    console.log('🚚 Creating PickUp Mtaani parcel for order:', orderId);

    // 1. Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items!fk_order_items_order_id(
          *,
          products(id, name, image_url),
          seller:seller_id(id, full_name, phone, email, campus_location)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    if (order.delivery_method !== 'pickup_mtaani') {
      console.log('✓ Not PickUp Mtaani delivery, skipping');
      return { success: true, skipped: true };
    }
    if (order.pickup_mtaani_tracking_code) {
      console.log('✓ Already has tracking code, skipping');
      return { success: true, skipped: true, trackingCode: order.pickup_mtaani_tracking_code };
    }
    if (!order.pickup_mtaani_destination_id) {
      throw new Error('No pickup point selected for PickUp Mtaani delivery');
    }

    // 2. Get buyer info
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', order.user_id)
      .single();
    if (buyerError) throw buyerError;

    // 3. Get seller info
    const firstItem = order.order_items[0];
    const seller = firstItem?.seller;
    if (!seller) throw new Error('Could not find seller information');

    // 4. ✅ FIXED: Use smart coordinate-based nearest-origin endpoint
    const productId = firstItem.products?.id || firstItem.product_id;
    const originResponse = await fetch(
      `${backendUrl}/pickup-mtaani/nearest-origin/${seller.id}?productId=${productId}&limit=1`
    );
    const originData = await originResponse.json();

    if (!originData.success || !originData.points || originData.points.length === 0) {
      throw new Error('No PickUp Mtaani agent found near seller location');
    }

    const originPoint = originData.points[0];
    console.log(`📍 Origin: "${originPoint.shop_name}" (${originPoint.distance_km}km, source: ${originData.locationSource})`);

    // 5. Prepare parcel data
    const itemDescriptions = order.order_items
      .map(item => `${item.quantity}x ${item.products.name}`)
      .join(', ');

    const customerPhone = (buyerProfile.phone || order.phone_number || '')
      .replace(/\+/g, '').replace(/^0/, '254');

    const parcelData = {
      orderId: order.id,
      businessId: 77680,
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

    // 6. Create parcel via backend
    const response = await fetch(`${backendUrl}/pickup-mtaani/create-parcel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parcelData)
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create parcel');

    console.log('✅ Parcel created:', result.trackingCode);

    // 7. Save origin details to order
    await supabase
      .from('orders')
      .update({
        pickup_mtaani_tracking_code: result.trackingCode,
        pickup_mtaani_parcel_id: result.parcelId || result.packageId,
        pickup_mtaani_origin_id: originPoint.shop_id,
        pickup_mtaani_origin_name: originPoint.shop_name,
        pickup_mtaani_origin_address: originPoint.street_address || originPoint.town,
        pickup_mtaani_status: 'pending_pickup',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // 8. Send emails
    await sendPickupMtaaniEmails({
      order, orderItems: order.order_items, seller, buyerProfile,
      originPoint, trackingCode: result.trackingCode, itemDescriptions
    });

    return {
      success: true,
      trackingCode: result.trackingCode,
      parcelId: result.parcelId,
      originPoint: originPoint.shop_name,
      destinationPoint: order.pickup_mtaani_destination_name
    };

  } catch (error) {
    console.error('❌ Error creating PickUp Mtaani parcel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send PickUp Mtaani emails to all sellers and the buyer
 */
const sendPickupMtaaniEmails = async ({ order, orderItems, seller, buyerProfile, originPoint, trackingCode, itemDescriptions }) => {
  try {
    const sellerMap = new Map();
    for (const item of orderItems) {
      if (item.seller?.id && item.seller?.email) {
        if (!sellerMap.has(item.seller.id)) {
          sellerMap.set(item.seller.id, { ...item.seller, items: [] });
        }
        sellerMap.get(item.seller.id).items.push(item);
      }
    }

    for (const [sellerId, sellerData] of sellerMap) {
      try {
        const sellerItems = sellerData.items.map(i =>
          `${i.quantity}x ${i.products?.name || 'Product'}`
        ).join(', ');

        await fetch(`${backendUrl}/email/pickup-mtaani-seller-dropoff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sellerEmail: sellerData.email,
            sellerName: sellerData.full_name || 'Seller',
            orderId: order.id,
            orderItemIds: sellerData.items.map(i => i.id),
            items: sellerItems,
            trackingCode,
            dropoffPointName: originPoint.shop_name,
            dropoffPointAddress: originPoint.street_address || originPoint.town || '',
            dropoffPointPhone: originPoint.phone_number || '',
            buyerName: buyerProfile.full_name || 'Customer',
            destinationPointName: order.pickup_mtaani_destination_name || '',
            destinationTown: order.pickup_mtaani_destination_town || ''
          })
        });
        console.log(`✅ Drop-off email → ${sellerData.email}`);
      } catch (e) {
        console.error(`⚠️ Drop-off email failed for seller ${sellerId}:`, e);
      }
    }

    if (buyerProfile.email) {
      try {
        await fetch(`${backendUrl}/email/pickup-mtaani-buyer-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyerEmail: buyerProfile.email,
            buyerName: buyerProfile.full_name || 'Customer',
            orderId: order.id,
            items: itemDescriptions,
            trackingCode,
            pickupPointName: order.pickup_mtaani_destination_name || '',
            pickupPointAddress: order.pickup_mtaani_destination_address || '',
            pickupPointTown: order.pickup_mtaani_destination_town || '',
            totalAmount: order.amount
          })
        });
        console.log(`✅ Buyer confirmation email → ${buyerProfile.email}`);
      } catch (e) {
        console.error(`⚠️ Buyer email failed:`, e);
      }
    }
  } catch (error) {
    console.error('❌ Error sending PickUp Mtaani emails:', error);
  }
};

export const trackPickupMtaaniParcel = async (trackingCode) => {
  try {
    const response = await fetch(`${backendUrl}/pickup-mtaani/track/${trackingCode}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to track parcel');
    return { success: true, status: data.status, parcelData: data.parcelData };
  } catch (error) {
    console.error('Error tracking parcel:', error);
    return { success: false, error: error.message };
  }
};

export const getOrderTrackingInfo = async (orderId) => {
  try {
    const response = await fetch(`${backendUrl}/pickup-mtaani/order/${orderId}/tracking`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'No tracking info available');
    return { success: true, trackingCode: data.trackingCode, status: data.status, parcelData: data.parcelData };
  } catch (error) {
    console.error('Error getting tracking info:', error);
    return { success: false, error: error.message };
  }
};

export default { createPickupMtaaniParcel, trackPickupMtaaniParcel, getOrderTrackingInfo };