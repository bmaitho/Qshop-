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
      
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products(*)
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
    // Create a new window with the receipt content
    const printWindow = window.open('', '_blank');
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order #${orderId.substring(0, 8)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .success-icon {
              width: 60px;
              height: 60px;
              background: #22c55e;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 30px;
            }
            h1 { font-size: 28px; margin-bottom: 10px; }
            .order-id { color: #666; font-size: 14px; }
            .section { margin-bottom: 30px; }
            .section-title { 
              font-size: 18px; 
              font-weight: bold; 
              margin-bottom: 15px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .item { 
              display: flex; 
              justify-content: space-between; 
              padding: 10px 0;
              border-bottom: 1px solid #eee;
            }
            .item-details { flex: 1; }
            .item-name { font-weight: 600; }
            .item-quantity { color: #666; font-size: 14px; }
            .totals { 
              margin-top: 20px; 
              padding-top: 20px;
              border-top: 2px solid #333;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 8px;
            }
            .total-row.final { 
              font-weight: bold; 
              font-size: 18px;
              margin-top: 10px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .info-item { margin-bottom: 10px; }
            .info-label { 
              color: #666; 
              font-size: 14px; 
              margin-bottom: 3px;
            }
            .info-value { font-weight: 500; }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-success {
              background: #dcfce7;
              color: #166534;
            }
            .badge-warning {
              background: #fef3c7;
              color: #92400e;
            }
            .badge-error {
              background: #fee2e2;
              color: #991b1b;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="success-icon">✓</div>
            <h1>Order Confirmed</h1>
            <p>Thank you for your purchase</p>
            <p class="order-id">Order #${orderId.substring(0, 8)}</p>
          </div>

          <div class="section">
            <div class="section-title">Order Summary</div>
            ${orderItems.map(item => `
              <div class="item">
                <div class="item-details">
                  <div class="item-name">${item.products?.name || 'Product'}</div>
                  <div class="item-quantity">Quantity: ${item.quantity}</div>
                </div>
                <div class="item-price">KES ${item.subtotal?.toFixed(2)}</div>
              </div>
            `).join('')}
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span>KES ${order.amount?.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Delivery</span>
                <span>KES 0.00</span>
              </div>
              <div class="total-row final">
                <span>Total</span>
                <span>KES ${order.amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Payment Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Payment Method</div>
                <div class="info-value">M-Pesa</div>
              </div>
              <div class="info-item">
                <div class="info-label">Payment Status</div>
                <div class="info-value">
                  <span class="badge ${
                    order.payment_status === 'completed' ? 'badge-success' :
                    order.payment_status === 'pending' ? 'badge-warning' :
                    'badge-error'
                  }">
                    ${order.payment_status === 'completed' ? 'Paid' :
                      order.payment_status === 'pending' ? 'Pending' :
                      'Failed'}
                  </span>
                </div>
              </div>
              ${order.mpesa_receipt ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                  <div class="info-label">Transaction ID / Receipt</div>
                  <div class="info-value">${order.mpesa_receipt}</div>
                </div>
              ` : ''}
              <div class="info-item">
                <div class="info-label">Date</div>
                <div class="info-value">${formatDate(order.payment_date || order.created_at)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Phone Number</div>
                <div class="info-value">${order.phone_number || 'Not available'}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This is a computer-generated receipt and does not require a signature.</p>
            <p>For any inquiries, please contact our support team.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  const copyReceiptNumber = () => {
    if (order?.mpesa_receipt) {
      navigator.clipboard.writeText(order.mpesa_receipt).then(() => {
        setIsCopied(true);
        toast.success('Receipt number copied to clipboard');
        
        // Reset copied state after 3 seconds
        setTimeout(() => {
          setIsCopied(false);
        }, 3000);
      });
    }
  };

  // Format date for better display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
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
          <p className="text-gray-600">
            Thank you for your purchase. Your order has been received.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Order #{orderId.substring(0, 8)}
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                    {item.products?.image_url && (
                      <img 
                        src={item.products.image_url} 
                        alt={item.products.name}
                        className="w-full h-full object-cover rounded"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.products?.name}</h3>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">KES {item.subtotal?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t mt-6 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span>KES {order.amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Delivery</span>
                <span>KES 0.00</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>KES {order.amount?.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Payment Method</p>
                <p>M-Pesa</p>
              </div>
              <div>
                <p className="text-gray-600">Payment Status</p>
                <Badge variant="outline" className={
                  order.payment_status === 'completed' 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : order.payment_status === 'pending'
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }>
                  {order.payment_status === 'completed' ? 'Paid' : 
                   order.payment_status === 'pending' ? 'Pending' : 
                   'Failed'}
                </Badge>
              </div>
              
              {order.mpesa_receipt && (
                <div className="col-span-2 mt-2">
                  <p className="text-gray-600">Transaction ID / Receipt</p>
                  <div className="flex items-center mt-1">
                    <p className="font-mono">{order.mpesa_receipt}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={copyReceiptNumber}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                          >
                            {isCopied ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isCopied ? 'Copied!' : 'Copy receipt number'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-gray-600">Date</p>
                <p>{formatDate(order.payment_date || order.created_at)}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Phone Number</p>
                <p>{order.phone_number || 'Not available'}</p>
              </div>
            </div>
            
            {order.payment_status === 'pending' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                <p className="text-yellow-800">
                  Your payment is still being processed. We will update the status once confirmed.
                </p>
              </div>
            )}
            
            {order.payment_status === 'failed' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
                <p className="text-red-800">
                  Payment failed: {order.payment_error || 'An error occurred during payment processing'}
                </p>
                <p className="mt-2">
                  <Link to={`/checkout/${orderId}`}>
                    <Button size="sm" variant="outline">
                      Try Payment Again
                    </Button>
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={downloadReceipt}
          >
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