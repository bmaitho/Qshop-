import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Download, ArrowLeft, Copy, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { supabase } from '../components/SupabaseClient';
import Navbar from './Navbar';
import { toast } from 'react-toastify';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, delivery_fee, delivery_method, pickup_mtaani_destination_name, pickup_mtaani_destination_address, pickup_mtaani_destination_town, pickup_mtaani_tracking_code')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // ✅ FIX: Removed 'town' — column doesn't exist in profiles table
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*),
          seller:seller_id(full_name, campus_location)
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order information');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    const printWindow = window.open('', '_blank');
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order #${orderId.substring(0, 8)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .success-icon { width: 60px; height: 60px; background: #22c55e; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; }
            h1 { font-size: 28px; margin-bottom: 10px; }
            .order-id { color: #666; font-size: 14px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
            .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
            .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; }
            .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
            .payment-info { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="success-icon">✓</div>
            <h1>UniHive Receipt</h1>
            <p class="order-id">Order #${orderId.substring(0, 8)}</p>
            <p class="order-id">${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          
          <div class="section">
            <h2 class="section-title">Items Ordered</h2>
            ${orderItems.map(item => `
              <div class="item">
                <div>
                  <strong>${item.products?.name || 'Product'}</strong><br>
                  <small>Qty: ${item.quantity} × KES ${item.price_per_unit?.toFixed(2)}</small>
                </div>
                <div style="text-align: right; font-weight: bold;">KES ${item.subtotal?.toFixed(2)}</div>
              </div>
            `).join('')}
            
            ${(() => {
              const deliveryFee = parseFloat(order.delivery_fee || 0);
              const total = parseFloat(order.amount || 0);
              const subtotal = total - deliveryFee;
              return `
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">
                  <div class="item" style="border: none;">
                    <span>Products Subtotal</span>
                    <strong>KES ${subtotal.toFixed(2)}</strong>
                  </div>
                  ${deliveryFee > 0 ? `
                    <div class="item" style="border: none;">
                      <span>Delivery Fee</span>
                      <strong>KES ${deliveryFee.toFixed(2)}</strong>
                    </div>
                  ` : ''}
                </div>
              `;
            })()}
            
            <div class="total">Total: KES ${parseFloat(order.amount || 0).toFixed(2)}</div>
          </div>

          <div class="section">
            <h2 class="section-title">Payment Information</h2>
            <div class="payment-info">
              <p><strong>Method:</strong> M-Pesa</p>
              <p><strong>Status:</strong> ${order.payment_status === 'completed' ? 'Paid' : order.payment_status}</p>
              ${order.mpesa_receipt ? `<p><strong>M-Pesa Receipt:</strong> ${order.mpesa_receipt}</p>` : ''}
              ${order.phone_number ? `<p><strong>Phone:</strong> ${order.phone_number}</p>` : ''}
            </div>
          </div>

          ${order.delivery_method === 'pickup_mtaani' ? `
            <div class="section">
              <h2 class="section-title">Delivery Information</h2>
              <div class="payment-info">
                <p><strong>Method:</strong> PickUp Mtaani</p>
                ${order.pickup_mtaani_destination_name ? `<p><strong>Pickup Point:</strong> ${order.pickup_mtaani_destination_name}</p>` : ''}
                ${order.pickup_mtaani_destination_address ? `<p><strong>Address:</strong> ${order.pickup_mtaani_destination_address}</p>` : ''}
                ${order.pickup_mtaani_tracking_code ? `<p><strong>Tracking Code:</strong> ${order.pickup_mtaani_tracking_code}</p>` : ''}
              </div>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for shopping with UniHive!</p>
            <p>If you have any questions, please contact us through the app.</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId.substring(0, 8));
    setIsCopied(true);
    toast.success('Order ID copied!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto p-4 mt-12">
          <p className="text-center">Order not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-4 mt-12">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">Thank you for your purchase. Your order has been received.</p>
          <p className="text-sm text-gray-500 mt-2">Order #{orderId.substring(0, 8)}</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                    {item.products?.image_url && (
                      <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover rounded" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.products?.name}</h3>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">KES {item.subtotal?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t mt-6 pt-4">
              {(() => {
                const deliveryFee = parseFloat(order.delivery_fee || 0);
                const total = parseFloat(order.amount || 0);
                const subtotal = total - deliveryFee;
                return (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Products</span>
                      <span>KES {subtotal.toFixed(2)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">
                          {order.delivery_method === 'pickup_mtaani' ? 'PickUp Mtaani Delivery' : 'Delivery Fee'}
                        </span>
                        <span>KES {deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>KES {total.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span>M-Pesa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <Badge variant={order.payment_status === 'completed' ? 'default' : 'secondary'}>
                  {order.payment_status === 'completed' ? 'Paid' : order.payment_status}
                </Badge>
              </div>
              {order.mpesa_receipt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">M-Pesa Receipt</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={copyOrderId} className="flex items-center gap-1 font-mono text-sm">
                          {order.mpesa_receipt}
                          {isCopied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copy receipt number</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delivery / Pickup Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              {order.delivery_method === 'pickup_mtaani' ? '📦 Delivery Destination' : '📍 Product Pickup Location'}
            </h2>

            {order.delivery_method === 'pickup_mtaani' ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-1">Your PickUp Mtaani Collection Point</p>
                  <p className="font-medium text-gray-900">{order.pickup_mtaani_destination_name || 'Pending assignment'}</p>
                  {order.pickup_mtaani_destination_address && (
                    <p className="text-sm text-gray-600 mt-0.5">{order.pickup_mtaani_destination_address}</p>
                  )}
                  {order.pickup_mtaani_destination_town && (
                    <p className="text-sm text-gray-500">{order.pickup_mtaani_destination_town}</p>
                  )}
                </div>

                {/* Per-seller tracking codes */}
                {(() => {
                  const sellerParcels = new Map();
                  for (const item of orderItems) {
                    if (item.pickup_mtaani_tracking_code && !sellerParcels.has(item.seller_id)) {
                      sellerParcels.set(item.seller_id, {
                        trackingCode: item.pickup_mtaani_tracking_code,
                        originName: item.pickup_mtaani_origin_name,
                        sellerName: item.seller?.full_name || 'Seller',
                        status: item.pickup_mtaani_status
                      });
                    }
                  }

                  if (sellerParcels.size > 0) {
                    return (
                      <div className="space-y-2">
                        {sellerParcels.size > 1 && (
                          <p className="text-xs text-gray-500">
                            Your order has {sellerParcels.size} parcels from different sellers:
                          </p>
                        )}
                        {Array.from(sellerParcels.entries()).map(([sellerId, parcel]) => (
                          <div key={sellerId} className="bg-white border border-blue-200 rounded p-3">
                            {sellerParcels.size > 1 && (
                              <p className="text-xs text-gray-500 mb-1">From: {parcel.sellerName}</p>
                            )}
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Tracking Code</p>
                            <p className="font-mono font-bold text-gray-900">{parcel.trackingCode}</p>
                            {parcel.originName && (
                              <p className="text-xs text-gray-400 mt-1">
                                Drop-off: {parcel.originName}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (order.pickup_mtaani_tracking_code) {
                    return (
                      <div className="bg-white border border-blue-200 rounded p-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Tracking Code</p>
                        <p className="font-mono font-bold text-gray-900">{order.pickup_mtaani_tracking_code}</p>
                      </div>
                    );
                  }

                  return (
                    <p className="text-xs text-amber-600 mt-2">
                      ⏳ Tracking code will be added once the seller drops off your parcel.
                    </p>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  Coordinate with the seller via messages to arrange pickup from their location.
                </p>
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.products?.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <svg className="h-3.5 w-3.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {/* ✅ FIX: Removed town reference */}
                        <p className="text-sm text-green-700 font-medium">
                          {item.seller?.campus_location || 'Location not set — check messages'}
                        </p>
                      </div>
                      {item.seller?.full_name && (
                        <p className="text-xs text-gray-500 mt-0.5">Seller: {item.seller.full_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button variant="outline" className="flex-1" onClick={downloadReceipt}>
            <Download className="mr-2 h-4 w-4" />
            Download Receipt
          </Button>
          <Link to="/studentmarketplace" className="flex-1">
            <Button className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default OrderConfirmation;