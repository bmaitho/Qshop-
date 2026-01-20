// backend/controllers/buyerOrderController.js
import { supabase } from '../supabaseClient.js';
import { processSellerPayment } from './mpesaB2CController.js';

/**
 * Get buyer's order history
 */
export const getBuyerOrders = async (req, res) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    const buyerId = user.id;
    const { status } = req.query;
    
    // Build query
    let query = supabase
      .from('order_items')
      .select(`
        *,
        products(*),
        orders!fk_order_items_order_id(*),
        profiles:seller_id(
          id,
          full_name,
          email,
          phone,
          campus_location
        )
      `)
      .eq('buyer_user_id', buyerId);
    
    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching buyer orders:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch orders' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getBuyerOrders:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Confirm order delivery and optionally rate the seller
 * This triggers payment to the seller
 */
export const confirmOrderDelivery = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    const { rating, review } = req.body;
    
    if (!orderItemId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order item ID is required' 
      });
    }
    
    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    // Fetch order item to verify ownership and status
    const { data: orderItem, error: fetchError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', orderItemId)
      .single();
    
    if (fetchError || !orderItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    // Verify the buyer owns this order
    if (orderItem.buyer_user_id !== user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to confirm this order' 
      });
    }
    
    // Verify order is marked as delivered by seller
    if (orderItem.status !== 'delivered') {
      return res.status(400).json({ 
        success: false, 
        error: 'Order must be marked as delivered by seller first' 
      });
    }
    
    // Check if already confirmed
    if (orderItem.buyer_confirmed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order already confirmed' 
      });
    }
    
    // Update order item with confirmation and rating
    const updateData = {
      buyer_confirmed: true,
      buyer_confirmed_at: new Date().toISOString()
    };
    
    if (rating) {
      updateData.buyer_rating = rating;
    }
    
    if (review) {
      updateData.buyer_review = review;
    }
    
    const { data: updatedItem, error: updateError } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', orderItemId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error confirming delivery:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to confirm delivery' 
      });
    }
    
    // ✅ TRIGGER PAYMENT TO SELLER NOW THAT BUYER HAS CONFIRMED
    console.log(`Buyer confirmed order ${orderItemId}. Triggering seller payment...`);
    
    let paymentResult = null;
    try {
      paymentResult = await processSellerPayment(orderItemId);
      console.log('Payment result after buyer confirmation:', paymentResult);
    } catch (paymentError) {
      console.error('Error processing seller payment:', paymentError);
      // Don't fail the confirmation if payment fails - we can retry payment later
      paymentResult = { 
        success: false, 
        error: paymentError.message || 'Failed to process payment',
        note: 'Delivery confirmed but payment processing failed. Will be retried automatically.'
      };
    }
    
    return res.status(200).json({
      success: true,
      message: 'Order delivery confirmed successfully',
      data: updatedItem,
      paymentResult
    });
  } catch (error) {
    console.error('Error in confirmOrderDelivery:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Update rating for a confirmed order
 */
export const updateOrderRating = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    const { rating, review } = req.body;
    
    if (!orderItemId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order item ID is required' 
      });
    }
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    // Fetch order item to verify ownership
    const { data: orderItem, error: fetchError } = await supabase
      .from('order_items')
      .select('buyer_user_id, buyer_confirmed')
      .eq('id', orderItemId)
      .single();
    
    if (fetchError || !orderItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    // Verify ownership
    if (orderItem.buyer_user_id !== user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to rate this order' 
      });
    }
    
    // Verify order is confirmed
    if (!orderItem.buyer_confirmed) {
      return res.status(400).json({ 
        success: false, 
        error: 'You must confirm delivery before rating' 
      });
    }
    
    // Update rating
    const updateData = { buyer_rating: rating };
    if (review !== undefined) {
      updateData.buyer_review = review;
    }
    
    const { data, error: updateError } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', orderItemId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating rating:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update rating' 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Rating updated successfully',
      data
    });
  } catch (error) {
    console.error('Error in updateOrderRating:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Get seller's ratings and reviews
 */
export const getSellerRatings = async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    if (!sellerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Seller ID is required' 
      });
    }
    
    // Fetch all rated orders for this seller
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id,
        buyer_rating,
        buyer_review,
        buyer_confirmed_at,
        products(name, images),
        profiles:buyer_user_id(full_name)
      `)
      .eq('seller_id', sellerId)
      .not('buyer_rating', 'is', null)
      .order('buyer_confirmed_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching seller ratings:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch ratings' 
      });
    }
    
    // Calculate average rating
    const ratings = data.map(item => item.buyer_rating);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;
    
    // Count by star rating
    const ratingCounts = {
      5: ratings.filter(r => r === 5).length,
      4: ratings.filter(r => r === 4).length,
      3: ratings.filter(r => r === 3).length,
      2: ratings.filter(r => r === 2).length,
      1: ratings.filter(r => r === 1).length
    };
    
    return res.status(200).json({
      success: true,
      data: {
        reviews: data,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: ratings.length,
        ratingCounts
      }
    });
  } catch (error) {
    console.error('Error in getSellerRatings:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};