import React, { useState } from 'react';
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
  DialogFooter,
} from "@/components/ui/dialog";
import { toastSuccess, toastError } from '../utils/toastConfig';
import { MessageCircle } from 'lucide-react';

const MessageDialog = ({ 
  recipientId, 
  productId = null, 
  orderId = null, 
  buttonText = "Contact Seller",
  buttonVariant = "outline",
  buttonClassName = "flex-1",
  buttonSize = "default",
  productName = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    try {
      setSending(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to send messages');
      }

      // Create message record
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            recipient_id: recipientId,
            product_id: productId,
            order_id: orderId,
            message: message.trim()
          }
        ]);

      if (error) throw error;
      
      // Success!
      toastSuccess("Message sent successfully!");
      setMessage('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toastError(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
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
      <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-primary dark:text-gray-100">
            {productName ? `Message about ${productName}` : "Send Message"}
          </DialogTitle>
          <DialogDescription className="text-primary/70 dark:text-gray-300">
            Your message will be sent directly to the seller.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Write your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
          >
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessageDialog;