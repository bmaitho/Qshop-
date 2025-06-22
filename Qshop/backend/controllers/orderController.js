// backend/controllers/orderController.js
import { supabase } from '../supabaseClient.js';
import { processSellerPayment } from './mpesaB2CController.js';
import { processAutomaticPayments } from '../services/disbursementService.js';

/**
 * Update order item status - will trigger payment when marked as delivered
 */
export const updateOrderItemStatus = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    const { status } = req.body;
    
    if (!orderItemId || !status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order item ID and status are required' 
      });
    }
    
    // Validate the status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}` 
      });
    }
    
    // Update the order item status
    const { data, error } = await supabase
      .from('order_items')
      .update({ 
        status: status,
        ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {})
      })
      .eq('id', orderItemId)
      .select();
      
    if (error) {
      console.error('Error updating order item status:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update order item status' 
      });
    }
    
    // If marked as delivered, trigger payment to seller
    let paymentResult = null;
    if (status === 'delivered') {
      console.log(`Order item ${orderItemId} marked as delivered. Initiating payment to seller...`);
      
      try {
        // Check the settings to see if automatic payments are enabled
        const { data: settingsData, error: settingsError } = await supabase
          .from('system_settings')
          .select('settings')
          .eq('category', 'disbursement')
          .single();
          
        const autoPaymentsEnabled = settingsError ? true : (settingsData?.settings?.autoPaymentsEnabled ?? true);
        
        if (autoPaymentsEnabled) {
          paymentResult = await processSellerPayment(orderItemId);
          console.log('Payment result:', paymentResult);
        } else {
          console.log('Automatic payments are disabled. Skipping payment processing.');
          
          // Still update the payment status to pending
          await supabase
            .from('order_items')
            .update({ payment_status: 'pending' })
            .eq('id', orderItemId);
            
          paymentResult = { 
            success: true, 
            message: 'Payment queued for manual processing' 
          };
        }
      } catch (paymentError) {
        console.error('Error processing payment to seller:', paymentError);
        paymentResult = { 
          success: false, 
          error: paymentError.message || 'Failed to process payment' 
        };
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Order item status updated to ${status}`,
      data: data[0],
      paymentResult: paymentResult
    });
  } catch (error) {
    console.error('Error in updateOrderItemStatus:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Get order details with payment status
 */
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order ID is required' 
      });
    }
    
    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (orderError) {
      console.error('Error fetching order:', orderError);
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    // Fetch order items with payment status
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products(*),
        profiles:seller_id(*)
      `)
      .eq('order_id', orderId);
      
    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch order items' 
      });
    }
    
    // Fetch seller payments for this order
    const { data: payments, error: paymentsError } = await supabase
      .from('seller_payments')
      .select('*')
      .eq('order_id', orderId);
      
    if (paymentsError) {
      console.error('Error fetching seller payments:', paymentsError);
    }
    
    // Attach payments to their respective order items
    const itemsWithPayments = orderItems?.map(item => {
      const itemPayments = payments?.filter(p => p.order_item_id === item.id) || [];
      return {
        ...item,
        payments: itemPayments
      };
    }) || [];
    
    return res.status(200).json({
      success: true,
      data: {
        order,
        items: itemsWithPayments
      }
    });
  } catch (error) {
    console.error('Error in getOrderDetails:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Process all pending payments
 */
export const processPendingPayments = async (req, res) => {
  try {
    console.log('Processing pending payments...');
    
    const result = await processAutomaticPayments();
    
    return res.status(200).json({
      success: true,
      message: 'Payment processing completed',
      ...result
    });
  } catch (error) {
    console.error('Error in processPendingPayments:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Get seller's orders with payment status
 */
export const getSellerOrders = async (req, res) => {
  try {
    // Get the current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    const sellerId = user.id;
    
    // Query filter
    const { status } = req.query;
    
    // Build the query
    let query = supabase
      .from('order_items')
      .select(`
        *,
        orders(*),
        products(*)
      `)
      .eq('seller_id', sellerId);
      
    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Execute the query
    const { data, error } = await query.order('created_at', { foreignTable: 'orders', ascending: false });
    
    if (error) {
      console.error('Error fetching seller orders:', error);
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
    console.error('Error in getSellerOrders:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Get seller payment history
 */
export const getSellerPayments = async (req, res) => {
  try {
    // Get the current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    const sellerId = user.id;
    
    // Fetch payments for this seller
    const { data, error } = await supabase
      .from('seller_payments')
      .select(`
        *,
        order_items!seller_payments_order_item_id_fkey(
          *,
          products(*)
        )
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching seller payments:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch payments' 
      });
    }
    
    // Calculate totals
    const completedPayments = data.filter(p => p.status === 'completed');
    const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingPayments = data.filter(p => p.status === 'initiated' || p.status === 'processing');
    const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return res.status(200).json({
      success: true,
      data,
      summary: {
        totalPayments: data.length,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        failedPayments: data.filter(p => p.status === 'failed').length,
        totalPaid,
        totalPending
      }
    });
  } catch (error) {
    console.error('Error in getSellerPayments:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Get payment details for a single order item
 */
export const getOrderItemPayment = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    
    if (!orderItemId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order item ID is required' 
      });
    }
    
    // Fetch the order item
    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select(`
        *,
        products(*),
        orders(*),
        profiles:seller_id(*)
      `)
      .eq('id', orderItemId)
      .single();
      
    if (orderItemError) {
      console.error('Error fetching order item:', orderItemError);
      return res.status(404).json({ 
        success: false, 
        error: 'Order item not found' 
      });
    }
    
    // Fetch payment data
    const { data: payments, error: paymentsError } = await supabase
      .from('seller_payments')
      .select('*')
      .eq('order_item_id', orderItemId)
      .order('created_at', { ascending: false });
      
    if (paymentsError) {
      console.error('Error fetching payment data:', paymentsError);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        orderItem,
        payments: payments || []
      }
    });
  } catch (error) {
    console.error('Error in getOrderItemPayment:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Manually trigger payment for a specific order item
 */
export const triggerOrderItemPayment = async (req, res) => {
  try {
    const { orderItemId } = req.params;
    
    if (!orderItemId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order item ID is required' 
      });
    }
    
    console.log(`Manually triggering payment for order item: ${orderItemId}`);
    
    // Process the payment
    const result = await processSellerPayment(orderItemId);
    
    return res.status(200).json({
      success: result.success,
      message: result.success ? 'Payment processing initiated' : 'Payment processing failed',
      data: result
    });
  } catch (error) {
    console.error('Error in triggerOrderItemPayment:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export default {
  updateOrderItemStatus,
  getOrderDetails,
  processPendingPayments,
  getSellerOrders,
  getSellerPayments,
  getOrderItemPayment,
  triggerOrderItemPayment
};