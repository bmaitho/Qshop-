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
  DialogFooter,
} from "@/components/ui/dialog";
import { toastSuccess, toastError } from '../utils/toastConfig';
import { MessageCircle, User } from 'lucide-react';

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
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Fetch recipient details when the dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchRecipientDetails();
      fetchCurrentUserProfile();
    }
  }, [isOpen, recipientId]);

  const fetchRecipientDetails = async () => {
    if (!recipientId) return;
    
    try {
      // Use maybeSingle instead of single to avoid PGRST116 error
      // when no rows are found (it returns null instead of error)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', recipientId)
        .maybeSingle();  // <-- Change from single() to maybeSingle()

      if (error) {
        console.error('Error fetching recipient details:', error);
      }
      
      // Always set recipient details - either with data from DB or defaults
      setRecipientDetails({
        id: recipientId,
        full_name: data?.full_name || null,
        email: data?.email || null
      });
    } catch (error) {
      console.error('Error in fetchRecipientDetails:', error);
      // Set default recipient details on exception
      setRecipientDetails({
        id: recipientId,
        full_name: null, 
        email: null
      });
    }
  };

  const fetchCurrentUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCurrentUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    
    try {
      setSending(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to send messages');
      }

      // Ensure we have recipient details - if not, fetch them again
      let recipient = recipientDetails;
      if (!recipient) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', recipientId)
            .single();
            
          if (!error) {
            recipient = data;
          }
        } catch (e) {
          console.error('Final attempt to fetch recipient failed:', e);
        }
      }

      // Get sender and recipient names with better fallbacks
      const senderName = currentUserProfile?.full_name || user.email || user.id || 'Unknown Sender';
      const recipientName = recipient?.full_name || recipient?.email || (recipient ? recipient.id : recipientId) || 'Unknown Recipient';

      console.log('Sending message with recipient name:', recipientName);
      
      // Create message record with names
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            recipient_id: recipientId,
            product_id: productId,
            order_id: orderId,
            message: message.trim(),
            sender_name: senderName,
            recipient_name: recipientName
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

  const getRecipientName = () => {
    if (!recipientDetails) return "Seller";
    return recipientDetails.full_name || recipientDetails.email || "Seller";
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
            {productName ? `Message about ${productName}` : `Message to ${getRecipientName()}`}
          </DialogTitle>
          <DialogDescription className="text-primary/70 dark:text-gray-300">
            {recipientDetails && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-8 h-8 bg-primary/10 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary/60 dark:text-gray-400" />
                </div>
                <span>{getRecipientName()}</span>
              </div>
            )}
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