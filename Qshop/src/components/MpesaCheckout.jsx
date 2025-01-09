// components/MpesaCheckout.jsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { initiateMpesaPayment } from '../services/mpesaService';

const MpesaCheckout = ({ amount }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Format phone number (remove leading zero if present and add country code if needed)
      let formattedPhone = phoneNumber;
      if (phoneNumber.startsWith('0')) {
        formattedPhone = '254' + phoneNumber.slice(1);
      }
      if (!phoneNumber.startsWith('254')) {
        formattedPhone = '254' + phoneNumber;
      }

      const response = await initiateMpesaPayment(
        parseInt(formattedPhone),
        parseInt(amount)
      );

      if (response.success) {
        toast({
          title: "Payment Initiated",
          description: "Please check your phone for the M-Pesa prompt",
        });
        setIsOpen(false);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Pay with M-Pesa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>M-Pesa Payment</DialogTitle>
          <DialogDescription>
            Enter your phone number to receive the payment prompt
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g., 0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              pattern="^(254|\+254|0)([7][0-9]{8})$"
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Format: 0712345678 or 254712345678
            </p>
          </div>
          <div className="space-y-2">
            <div className="font-medium">Amount to Pay</div>
            <div className="text-2xl font-bold">KES {amount.toFixed(2)}</div>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Pay Now"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MpesaCheckout;