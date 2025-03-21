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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastSuccess, toastError } from '../utils/toastConfig';
import { AlertCircle } from 'lucide-react';

const ISSUE_TYPES = [
  { value: 'item_not_received', label: 'Item Not Received' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'damaged_item', label: 'Item Arrived Damaged' },
  { value: 'quality_issue', label: 'Quality Not As Described' },
  { value: 'other', label: 'Other Issue' }
];

const ReportIssueDialog = ({ 
  sellerId, 
  productId = null, 
  orderId = null,
  buttonText = "Report Issue",
  buttonVariant = "default",
  buttonClassName = "flex-1",
  buttonSize = "default",
  productName = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!issueType || !description.trim()) {
      toastError("Please select an issue type and provide a description");
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to report issues');
      }

      // Create issue report record
      const { error } = await supabase
        .from('issue_reports')
        .insert([
          {
            user_id: user.id,
            seller_id: sellerId,
            product_id: productId,
            order_id: orderId,
            issue_type: issueType,
            description: description.trim(),
            status: 'open'
          }
        ]);

      if (error) throw error;
      
      // Success!
      toastSuccess("Issue reported successfully!");
      setIssueType('');
      setDescription('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error reporting issue:', error);
      toastError(error.message || "Failed to report issue");
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
          <AlertCircle className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-primary dark:text-gray-100">
            {productName ? `Report Issue with ${productName}` : "Report an Issue"}
          </DialogTitle>
          <DialogDescription className="text-primary/70 dark:text-gray-300">
            Your report will be reviewed by our support team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="issueType" className="text-primary dark:text-gray-300">
              Issue Type
            </Label>
            <Select
              value={issueType}
              onValueChange={setIssueType}
            >
              <SelectTrigger id="issueType" className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <SelectValue placeholder="Select an issue type" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {ISSUE_TYPES.map((type) => (
                  <SelectItem 
                    key={type.value} 
                    value={type.value}
                    className="dark:text-gray-100 dark:focus:bg-gray-700"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-primary dark:text-gray-300">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Please provide details about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
            disabled={!issueType || !description.trim() || submitting}
            className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssueDialog;