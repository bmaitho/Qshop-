// src/utils/pickupMtaaniHelper.js
// ✅ V2: Multi-seller parcel splitting
// Creates one PickUp Mtaani parcel PER SELLER for multi-shop orders
// Tracking codes stored on order_items level (per-seller)
// Order-level tracking_code kept for backward compat (first seller's code)

import { supabase } from '../components/SupabaseClient';

const backendUrl = import.meta.env.VITE_API_URL;

/**
 * Group order items by seller_id
 */
const groupItemsBySeller = (orderItems) => {
  const groups = new Map();
  for (const item of orderItems) {
    const sellerId = item.seller_id || item.seller?.id;
    if (!sellerId) continue;
    if (!groups.has(sellerId)) {
      groups.set(sellerId, {
        sellerId,
        seller: item.seller,
        items: []
      });
    }
    groups.get(sellerId).items.push(item);
  }
  return Array.from(groups.values());
};

/**
 * Create PickUp Mtaani parcels after successful payment.
 * Creates ONE parcel per seller for multi-shop orders.
 */
export const createPickupMtaaniParcel = async (orderId) => {
  try {
    console.log('🚚 Creating PickUp Mtaani parcel(s) for order:', orderId);

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
      console.log('✓ Already has tracking code on order, skipping');
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

    // 3. Group items by seller
    const sellerGroups = groupItemsBySeller(order.order_items);
    console.log(`📦 Order has ${sellerGroups.length} seller(s): ${sellerGroups.map(g => g.seller?.full_name || g.sellerId).join(', ')}`);

    const results = [];
    let firstTrackingCode = null;
    let firstOriginPoint = null;

    // 4. Create one parcel per seller
    for (const group of sellerGroups) {
      try {
        const { seller, items } = group;
        if (!seller) {
          console.error(`⚠️ No seller info for group ${group.sellerId}, skipping`);
          continue;
        }

        // Check if items already have tracking codes (retry safety)
        const alreadyTracked = items.some(i => i.pickup_mtaani_tracking_code);
        if (alreadyTracked) {
          console.log(`✓ Seller ${seller.full_name} items already have tracking, skipping`);
          continue;
        }

        // 4a. Find nearest origin point for this seller
        const productId = items[0]?.products?.id || items[0]?.product_id;
        const originResponse = await fetch(
          `${backendUrl}/pickup-mtaani/nearest-origin/${seller.id}?productId=${productId}&limit=1`
        );
        const originData = await originResponse.json();

        if (!originData.success || !originData.points || originData.points.length === 0) {
          console.error(`⚠️ No origin point found for seller ${seller.full_name}`);
          results.push({ sellerId: seller.id, success: false, error: 'No origin point found' });
          continue;
        }

        const originPoint = originData.points[0];
        console.log(`📍 Seller "${seller.full_name}" → Origin: "${originPoint.shop_name}" (${originPoint.distance_km}km)`);

        // 4b. Prepare parcel data — includes sellerId + itemIds for backend
        const itemDescriptions = items
          .map(item => `${item.quantity}x ${item.products?.name || 'Product'}`)
          .join(', ');

        const sellerSubtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);

        const customerPhone = (buyerProfile.phone || order.phone_number || '')
          .replace(/\+/g, '').replace(/^0/, '254');

        const itemIds = items.map(i => i.id);

        const parcelData = {
          orderId: order.id,
          businessId: 77680,
          orderNumber: `${order.id.substring(0, 6)}-${seller.id.substring(0, 2)}`.toUpperCase(),
          senderAgentId: originPoint.shop_id,
          receiverAgentId: order.pickup_mtaani_destination_id,
          packageValue: Math.round(sellerSubtotal),
          customerName: buyerProfile.full_name || 'UniHive Buyer',
          packageName: itemDescriptions.substring(0, 100),
          customerPhoneNumber: customerPhone,
          paymentOption: 'vendor',
          onDeliveryBalance: 0,
          paymentNumber: `${order.id.substring(0, 6)}-${seller.id.substring(0, 2)}`.toUpperCase(),
          // per-seller tracking fields — backend handles the order_items update
          sellerId: seller.id,
          itemIds: itemIds
        };

        // 4c. Create parcel via backend (also updates order_items server-side)
        const response = await fetch(`${backendUrl}/pickup-mtaani/create-parcel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parcelData)
        });
        const result = await response.json();

        if (!result.success) {
          console.error(`⚠️ Parcel creation failed for seller ${seller.full_name}:`, result.error);
          results.push({ sellerId: seller.id, success: false, error: result.error });
          continue;
        }

        const trackingCode = result.trackingCode || result.packageId;
        const parcelId = result.parcelId || result.packageId;
        console.log(`✅ Parcel created for seller "${seller.full_name}": ${trackingCode}`);

        // Track the first seller's info for backward compat on orders table
        if (!firstTrackingCode) {
          firstTrackingCode = trackingCode;
          firstOriginPoint = originPoint;
        }

        // 4d. REMOVED — order_items update is handled server-side in /create-parcel

        // 4e. Send drop-off email to this seller
        try {
          await fetch(`${backendUrl}/email/pickup-mtaani-seller-dropoff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sellerEmail: seller.email,
              sellerName: seller.full_name || 'Seller',
              orderId: order.id,
              orderItemIds: itemIds,
              items: itemDescriptions,
              trackingCode,
              dropoffPointName: originPoint.shop_name,
              dropoffPointAddress: originPoint.street_address || originPoint.town || '',
              dropoffPointPhone: originPoint.phone_number || '',
              buyerName: buyerProfile.full_name || 'Customer',
              destinationPointName: order.pickup_mtaani_destination_name || '',
              destinationTown: order.pickup_mtaani_destination_town || ''
            })
          });
          console.log(`✅ Drop-off email → ${seller.email}`);
        } catch (e) {
          console.error(`⚠️ Drop-off email failed for seller ${seller.id}:`, e);
        }

        results.push({
          sellerId: seller.id,
          sellerName: seller.full_name,
          success: true,
          trackingCode,
          parcelId,
          originPoint: originPoint.shop_name
        });

      } catch (sellerError) {
        console.error(`⚠️ Error creating parcel for seller ${group.sellerId}:`, sellerError);
        results.push({ sellerId: group.sellerId, success: false, error: sellerError.message });
      }
    }

    // 5. Update order-level tracking (backward compat — use first seller's code)
    if (firstTrackingCode && firstOriginPoint) {
      await supabase
        .from('orders')
        .update({
          pickup_mtaani_tracking_code: firstTrackingCode,
          pickup_mtaani_parcel_id: results[0]?.parcelId || null,
          pickup_mtaani_origin_id: firstOriginPoint.shop_id,
          pickup_mtaani_origin_name: firstOriginPoint.shop_name,
          pickup_mtaani_origin_address: firstOriginPoint.street_address || firstOriginPoint.town,
          pickup_mtaani_status: 'pending_pickup',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    // 6. Send buyer confirmation email with all tracking codes
    if (buyerProfile.email) {
      const allTrackingCodes = results
        .filter(r => r.success && r.trackingCode)
        .map(r => `${r.sellerName || 'Seller'}: ${r.trackingCode}`)
        .join(' | ');

      const allItemDescriptions = order.order_items
        .map(item => `${item.quantity}x ${item.products?.name || 'Product'}`)
        .join(', ');

      try {
        await fetch(`${backendUrl}/email/pickup-mtaani-buyer-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyerEmail: buyerProfile.email,
            buyerName: buyerProfile.full_name || 'Customer',
            orderId: order.id,
            items: allItemDescriptions,
            trackingCode: allTrackingCodes,
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

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`🚚 Parcel creation complete: ${successCount} succeeded, ${failCount} failed out of ${sellerGroups.length} sellers`);

    return {
      success: successCount > 0,
      parcels: results,
      totalSellers: sellerGroups.length,
      successCount,
      failCount,
      // Backward compat fields
      trackingCode: firstTrackingCode,
      originPoint: firstOriginPoint?.shop_name,
      destinationPoint: order.pickup_mtaani_destination_name
    };

  } catch (error) {
    console.error('❌ Error creating PickUp Mtaani parcels:', error);
    return { success: false, error: error.message };
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