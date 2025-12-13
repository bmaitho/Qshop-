import React, { useState, useEffect } from 'react';
import { supabase } from '../components/SupabaseClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastSuccess, toastError } from '../utils/toastConfig';
import { MessageCircle, Send, User } from 'lucide-react';

const MessageCenter = () => {
  const [activeTab, setActiveTab] = useState('received');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  useEffect(() => {
    // Get current user and their profile on component mount
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        
        // Also fetch the profile to get the name
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setCurrentUserProfile(profile);
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMessages(activeTab);
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeConversation && currentUser) {
      fetchConversationMessages(activeConversation.otherUserId);
    }
  }, [activeConversation, currentUser]);

  const fetchMessages = async (type) => {
    try {
      setLoading(true);
      if (!currentUser) return;

      // Query based on tab type (sent or received)
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (type === 'received') {
        query = query.eq('recipient_id', currentUser.id);
      } else if (type === 'sent') {
        query = query.eq('sender_id', currentUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group messages by conversation partner
      const conversations = groupMessagesByConversation(data, currentUser.id, type);
      setMessages(conversations);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toastError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationMessages = async (otherUserId) => {
    try {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setConversationMessages(data || []);

      // Mark messages as read
      const messagesToMark = data
        .filter(msg => msg.recipient_id === currentUser.id && !msg.read)
        .map(msg => msg.id);

      if (messagesToMark.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', messagesToMark);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const groupMessagesByConversation = (messages, currentUserId, type) => {
    const conversations = {};
    
    messages.forEach(msg => {
      // Determine the other user in the conversation
      const otherUserId = type === 'received' ? msg.sender_id : msg.recipient_id;
      
      // Use the name directly from the message record
      const otherUserName = type === 'received' 
        ? (msg.sender_name || 'Unknown User') 
        : (msg.recipient_name || 'Unknown User');
      
      if (!conversations[otherUserId]) {
        conversations[otherUserId] = {
          otherUserId,
          otherUserName,
          lastMessage: msg,
          unreadCount: type === 'received' && !msg.read ? 1 : 0,
          productId: msg.product_id,
          orderId: msg.order_id
        };
      } else {
        // Only update if message is newer
        if (new Date(msg.created_at) > new Date(conversations[otherUserId].lastMessage.created_at)) {
          conversations[otherUserId].lastMessage = msg;
        }
        
        // Count unread messages for this conversation
        if (type === 'received' && !msg.read) {
          conversations[otherUserId].unreadCount += 1;
        }
      }
    });
    
    return Object.values(conversations);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !activeConversation || !currentUser || !currentUserProfile) return;
    
    try {
      // Fetch the recipient profile to get their name
      // Use maybeSingle instead of single to avoid PGRST116 error
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', activeConversation.otherUserId)
        .maybeSingle();  // <-- Changed from single() to maybeSingle()
      
      // Initialize default recipient info if query fails    
      let recipientInfo = {
        full_name: null,
        email: null
      };
      
      if (recipientProfile) {
        recipientInfo = recipientProfile;
      } else if (profileError) {
        console.warn(`Error fetching profile for recipient ID ${activeConversation.otherUserId}:`, profileError);
      } else {
        console.warn(`No profile found for recipient ID ${activeConversation.otherUserId}`);
      }
        
      const senderName = currentUserProfile.full_name || currentUser.email || currentUser.id || 'Unknown Sender';
      
      // Build recipient name with strong fallbacks
      const recipientName = recipientInfo.full_name || 
                            recipientInfo.email || 
                            activeConversation.otherUserName || 
                            activeConversation.otherUserId || 
                            'Unknown Recipient';
  
      console.log('Sending reply with recipient name:', recipientName);
      
      const { error: insertError } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: currentUser.id,
            recipient_id: activeConversation.otherUserId,
            product_id: activeConversation.productId,
            order_item_id: activeConversation.orderItemId,
            order_id: activeConversation.orderId,
            message: replyText.trim(),
            sender_name: senderName,
            recipient_name: recipientName

          }
        ]);
  
      if (insertError) throw insertError;
      
      // Clear input and refresh conversation
      setReplyText('');
      fetchConversationMessages(activeConversation.otherUserId);
      
      // Also refresh the main messages list
      fetchMessages(activeTab);
    } catch (error) {
      console.error('Error sending message:', error);
      toastError("Failed to send message");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Message List Panel */}
      <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow border border-primary/10 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-primary/10 dark:border-gray-700">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received">Received</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary/80 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-primary/60 dark:text-gray-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-primary/30 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-primary/60 dark:text-gray-400">No messages found</p>
            </div>
          ) : (
            <div className="divide-y divide-primary/10 dark:divide-gray-700">
              {messages.map(conversation => (
                <div 
                  key={conversation.otherUserId}
                  className={`p-4 cursor-pointer hover:bg-primary/5 dark:hover:bg-gray-700 ${
                    activeConversation?.otherUserId === conversation.otherUserId 
                      ? 'bg-primary/5 dark:bg-gray-700' 
                      : ''
                  }`}
                  onClick={() => setActiveConversation(conversation)}
                >
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-primary/10 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                      <User className="h-4 w-4 text-primary/60 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-medium text-sm text-primary dark:text-gray-200 truncate">
                          {conversation.otherUserName}
                        </h4>
                        <span className="text-xs text-primary/60 dark:text-gray-400">
                          {new Date(conversation.lastMessage.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-primary/70 dark:text-gray-300 truncate">
                        {conversation.lastMessage.message}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge className="mt-1 bg-secondary text-primary dark:bg-green-600 dark:text-white">
                          {conversation.unreadCount} new
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation Panel */}
      <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-primary/10 dark:border-gray-700 overflow-hidden">
        {activeConversation ? (
          <div className="flex flex-col h-full" style={{ height: '600px' }}>
            {/* Conversation Header */}
            <div className="p-4 border-b border-primary/10 dark:border-gray-700 flex items-center">
              <div className="w-10 h-10 bg-primary/10 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                <User className="h-5 w-5 text-primary/60 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium text-primary dark:text-gray-200">
                  {activeConversation.otherUserName}
                </h3>
                <p className="text-xs text-primary/60 dark:text-gray-400">
                  {activeConversation.productId ? 'Product Discussion' : 'General Conversation'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map(msg => {
                const isOwnMessage = currentUser && msg.sender_id === currentUser.id;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[75%] rounded-lg px-4 py-2 ${
                        isOwnMessage 
                          ? 'bg-secondary/80 text-primary dark:bg-green-600 dark:text-white' 
                          : 'bg-primary/10 text-primary dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <p className="break-words">{msg.message}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatDate(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t border-primary/10 dark:border-gray-700 flex items-end">
              <Textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 min-h-[80px] resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <Button
                onClick={sendReply}
                disabled={!replyText.trim()}
                className="ml-4 bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center" style={{ height: '600px' }}>
            <div>
              <MessageCircle className="h-16 w-16 text-primary/20 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary dark:text-gray-200 mb-2">
                Select a conversation
              </h3>
              <p className="text-primary/60 dark:text-gray-400 max-w-md">
                Choose a conversation from the list to view messages and reply.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageCenter;