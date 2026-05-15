import axios from 'axios';
import dotenv from 'dotenv';
import { generateAccessToken, generateTimestamp, generatePassword } from '../utils/mpesaAuth.js';
import { supabase } from '../supabaseClient.js';

dotenv.config();

// Environment configuration
const isProduction = true; // Force production mode
const MPESA_API_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

// M-Pesa credentials from environment variables
const BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE;
const PASSKEY = process.env.MPESA_PASSKEY;
const CALLBACK_URL = process.env.VITE_MPESA_CALLBACK_URL;

// Validate required configuration
if (!BUSINESS_SHORT_CODE || !PASSKEY || !CALLBACK_URL) {
  throw new Error('Missing required M-Pesa configuration in environment variables');
}

/**
 * Initiates an STK push payment request to the user's phone
 */
export const initiateSTKPush = async (req, res) => {
  try {
    const { phoneNumber, amount, orderId, accountReference } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({ 
        error: 'Phone number and amount are required' 
      });
    }

    // Validate phone number format (should be 254XXXXXXXXX)
    const phoneRegex = /^254[17][0-9]{8}$/;
    const cleanedPhone = phoneNumber.toString().replace(/[^0-9]/g, '');
    const formattedPhone = cleanedPhone.startsWith('0') 
      ? `254${cleanedPhone.substring(1)}` 
      : cleanedPhone.startsWith('254') 
        ? cleanedPhone 
        : `254${cleanedPhone}`;
      
    if (!phoneRegex.test(formattedPhone)) {
      return res.status(400).json({
        error: 'Invalid phone number format. Use format: 254XXXXXXXXX'
      });
    }

    // Generate new access token - Must be fresh for each request
    console.log('Generating fresh access token for STK Push...');
    const accessToken = await generateAccessToken();
    console.log('Generated token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'FAILED TO GENERATE TOKEN');

    // Check token validity - must not be null or undefined
    if (!accessToken) {
      throw new Error('Failed to generate a valid access token');
    }

    // Generate timestamp and password
    const timestamp = generateTimestamp();
    const password = generatePassword(
      BUSINESS_SHORT_CODE,
      PASSKEY,
      timestamp
    );

    // Prepare request data
    const requestData = {
      BusinessShortCode: BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline", // Required for PayBill numbers in production
      Amount: Math.ceil(amount), // Safaricom requires whole numbers
      PartyA: formattedPhone,
      PartyB: BUSINESS_SHORT_CODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference || 'unihive marketplace',
      TransactionDesc: `Payment for order ${orderId || ''}`
    };

    console.log('Making STK push request with data:', {
      url: MPESA_API_URL,
      environment: isProduction ? 'production' : 'sandbox',
      businessShortCode: BUSINESS_SHORT_CODE,
      amount,
      phoneNumber: formattedPhone
    });

    // Make the STK push request with proper Bearer token format
    console.log(`🔐 Using token: ${accessToken ? accessToken.substring(0, 15) + '...' : 'MISSING'}`);
    console.log(`📊 Full request data:`, JSON.stringify(requestData, null, 2));
    
    const response = await axios({
      method: 'POST',
      url: MPESA_API_URL,
      data: requestData,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('STK push response:', response.data);
    
    // Update the order with CheckoutRequestID for tracking
    if (orderId && response.data.CheckoutRequestID) {
      try {
        console.log(`Updating order ${orderId} with CheckoutRequestID: ${response.data.CheckoutRequestID}`);
        
        // Get the current order to check if it exists
        const { data: existingOrder, error: checkError } = await supabase
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .single();
          
        if (checkError) {
          console.error('Order not found or database error:', checkError);
          
          // Create the order if it doesn't exist
          console.log(`Creating new order with ID: ${orderId}`);
          const { data: newOrder, error: createError } = await supabase
            .from('orders')
            .insert([
              { 
                id: orderId,
                checkout_request_id: response.data.CheckoutRequestID,
                payment_status: 'pending',
                payment_method: 'mpesa',
                amount: amount,
                phone_number: formattedPhone,
                created_at: new Date().toISOString()
              }
            ])
            .select();
            
          if (createError) {
            console.error('Error creating new order:', createError);
          } else {
            console.log('Successfully created new order:', newOrder);
          }
        } else {
          // Update the existing order
          const { data, error } = await supabase
            .from('orders')
            .update({ 
              checkout_request_id: response.data.CheckoutRequestID,
              payment_status: 'pending',
              payment_method: 'mpesa'
            })
            .eq('id', orderId)
            .select();
            
          if (error) {
            console.error('Error updating order with CheckoutRequestID:', error);
          } else {
            console.log('Successfully updated order with CheckoutRequestID:', data);
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    res.json({
      success: true,
      data: response.data,
      message: 'STK push initiated successfully'
    });
  } catch (error) {
    console.error('M-Pesa STK Push error:', error);
    
    // Extract meaningful error information
    const errorMessage = error.response?.data?.errorMessage || 
                         error.response?.data?.ResponseDescription ||
                         error.message || 
                         'Failed to initiate payment';
                         
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Handle the callback from M-Pesa after a payment attempt
 * FIXED VERSION - Gets buyer from order_items and sends seller emails
 */
export const handleCallback = async (req, res) => {
  try {
    // Log the full callback for debugging
    console.log('M-Pesa callback received:', JSON.stringify(req.body));

    // Safaricom sends the result in the Body property
    const callbackData = req.body.Body?.stkCallback || req.body;

    // Check if this is a successful transaction
    if (callbackData.ResultCode !== undefined) {
      const { ResultCode, ResultDesc, CallbackMetadata, CheckoutRequestID } = callbackData;

      console.log(`M-Pesa transaction result: ${ResultCode} - ${ResultDesc}`);
      console.log(`Looking for order with CheckoutRequestID: ${CheckoutRequestID}`);

      // ── Check service_bookings first (services checkout)
      const { data: serviceBookings } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('checkout_request_id', CheckoutRequestID);

      if (serviceBookings && serviceBookings.length > 0) {
        const booking = serviceBookings[0];
        if (ResultCode === 0 && CallbackMetadata) {
          const items = CallbackMetadata.Item || [];
          const mpesaReceiptNumber = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
          const phoneNumber = items.find(i => i.Name === 'PhoneNumber')?.Value;
          const amount = items.find(i => i.Name === 'Amount')?.Value;

          const newStatus = booking.payment_type === 'deposit' ? 'balance_due' : 'confirmed';

          await supabase
            .from('service_bookings')
            .update({
              payment_status: 'completed',
              booking_status: newStatus,
              mpesa_receipt: mpesaReceiptNumber,
              amount_paid: amount || booking.amount_due,
              phone_number: phoneNumber ? phoneNumber.toString() : booking.phone_number,
              payment_date: new Date().toISOString(),
            })
            .eq('id', booking.id);

          // Insert payment audit record
          await supabase
            .from('service_booking_payments')
            .insert({
              booking_id: booking.id,
              payment_type: booking.payment_type,
              amount: booking.amount_due,
              mpesa_receipt: mpesaReceiptNumber,
              checkout_request_id: CheckoutRequestID,
              status: 'completed',
              paid_at: new Date().toISOString(),
            });

          console.log(`✅ Service booking ${booking.id} confirmed. Status: ${newStatus}`);
        } else {
          await supabase
            .from('service_bookings')
            .update({ payment_status: 'failed', booking_status: 'cancelled' })
            .eq('id', booking.id);
          console.log(`❌ Service booking ${booking.id} payment failed: ${ResultDesc}`);
        }
        return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      }

      // ── Check event_tickets (event ticketing)
      const { data: eventTickets } = await supabase
        .from('event_tickets')
        .select('*')
        .eq('mpesa_checkout_request_id', CheckoutRequestID);

      if (eventTickets && eventTickets.length > 0) {
        const ticket = eventTickets[0];
        if (ResultCode === 0 && CallbackMetadata) {
          const items = CallbackMetadata.Item || [];
          const mpesaReceiptNumber = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
          const phoneNumber = items.find(i => i.Name === 'PhoneNumber')?.Value;
          const amount = items.find(i => i.Name === 'Amount')?.Value;

          await supabase
            .from('event_tickets')
            .update({
              payment_status: 'completed',
              mpesa_receipt: mpesaReceiptNumber,
              amount_paid: amount || ticket.amount_paid,
              phone_number: phoneNumber ? phoneNumber.toString() : ticket.phone_number,
            })
            .eq('id', ticket.id);

          // Increment tickets_sold on the event + update tier sold count.
          // tickets_sold tracks total people admitted (= admits_count, which is
          // quantity * admits_per_ticket); tier.sold tracks tickets purchased
          // in that tier (= quantity).
          const ticketQty = ticket.quantity || 1;
          const ticketAdmits = ticket.admits_count || ticketQty;

          const { data: eventData } = await supabase
            .from('events')
            .select('tickets_sold, ticket_tiers')
            .eq('id', ticket.event_id)
            .single();

          if (eventData) {
            const updatedTiers = (eventData.ticket_tiers || []).map(t => {
              if (t.name === ticket.tier) {
                return { ...t, sold: (t.sold || 0) + ticketQty };
              }
              return t;
            });

            await supabase
              .from('events')
              .update({
                tickets_sold: (eventData.tickets_sold || 0) + ticketAdmits,
                ticket_tiers: updatedTiers,
              })
              .eq('id', ticket.event_id);
          }

          // Increment promo code usage if one was applied
          if (ticket.promo_code_id) {
            const { error: promoErr } = await supabase.rpc('increment_promo_code_usage', {
              p_promo_code_id: ticket.promo_code_id,
            });
            if (promoErr) {
              console.error('Failed to increment promo usage:', promoErr);
            } else {
              console.log(`🏷️  Promo code ${ticket.promo_code_id} usage incremented`);
            }
          }

          console.log(`✅ Event ticket ${ticket.id} confirmed. Receipt: ${mpesaReceiptNumber}`);

          // Fire-and-forget the confirmation email (with QR). Doesn't block the
          // M-Pesa callback response — failures are recorded on the ticket and
          // can be retried via /api/email/event-ticket-resend/:ticketId.
          try {
            const selfUrl =
              process.env.SELF_URL ||
              process.env.BACKEND_URL ||
              'https://unihive-wba0.onrender.com';
            fetch(`${selfUrl}/api/email/event-ticket-confirmation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticketId: ticket.id }),
            }).catch((err) =>
              console.error(`Ticket email kickoff failed for ${ticket.id}:`, err.message)
            );
          } catch (e) {
            console.error('Could not kick off ticket email:', e.message);
          }
        } else {
          await supabase
            .from('event_tickets')
            .update({ payment_status: 'failed' })
            .eq('id', ticket.id);
          console.log(`❌ Event ticket ${ticket.id} payment failed: ${ResultDesc}`);
        }
        return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      }

      // ── Fall through to regular orders lookup
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('checkout_request_id', CheckoutRequestID);

      if (orderError) {
        console.error('Error finding order by checkout request ID:', orderError);
      } else if (!orders || orders.length === 0) {
        console.error(`No order found with CheckoutRequestID: ${CheckoutRequestID}`);
      } else {
        const order = orders[0];

        // Update order based on the result code (0 means success)
        if (ResultCode === 0 && CallbackMetadata) {
          // Extract payment details from the callback
          const items = CallbackMetadata.Item || [];
          const mpesaReceiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
          const transactionDate = items.find(item => item.Name === 'TransactionDate')?.Value;
          const phoneNumber = items.find(item => item.Name === 'PhoneNumber')?.Value;
          const amount = items.find(item => item.Name === 'Amount')?.Value;

          // Update order with payment details
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'completed',
              order_status: 'processing',
              mpesa_receipt: mpesaReceiptNumber,
              phone_number: phoneNumber ? phoneNumber.toString() : order.phone_number,
            })
            .eq('id', order.id);

          if (updateError) {
            console.error('Error updating order after successful payment:', updateError);
          } else {
            console.log(`✅ Order ${order.id} marked as paid successfully`);

            // Update order items status and initialize payout tracking
            await supabase
              .from('order_items')
              .update({ status: 'processing', payment_status: 'pending_payout' })
              .eq('order_id', order.id);

            // ✅ SEND EMAIL NOTIFICATIONS TO SELLERS
            try {
              console.log('📧 Starting seller email notification process...');

              // Fetch order items with products - CORRECTED seller_id reference
              const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .select(`
                  *,
                  products (
                    *,
                    seller_id
                  )
                `)
                .eq('order_id', order.id);

              if (itemsError) {
                console.error('❌ Error fetching order items:', itemsError);
              } else if (orderItems && orderItems.length > 0) {
                console.log(`✅ Found ${orderItems.length} order item(s) to notify sellers about`);

                // ✅ FIX: Get buyer from order_items (not orders table)
                const firstItem = orderItems[0];
                const buyerUserId = firstItem.buyer_user_id;

                console.log(`🔍 Fetching buyer profile from order_items...`);
                console.log(`   Buyer ID: ${buyerUserId}`);

                let buyerProfile = null;

                if (buyerUserId) {
                  const { data: buyer, error: buyerError } = await supabase
                    .from('profiles')
                    .select('full_name, email, phone')
                    .eq('id', buyerUserId)
                    .single();

                  if (buyerError) {
                    console.error('⚠️ Error fetching buyer profile:', buyerError);
                  } else {
                    buyerProfile = buyer;
                    console.log(`✅ Buyer: ${buyer.full_name || 'Unknown'} (${buyer.email || 'N/A'})`);
                  }
                } else {
                  console.warn('⚠️ No buyer_user_id found in order_items');
                }

                // Import Resend and email templates
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);

                const {
                  sellerOrderNotificationTemplate,
                  sellerOrderNotificationText
                } = await import('../utils/emailTemplates.js');

                // Send notification to each seller
                let emailsSent = 0;
                let emailsFailed = 0;

                for (const item of orderItems) {
                  try {
                    // ✅ FIX: Access seller_id from products object (not seller_user_id)
                    const sellerId = item.products?.seller_id;

                    if (!sellerId) {
                      console.warn(`⚠️ No seller ID found for order item ${item.id}`);
                      emailsFailed++;
                      continue;
                    }

                    console.log(`\n🔍 Processing order item ${item.id}`);
                    console.log(`   Fetching seller profile for ID: ${sellerId}`);

                    // Fetch seller profile
                    const { data: sellerProfile, error: sellerError } = await supabase
                      .from('profiles')
                      .select('full_name, email')
                      .eq('id', sellerId)
                      .single();

                    if (sellerError || !sellerProfile?.email) {
                      console.error(`❌ Error fetching seller profile for ${sellerId}:`, sellerError);
                      emailsFailed++;
                      continue;
                    }

                    console.log(`✅ Found seller: ${sellerProfile.full_name || 'Seller'} (${sellerProfile.email})`);

                    // Get product details
                    const productName = item.products?.product_name || item.products?.name || 'Product';
                    const productImages = item.products?.product_images;
                    const firstImage = Array.isArray(productImages) && productImages.length > 0
                      ? productImages[0]
                      : null;

                    console.log(`📦 Product: ${productName}`);
                    console.log(`   Quantity: ${item.quantity}`);
                    console.log(`   Total: KSh ${item.total_price || item.price_per_unit}`);

                    // Construct order URL
                    const APP_URL = process.env.APP_URL || 'https://unihive.shop';
                    const orderUrl = `${APP_URL}/seller/orders/${item.id}`;

                    // Prepare email data
                    const orderDetails = {
                      orderId: order.id,
                      orderItemId: item.id,
                      productName: productName,
                      productImage: firstImage,
                      quantity: item.quantity || 1,
                      totalAmount: item.total_price || item.price_per_unit || 0,
                      buyerName: buyerProfile?.full_name || 'Customer',
                      buyerEmail: buyerProfile?.email || '',
                      orderUrl
                    };

                    console.log(`📧 Sending email to: ${sellerProfile.email}`);

                    // Send email using Resend
                    const { data: emailData, error: emailError } = await resend.emails.send({
                      from: process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>',
                      to: sellerProfile.email,
                      subject: `🎉 New Order #${item.id.substring(0, 8)} - ${productName}`,
                      html: sellerOrderNotificationTemplate(sellerProfile.full_name || 'Seller', orderDetails),
                      text: sellerOrderNotificationText(sellerProfile.full_name || 'Seller', orderDetails),
                    });

                    if (emailError) {
                      console.error(`❌ Email failed for ${sellerProfile.email}:`, emailError);
                      emailsFailed++;
                    } else {
                      console.log(`✅ Email sent successfully to ${sellerProfile.email}`);
                      console.log(`   Email ID: ${emailData.id}`);
                      emailsSent++;
                    }

                  } catch (emailError) {
                    console.error(`❌ Error sending email for order item ${item.id}:`, emailError.message);
                    emailsFailed++;
                    // Continue with other items even if one fails
                  }
                }

                console.log(`\n📊 Email notification summary:`);
                console.log(`   ✅ Sent: ${emailsSent}`);
                console.log(`   ❌ Failed: ${emailsFailed}`);
                console.log(`   📦 Total items: ${orderItems.length}`);

              } else {
                console.warn('⚠️ No order items found for this order');
              }
            } catch (notificationError) {
              console.error('❌ Error in seller notification process:', notificationError);
              // Don't fail the callback if email fails - payment was successful
            }
          }
        } else {
          // Payment failed
          console.log(`❌ Payment failed for order ${order.id}: ${ResultDesc}`);
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              payment_error: ResultDesc
            })
            .eq('id', order.id);
        }
      }
    }

    // Always respond with success to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error('❌ Error processing M-Pesa callback:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Callback acknowledged" });
  }
};

/**
 * Check the status of an STK push payment transaction
 */
export const checkTransactionStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    if (!checkoutRequestId) {
      return res.status(400).json({
        success: false,
        error: 'Checkout request ID is required'
      });
    }
    
    console.log(`Checking payment status for CheckoutRequestID: ${checkoutRequestId}`);
    
    // Find the order by checkout request ID
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId);
      
    if (orderError) {
      throw orderError;
    }
    
    if (!orders || orders.length === 0) {
      console.log(`No order found with CheckoutRequestID: ${checkoutRequestId}`);
      
      // Check service_bookings
      const { data: bookings } = await supabase
        .from('service_bookings')
        .select('id, payment_status, booking_status, mpesa_receipt')
        .eq('checkout_request_id', checkoutRequestId);

      if (bookings && bookings.length > 0) {
        const booking = bookings[0];
        return res.json({
          success: true,
          data: {
            orderId: booking.id,
            paymentStatus: booking.payment_status,
            orderStatus: booking.booking_status,
            receipt: booking.mpesa_receipt
          }
        });
      }

      // Check event_tickets
      const { data: tickets } = await supabase
        .from('event_tickets')
        .select('id, payment_status, mpesa_receipt')
        .eq('mpesa_checkout_request_id', checkoutRequestId);

      if (tickets && tickets.length > 0) {
        const ticket = tickets[0];
        return res.json({
          success: true,
          data: {
            orderId: ticket.id,
            paymentStatus: ticket.payment_status,
            orderStatus: ticket.payment_status === 'completed' ? 'confirmed' : ticket.payment_status,
            receipt: ticket.mpesa_receipt
          }
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    const order = orders[0];
    
    // Return the current payment status
    return res.json({
      success: true,
      data: {
        orderId: order.id,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        receipt: order.mpesa_receipt
      }
    });
  } catch (error) {
    console.error('Error checking transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transaction status'
    });
  }
};

/**
 * Helper function to format M-Pesa date (format: YYYYMMDDHHmmss) to ISO format
 */
const formatMpesaDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string' && typeof dateString !== 'number') {
    return new Date().toISOString();
  }
  
  // Convert to string if it's a number
  const strDate = dateString.toString();
  
  if (strDate.length !== 14) {
    console.warn(`Invalid M-Pesa date format: ${strDate}, expected 14 digits`);
    return new Date().toISOString();
  }
  
  try {
    const year = strDate.substring(0, 4);
    const month = strDate.substring(4, 6);
    const day = strDate.substring(6, 8);
    const hour = strDate.substring(8, 10);
    const minute = strDate.substring(10, 12);
    const second = strDate.substring(12, 14);
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`).toISOString();
  } catch (error) {
    console.error('Error formatting M-Pesa date:', error);
    return new Date().toISOString();
  }
};