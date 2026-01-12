import React, { useState } from 'react';
import { supabase } from './SupabaseClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const MessageUniHiveDialog = ({ 
  buttonText = "Message UniHive",
  buttonVariant = "outline",
  buttonClassName = "",
  buttonSize = "default"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toastError("Please share your thoughts before submitting");
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to send feedback');
      }

      // Create feedback record in issue_reports table
      // Using the same table but with null seller_id to distinguish feedback from issues
      const { error } = await supabase
        .from('issue_reports')
        .insert([
          {
            user_id: user.id,
            seller_id: null, // No seller for general feedback
            product_id: null,
            order_id: null,
            description: feedback.trim(),
            status: 'open'
          }
        ]);

      if (error) throw error;
      
      // Success!
      toastSuccess("Thank you for your feedback!");
      setFeedback('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toastError(error.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
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
            Message UniHive
          </DialogTitle>
          <DialogDescription className="text-primary/70 dark:text-gray-300">
            We'd love to hear from you! Share your feedback, suggestions, or questions with our team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-primary dark:text-gray-300">
              Your Message
            </Label>
            <Textarea
              id="feedback"
              placeholder="Tell us what's on your mind - feature requests, improvements, bugs, or just say hi! We read every message."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[160px] w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
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
            onClick={handleSubmit}
            disabled={!feedback.trim() || submitting}
            className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
          >
            {submitting ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessageUniHiveDialog;