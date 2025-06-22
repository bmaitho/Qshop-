// backend/services/disbursementService.js
import { supabase } from '../supabaseClient.js';
import { processSellerPayment } from '../controllers/mpesaB2CController.js';

/**
 * Process automatic payments to sellers for delivered orders
 */
export const processAutomaticPayments = async () => {
  try {
    console.log('Starting automatic payment processing...');
    
    // Find order items that are delivered but not yet paid to sellers
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        seller_id,
        status,
        payment_status,
        subtotal
      `)
      .eq('status', 'delivered')
      .in('payment_status', ['pending', null])
      .order('created_at', { ascending: true });
      
    if (error) {
      throw new Error(`Error fetching unpaid delivered orders: ${error.message}`);
    }
    
    console.log(`Found ${data.length} delivered orders ready for seller payment`);
    
    // Process each order item
    const results = [];
    
    for (const orderItem of data) {
      try {
        console.log(`Processing payment for order item: ${orderItem.id}`);
        
        // Process payment for this order item
        const result = await processSellerPayment(orderItem.id);
        
        results.push({
          orderItemId: orderItem.id,
          success: result.success,
          message: result.message || result.error || 'Processed'
        });
        
        // Add a small delay between requests to avoid overwhelming the M-Pesa API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (itemError) {
        console.error(`Error processing payment for order item ${orderItem.id}:`, itemError);
        
        results.push({
          orderItemId: orderItem.id,
          success: false,
          message: itemError.message || 'Internal error'
        });
      }
    }
    
    return {
      totalProcessed: data.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
  } catch (error) {
    console.error('Error in automatic payment processing:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Trigger payment to seller for a specific order item
 */
export const paySellerForOrderItem = async (orderItemId) => {
  try {
    if (!orderItemId) {
      throw new Error('Order item ID is required');
    }
    
    return await processSellerPayment(orderItemId);
  } catch (error) {
    console.error(`Error processing payment for order item ${orderItemId}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to process payment'
    };
  }
};

/**
 * Retry failed payments
 */
export const retryFailedPayments = async () => {
  try {
    // Find failed payments
    const { data, error } = await supabase
      .from('seller_payments')
      .select(`
        id,
        order_item_id,
        status,
        result_description,
        created_at
      `)
      .eq('status', 'failed')
      .order('created_at', { ascending: true });
      
    if (error) {
      throw new Error(`Error fetching failed payments: ${error.message}`);
    }
    
    console.log(`Found ${data.length} failed payments to retry`);
    
    // Process each failed payment
    const results = [];
    
    for (const payment of data) {
      try {
        // Check if the payment is not too old (within last 7 days)
        const paymentDate = new Date(payment.created_at);
        const now = new Date();
        const daysDifference = (now - paymentDate) / (1000 * 60 * 60 * 24);
        
        if (daysDifference > 7) {
          console.log(`Payment ${payment.id} is too old to retry (${daysDifference.toFixed(1)} days old)`);
          results.push({
            paymentId: payment.id,
            orderItemId: payment.order_item_id,
            success: false,
            message: 'Payment too old to retry automatically'
          });
          continue;
        }
        
        // Process payment for this order item
        console.log(`Retrying payment for order item: ${payment.order_item_id}`);
        const result = await processSellerPayment(payment.order_item_id);
        
        results.push({
          paymentId: payment.id,
          orderItemId: payment.order_item_id,
          success: result.success,
          message: result.message || result.error || 'Retry processed'
        });
        
        // Add a small delay between requests to avoid overwhelming the M-Pesa API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (itemError) {
        console.error(`Error retrying payment ${payment.id}:`, itemError);
        
        results.push({
          paymentId: payment.id,
          orderItemId: payment.order_item_id,
          success: false,
          message: itemError.message || 'Internal error'
        });
      }
    }
    
    return {
      totalRetried: data.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
  } catch (error) {
    console.error('Error in retrying failed payments:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate disbursement reports
 */
export const generateDisbursementReport = async (startDate, endDate) => {
  try {
    // Format dates for database query
    const formattedStartDate = startDate ? new Date(startDate).toISOString() : new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
    const formattedEndDate = endDate ? new Date(endDate).toISOString() : new Date().toISOString();
    
    // Get all payments in the date range
    const { data, error } = await supabase
      .from('seller_payments')
      .select(`
        *,
        profiles:seller_id (
          id,
          full_name,
          email,
          phone
        )
      `)
      .gte('created_at', formattedStartDate)
      .lte('created_at', formattedEndDate)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(`Error fetching payment data: ${error.message}`);
    }
    
    // Calculate statistics
    const totalPayments = data.length;
    const successfulPayments = data.filter(p => p.status === 'completed').length;
    const failedPayments = data.filter(p => p.status === 'failed').length;
    const pendingPayments = data.filter(p => p.status === 'initiated' || p.status === 'processing').length;
    
    const totalAmount = data.reduce((sum, payment) => {
      return payment.status === 'completed' ? sum + payment.amount : sum;
    }, 0);
    
    // Group by seller
    const sellerSummary = {};
    
    data.forEach(payment => {
      if (payment.status === 'completed') {
        const sellerId = payment.seller_id;
        const sellerName = payment.profiles?.full_name || 'Unknown Seller';
        
        if (!sellerSummary[sellerId]) {
          sellerSummary[sellerId] = {
            sellerId,
            sellerName,
            email: payment.profiles?.email,
            phone: payment.profiles?.phone,
            paymentCount: 0,
            totalAmount: 0
          };
        }
        
        sellerSummary[sellerId].paymentCount += 1;
        sellerSummary[sellerId].totalAmount += payment.amount;
      }
    });
    
    return {
      period: {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      },
      summary: {
        totalPayments,
        successfulPayments,
        failedPayments,
        pendingPayments,
        totalAmount
      },
      sellers: Object.values(sellerSummary),
      payments: data
    };
  } catch (error) {
    console.error('Error generating disbursement report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};