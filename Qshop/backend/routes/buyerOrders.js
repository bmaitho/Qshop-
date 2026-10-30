// backend/routes/buyerOrders.js
import express from 'express';
import {
  getBuyerOrders,
  confirmOrderDelivery,
  updateOrderRating,
  getSellerRatings
} from '../controllers/buyerOrderController.js';
import { verifyAuth } from '../middleware/authMiddleware.js';
import { calculateDeliveryFee } from '../services/pickupMtaaniService.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// Set delivery for an unpaid order and recompute its total server-side:
// item subtotals come from order_items (priced by create_my_order) and the
// PickUp Mtaani fee is calculated here, never taken from the browser.
router.post('/checkout/:orderId/delivery', verifyAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryMethod, destinationId, phoneNumber } = req.body;

    const { data: order } = await supabase.from('orders')
      .select('id, user_id, payment_status').eq('id', orderId).maybeSingle();
    if (!order || order.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (order.payment_status !== 'pending') {
      return res.status(409).json({ success: false, error: 'This order can no longer be changed' });
    }

    const { data: items } = await supabase.from('order_items')
      .select('subtotal, seller_id').eq('order_id', orderId);
    if (!items?.length) {
      return res.status(400).json({ success: false, error: 'This order has no items' });
    }
    const subtotal = items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);

    const update = {
      delivery_method: deliveryMethod,
      delivery_option: deliveryMethod,
      delivery_fee: 0,
      phone_number: phoneNumber || null,
      pickup_mtaani_destination_id: null,
      pickup_mtaani_destination_name: null,
      pickup_mtaani_destination_address: null,
      pickup_mtaani_destination_town: null,
      pickup_mtaani_business_id: null,
      updated_at: new Date().toISOString(),
    };

    if (deliveryMethod === 'pickup_mtaani') {
      const { data: point } = await supabase.from('pickup_mtaani_points')
        .select('shop_id, shop_name, street_address, town')
        .eq('shop_id', destinationId).eq('is_active', true).maybeSingle();
      if (!point) {
        return res.status(400).json({ success: false, error: 'Choose a PickUp Mtaani point' });
      }
      // Same origin rule the checkout page used: the first seller's campus town.
      const { data: seller } = await supabase.from('profiles')
        .select('campus_location').eq('id', items[0].seller_id).maybeSingle();
      const fee = await calculateDeliveryFee(seller?.campus_location || 'Nairobi', point.town);
      update.delivery_fee = Math.ceil(Number(fee?.fee) || 200);
      update.pickup_mtaani_destination_id = point.shop_id;
      update.pickup_mtaani_destination_name = point.shop_name;
      update.pickup_mtaani_destination_address = point.street_address;
      update.pickup_mtaani_destination_town = point.town;
      if (subtotal + update.delivery_fee < 200) {
        return res.status(400).json({ success: false, error: 'Minimum order value for PickUp Mtaani delivery is KES 200' });
      }
    } else if (deliveryMethod !== 'campus_pickup') {
      return res.status(400).json({ success: false, error: 'Choose a delivery method' });
    }

    update.amount = subtotal + update.delivery_fee;
    const { error } = await supabase.from('orders').update(update).eq('id', orderId);
    if (error) throw error;

    return res.json({ success: true, amount: update.amount, deliveryFee: update.delivery_fee });
  } catch (error) {
    console.error('Error setting order delivery:', error);
    return res.status(500).json({ success: false, error: 'Could not update delivery' });
  }
});

// Get buyer's order history
router.get('/', getBuyerOrders);

// Confirm order delivery and trigger payment
router.post('/:orderItemId/confirm', confirmOrderDelivery);

// Update order rating
router.put('/:orderItemId/rating', updateOrderRating);

// Get seller's ratings and reviews
router.get('/seller/:sellerId/ratings', getSellerRatings);

export default router;