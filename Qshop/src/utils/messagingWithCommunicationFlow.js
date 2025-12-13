// src/utils/messagingWithCommunicationFlow.js
// Enhanced messaging system with automatic communication workflow detection
// SIMPLIFIED: Any buyer response = buyer agreed (no keyword matching)

import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';

/**
 * Sends a message with automatic communication flow tracking
 * This is the main function to use for all order-related messaging
 * 
 * AUTOMATIC DETECTION:
 * - When seller sends first message → buyer_contacted = true
 * - When buyer sends ANY response → buyer_agreed = true
 */
export const sendOrderMessage = async ({
  senderId,
  recipientId,
  orderItemId,
  messageText,
  productId = null,
  orderId = null
}) => {
  try {
    if (!senderId || !recipientId || !messageText || !orderItemId) {
      throw new Error('Missing required fields for message');
    }

    // Get sender and recipient profiles
    const [senderProfile, recipientProfile] = await Promise.all([
      fetchUserProfile(senderId),
      fetchUserProfile(recipientId)
    ]);

    const senderName = senderProfile?.full_name || senderProfile?.email || 'Unknown Sender';
    const recipientName = recipientProfile?.full_name || recipientProfile?.email || 'Unknown Recipient';

    // Create the message with order_item_id
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert([{
        sender_id: senderId,
        recipient_id: recipientId,
        product_id: productId,
        order_id: orderId,
        order_item_id: orderItemId,
        message: messageText,
        sender_name: senderName,
        recipient_name: recipientName,
        read: false
      }])
      .select()
      .single();

    if (messageError) throw messageError;

    // Get order item details to determine roles
    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select('*, orders(user_id)')
      .eq('id', orderItemId)
      .single();

    if (orderItemError) throw orderItemError;

    const buyerId = orderItem.orders.user_id;
    const sellerId = orderItem.seller_id;
    const isSeller = senderId === sellerId;
    const isBuyer = senderId === buyerId;

    // AUTOMATIC DETECTION LOGIC - SIMPLE VERSION
    if (isSeller && !orderItem.buyer_contacted) {
      // Seller's first message - mark buyer as contacted
      await supabase
        .from('order_items')
        .update({ buyer_contacted: true })
        .eq('id', orderItemId);
      
      console.log('✅ Buyer contacted - seller sent first message');
      toast.info('Message sent to buyer');
    }

    if (isBuyer && orderItem.buyer_contacted && !orderItem.buyer_agreed) {
      // Buyer responding to seller - ANY response means agreed
      await supabase
        .from('order_items')
        .update({ buyer_agreed: true })
        .eq('id', orderItemId);
      
      console.log('✅ Buyer agreed - buyer responded to seller');
      toast.success('Your response has been sent. Seller can now proceed with shipping.');
    }

    return { success: true, message: newMessage };

  } catch (error) {
    console.error('Error sending order message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch user profile with fallback
 */
async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

/**
 * Check if seller can mark order as shipped
 */
export const canMarkAsShipped = (orderItem) => {
  return orderItem?.buyer_contacted === true && orderItem?.buyer_agreed === true;
};

/**
 * Get communication status for UI display
 */
export const getCommunicationStatus = (orderItem) => {
  if (!orderItem) {
    return {
      status: 'unknown',
      label: 'Unknown Status',
      color: 'gray',
      emoji: '⚪',
      canShip: false
    };
  }

  if (!orderItem.buyer_contacted) {
    return {
      status: 'need_contact',
      label: 'Need to Contact Buyer',
      color: 'red',
      emoji: '🔴',
      canShip: false,
      message: 'You must contact the buyer before shipping'
    };
  }

  if (orderItem.buyer_contacted && !orderItem.buyer_agreed) {
    return {
      status: 'waiting_response',
      label: 'Waiting for Buyer Response',
      color: 'yellow',
      emoji: '🟡',
      canShip: false,
      message: 'Buyer needs to respond to proceed'
    };
  }

  if (orderItem.buyer_contacted && orderItem.buyer_agreed) {
    return {
      status: 'ready_to_ship',
      label: 'Ready to Ship',
      color: 'green',
      emoji: '🟢',
      canShip: true,
      message: 'You can now mark this order as shipped'
    };
  }

  return {
    status: 'unknown',
    label: 'Unknown Status',
    color: 'gray',
    emoji: '⚪',
    canShip: false
  };
};

/**
 * Manual override to mark buyer as agreed (for admin/testing)
 */
export const manuallyMarkBuyerAgreed = async (orderItemId) => {
  try {
    const { error } = await supabase
      .from('order_items')
      .update({ buyer_agreed: true })
      .eq('id', orderItemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error manually marking buyer as agreed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset communication status (for testing)
 */
export const resetCommunicationStatus = async (orderItemId) => {
  try {
    const { error } = await supabase
      .from('order_items')
      .update({ 
        buyer_contacted: false,
        buyer_agreed: false 
      })
      .eq('id', orderItemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error resetting communication status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get order statistics for seller dashboard
 */
export const getOrderCommunicationStats = async (sellerId) => {
  try {
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('seller_id', sellerId)
      .in('status', ['pending', 'shipped']);

    if (error) throw error;

    const stats = {
      needContact: orderItems.filter(item => !item.buyer_contacted).length,
      waitingResponse: orderItems.filter(item => item.buyer_contacted && !item.buyer_agreed).length,
      readyToShip: orderItems.filter(item => item.buyer_contacted && item.buyer_agreed && item.status === 'pending').length,
      total: orderItems.length
    };

    return { success: true, stats };
  } catch (error) {
    console.error('Error getting communication stats:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendOrderMessage,
  canMarkAsShipped,
  getCommunicationStatus,
  manuallyMarkBuyerAgreed,
  resetCommunicationStatus,
  getOrderCommunicationStats
};