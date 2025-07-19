// src/utils/buyerResponseHandler.js

import { supabase } from '../components/SupabaseClient';

/**
 * Handle buyer response to seller's shipping message
 * This function should be called when a buyer responds to any message
 * linked to an order_item_id
 */
export const handleBuyerResponse = async (messageData) => {
  try {
    const { sender_id, order_item_id, message } = messageData;
    
    // Only process if this message is linked to an order item
    if (!order_item_id) return;
    
    // Get the order item to check if this is a buyer response
    const { data: orderItem, error: orderError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', order_item_id)
      .single();
      
    if (orderError || !orderItem) {
      console.error('Error fetching order item:', orderError);
      return;
    }
    
    // Get the order to find the buyer ID
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('user_id')
      .eq('id', orderItem.order_id)
      .single();
      
    if (orderFetchError || !order) {
      console.error('Error fetching order:', orderFetchError);
      return;
    }
    
    // Check if the message sender is the buyer (not the seller)
    const isBuyerResponse = sender_id === order.user_id;
    const isSellerAlreadyContacted = orderItem.buyer_contacted;
    const isBuyerNotYetAgreed = !orderItem.buyer_agreed;
    
    // If this is a buyer response to a seller's shipping message
    if (isBuyerResponse && isSellerAlreadyContacted && isBuyerNotYetAgreed) {
      // Check if the message contains agreement keywords
      const agreementKeywords = [
        'yes', 'ok', 'okay', 'sure', 'agreed', 'agree', 'confirm', 'confirmed',
        'sounds good', 'perfect', 'works for me', 'that works', 'good',
        'fine', 'alright', 'accept', 'go ahead'
      ];
      
      const messageText = message.toLowerCase();
      const containsAgreement = agreementKeywords.some(keyword => 
        messageText.includes(keyword)
      );
      
      // Auto-agree if message contains agreement keywords
      if (containsAgreement) {
        const { error: updateError } = await supabase
          .from('order_items')
          .update({ 
            buyer_agreed: true,
            // Could add buyer_agreed_at timestamp if needed
          })
          .eq('id', order_item_id);
          
        if (updateError) {
          console.error('Error updating buyer agreement:', updateError);
        } else {
          console.log('Buyer agreement detected and recorded for order item:', order_item_id);
          
          // Could trigger a notification to the seller here
          // notifySeller(orderItem.seller_id, 'Buyer has agreed to shipping arrangements');
        }
      }
    }
  } catch (error) {
    console.error('Error in handleBuyerResponse:', error);
  }
};

/**
 * Updated message creation function that handles the communication flow
 */
export const createMessageWithFlow = async (messageData) => {
  try {
    const { 
      sender_id, 
      recipient_id, 
      product_id, 
      order_id, 
      order_item_id, 
      message, 
      sender_name, 
      recipient_name 
    } = messageData;
    
    // Create the message
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert([{
        sender_id,
        recipient_id,
        product_id,
        order_id,
        order_item_id,
        message,
        sender_name,
        recipient_name
      }])
      .select()
      .single();
      
    if (messageError) throw messageError;
    
    // Handle the communication flow if this is order-related
    if (order_item_id) {
      await handleBuyerResponse({
        sender_id,
        order_item_id,
        message
      });
    }
    
    return { success: true, message: newMessage };
  } catch (error) {
    console.error('Error creating message with flow:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Simple manual buyer agreement function (for testing or manual override)
 */
export const markBuyerAgreed = async (orderItemId) => {
  try {
    const { error } = await supabase
      .from('order_items')
      .update({ buyer_agreed: true })
      .eq('id', orderItemId);
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error marking buyer as agreed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset communication status (for testing or error recovery)
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