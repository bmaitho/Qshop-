// src/utils/orderUtils.js
import { supabase } from '../components/SupabaseClient';
import { toastSuccess, toastError } from './toastConfig';

/**
 * Updates the status of an order item
 * @param {string} orderItemId - The ID of the order item to update
 * @param {string} newStatus - The new status (processing, shipped, delivered, cancelled)
 * @returns {Promise<boolean>} - Whether the update was successful
 */
export const updateOrderStatus = async (orderItemId, newStatus) => {
  try {
    // Update the order_items table with the new status
    const { error } = await supabase
      .from('order_items')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderItemId);

    if (error) throw error;
    
    // Show success message
    toastSuccess(`Order ${newStatus} successfully`);
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    toastError("Failed to update order status");
    return false;
  }
};