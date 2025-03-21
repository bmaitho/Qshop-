// src/utils/messagingUtils.js
import { supabase } from '../components/SupabaseClient';
import { toastInfo } from './toastConfig';

/**
 * Get unread message count for the current user
 * @returns {Promise<number>} - The count of unread messages
 */
export const getUnreadMessageCount = async () => {
  try {
    // Properly destructure the response from getUser()
    const { data } = await supabase.auth.getUser();
    if (!data || !data.user) return 0;
    
    const user = data.user;
    
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('read', false);
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
};

/**
 * Subscribe to new messages for the current user
 * @param {Function} callback - Function to call when new message is received
 * @returns {Promise<Object|null>} - Promise resolving to subscription object or null
 */
export const subscribeToMessages = async (callback) => {
  try {
    // Get current user - properly await the Promise
    const { data } = await supabase.auth.getUser();
    if (!data || !data.user) return null;
    
    const user = data.user;
    
    // Subscribe to messages where current user is the recipient
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `recipient_id=eq.${user.id}`
      }, (payload) => {
        // Call the callback function with the new message data
        if (callback && typeof callback === 'function') {
          callback(payload.new);
        }
        
        // Also show a toast notification
        handleNewMessageNotification(payload.new);
      })
      .subscribe();
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to messages:', error);
    return null;
  }
};

/**
 * Handle displaying a notification for a new message
 * @param {Object} message - The new message object
 */
const handleNewMessageNotification = async (message) => {
  try {
    if (!message || !message.sender_id) {
      throw new Error('Invalid message data');
    }
    
    // Get sender profile info
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', message.sender_id)
      .single();
    
    if (error) throw error;
    
    // Decide what name to display
    const senderName = profile?.full_name || profile?.email || 'Someone';
    
    // Create a truncated preview of the message
    const messageText = message.message || '';
    const messagePreview = messageText.length > 30 
      ? `${messageText.substring(0, 30)}...` 
      : messageText;
    
    // Show toast notification
    toastInfo(`New message from ${senderName}: ${messagePreview}`);
  } catch (error) {
    console.error('Error handling message notification:', error);
    // Default notification if we can't get the sender details
    toastInfo('You have a new message');
  }
};

export default {
  getUnreadMessageCount,
  subscribeToMessages
};