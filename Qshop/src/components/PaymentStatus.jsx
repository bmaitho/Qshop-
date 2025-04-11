import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkPaymentStatus } from '../Services/mpesaService';
import { useNavigate } from 'react-router-dom';

/**
 * Component for displaying and checking payment status
 * 
 * @param {Object} props Component props
 * @param {string} props.checkoutRequestId M-Pesa checkout request ID
 * @param {string} props.orderId Order ID
 * @param {string} props.initialStatus Initial payment status
 * @param {function} props.onStatusChange Callback when status changes
 */
const PaymentStatus = ({ 
  checkoutRequestId, 
  orderId, 
  initialStatus = 'pending',
  onStatusChange
}) => {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const pollingInterval = useRef(null);
  const navigate = useNavigate();

  // Status messages
  const statusMessages = {
    pending: 'Your payment is awaiting processing.',
    processing: 'Please check your phone for the M-Pesa prompt and enter your PIN.',
    completed: 'Payment completed successfully!',
    failed: 'Payment failed. Please try again.'
  };

  // Start polling when checkoutRequestId is available
  useEffect(() => {
    if (checkoutRequestId && (status === 'pending' || status === 'processing')) {
      startPolling();
    }
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [checkoutRequestId, status]);

  // Update message when status changes
  useEffect(() => {
    setMessage(statusMessages[status] || '');
    
    // Call onStatusChange callback if provided
    if (onStatusChange) {
      onStatusChange(status);
    }
    
    // Navigate if payment completed
    if (status === 'completed') {
      // Give user time to see the success message before redirecting
      const timer = setTimeout(() => {
        navigate(`/order-confirmation/${orderId}`);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [status, orderId, navigate, onStatusChange]);

  const startPolling = () => {
    // Clear any existing interval
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    setIsPolling(true);
    
    // Check immediately
    checkStatus();
    
    // Then set interval
    pollingInterval.current = setInterval(() => {
      checkStatus();
    }, 5000); // Check every 5 seconds
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    setIsPolling(false);
  };

  const checkStatus = async () => {
    try {
      const response = await checkPaymentStatus(checkoutRequestId);
      
      if (response.success) {
        const { paymentStatus, receipt: mpesaReceipt } = response.data.data;
        
        // Update status and receipt if available
        setStatus(paymentStatus);
        if (mpesaReceipt) {
          setReceipt(mpesaReceipt);
        }
        
        // Stop polling if status is completed or failed
        if (paymentStatus === 'completed' || paymentStatus === 'failed') {
          stopPolling();
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Render different content based on status
  const renderStatusContent = () => {
    switch (status) {
      case 'processing':
        return (
          <Alert className="border-orange-200 bg-orange-50 text-orange-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Payment Processing</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        );
      case 'completed':
        return (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Payment Successful</AlertTitle>
            <AlertDescription>
              {message}
              {receipt && (
                <div className="mt-2 font-medium">
                  M-Pesa Receipt: {receipt}
                </div>
              )}
              <div className="mt-3">
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => navigate(`/order-confirmation/${orderId}`)}
                >
                  View Order Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      case 'failed':
        return (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Payment Failed</AlertTitle>
            <AlertDescription>
              {message}
              <div className="mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-red-300 hover:bg-red-100"
                  onClick={() => navigate(`/checkout/${orderId}`)}
                >
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      default:
        return (
          <Alert className="border-blue-200 bg-blue-50 text-blue-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Awaiting Payment</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="payment-status">
      {renderStatusContent()}
    </div>
  );
};

export default PaymentStatus;