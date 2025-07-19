// src/components/MessageDialog.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../components/SupabaseClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'react-toastify';
import { MessageCircle } from 'lucide-react';
import { createMessageWithFlow } from '../utils/buyerResponseHandler';
import { getDisplayInfo } from '../utils/communicationUtils';

const MessageDialog = ({ 
  recipientId, 
  productId = null, 
  orderId = null, 
  orderItemId = null, // New prop for order item linking
  buttonText = "Contact Seller",
  buttonVariant = "outline",
  buttonClassName = "flex-1",
  buttonSize = "default",
  productName = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch recipient and current user details when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchRecipientDetails();
      fetchCurrentUserProfile();
    }
  }, [isOpen, recipientId]);

  const fetchRecipientDetails = async () => {
    if (!recipientId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, campus_location')
        .eq('id', recipientId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching recipient details:', error);
      }
      
      setRecipientDetails(data || { id: recipientId });
    } catch (error) {
      console.error('Error in fetchRecipientDetails:', error);
      setRecipientDetails({ id: recipientId });
    }
  };

  const fetchCurrentUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUser(user);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, campus_location')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setCurrentUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching current user profile:', error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      setSending(true);
      
      if (!currentUser) {
        throw new Error('You must be logged in to send messages');
      }

      // Get display info for both users
      const recipientInfo = getDisplayInfo(recipientDetails);
      const senderInfo = getDisplayInfo(currentUserProfile);

      // Prepare message data
      const messageData = {
        sender_id: currentUser.id,
        recipient_id: recipientId,
        product_id: productId,
        order_id: orderId,
        order_item_id: orderItemId, // Link to specific order item if provided
        message: message.trim(),
        sender_name: senderInfo.name,
        recipient_name: recipientInfo.name
      };

      // Use the enhanced message creation function
      const result = await createMessageWithFlow(messageData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      
      // Success!
      toast.success("Message sent successfully!");
      setMessage('');
      setIsOpen(false);
      
      // If this was an order-related message from seller, might need to refresh parent component
      if (orderItemId && window.location.pathname.includes('/seller/orders/')) {
        // Trigger a refresh of the order detail page
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const getRecipientName = () => {
    const recipientInfo = getDisplayInfo(recipientDetails);
    return recipientInfo.name;
  };

  const getDialogTitle = () => {
    if (productName) {
      return `Message about ${productName}`;
    }
    if (orderId) {
      return `Message about Order`;
    }
    return `Message ${getRecipientName()}`;
  };

  const getDialogDescription = () => {
    if (orderItemId) {
      return "Send a message about this order. The recipient will be notified.";
    }
    return "Send a message to this user. They will be notified of your message.";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonVariant} 
          className={buttonClassName}
          size={buttonSize}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="text-sm text-gray-600">
            <span className="font-medium">To: </span>
            {getRecipientName()}
          </div>
          
          {/* Message Input */}
          <Textarea
            placeholder={orderItemId ? 
              "Write a message about shipping arrangements..." : 
              "Write your message..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
            disabled={sending}
          />
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sending}
            >
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageDialog;