// src/components/PaymentSimulator.jsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify';

const PaymentSimulator = ({ orderId, amount, onSuccess }) => {
  const [processing, setProcessing] = useState(false);

  const simulatePayment = async () => {
    try {
      setProcessing(true);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update order status
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'completed',
          order_status: 'processing',
          mpesa_receipt: `SIM${Math.floor(Math.random() * 1000000)}`
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      toast.success('Payment completed successfully!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error simulating payment:', error);
      toast.error('Payment simulation failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h3 className="text-sm font-medium mb-2">Payment Simulation</h3>
      <p className="text-sm text-gray-600 mb-3">
        This is a development-only feature to simulate payment completion.
      </p>
      <Button
        onClick={simulatePayment}
        disabled={processing}
        className="w-full"
      >
        {processing ? 'Processing...' : `Simulate Payment (KES ${amount})`}
      </Button>
    </div>
  );
};

export default PaymentSimulator;