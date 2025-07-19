// src/utils/communicationUtils.js

/**
 * Check if seller can mark order as shipped
 * Requires both buyer contact and buyer agreement
 */
export const canMarkAsShipped = (orderItem) => {
  return orderItem.buyer_contacted && orderItem.buyer_agreed;
};

/**
 * Get communication status for display
 */
export const getCommunicationStatus = (orderItem) => {
  if (!orderItem.buyer_contacted) {
    return {
      status: 'need_contact',
      label: 'Need Contact',
      color: 'red',
      emoji: '🔴',
      action: 'Contact Buyer'
    };
  }
  
  if (orderItem.buyer_contacted && !orderItem.buyer_agreed) {
    return {
      status: 'waiting_response',
      label: 'Waiting Response',
      color: 'yellow',
      emoji: '🟡',
      action: 'Waiting for buyer...'
    };
  }
  
  if (orderItem.buyer_contacted && orderItem.buyer_agreed) {
    return {
      status: 'ready_to_ship',
      label: 'Ready to Ship',
      color: 'green',
      emoji: '🟢',
      action: 'Mark as Shipped'
    };
  }
  
  return {
    status: 'unknown',
    label: 'Unknown',
    color: 'gray',
    emoji: '⚪',
    action: 'Check Status'
  };
};

/**
 * Smart order sorting algorithm
 * Priority: Ready to ship → Need contact → Waiting response → By age
 */
export const sortOrdersByPriority = (orders) => {
  return orders.sort((a, b) => {
    // 1. Ready to ship orders first (highest priority)
    const aReadyToShip = a.buyer_contacted && a.buyer_agreed;
    const bReadyToShip = b.buyer_contacted && b.buyer_agreed;
    
    if (aReadyToShip && !bReadyToShip) return -1;
    if (bReadyToShip && !aReadyToShip) return 1;
    
    // 2. Need contact orders next (seller action required)
    const aNeedsContact = !a.buyer_contacted;
    const bNeedsContact = !b.buyer_contacted;
    
    if (aNeedsContact && !bNeedsContact) return -1;
    if (bNeedsContact && !aNeedsContact) return 1;
    
    // 3. Sort by age (oldest first) for same priority
    return new Date(a.created_at) - new Date(b.created_at);
  });
};

/**
 * Calculate days since order was created
 */
export const getDaysSinceOrder = (createdAt) => {
  const orderDate = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - orderDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get order urgency level based on age and communication status
 */
export const getOrderUrgency = (orderItem) => {
  const daysSince = getDaysSinceOrder(orderItem.created_at);
  const commStatus = getCommunicationStatus(orderItem);
  
  // Urgent if needs contact and older than 2 days
  if (commStatus.status === 'need_contact' && daysSince >= 2) {
    return { level: 'urgent', color: 'red', label: 'URGENT' };
  }
  
  // High priority if ready to ship
  if (commStatus.status === 'ready_to_ship') {
    return { level: 'high', color: 'green', label: 'READY' };
  }
  
  // Medium if waiting response for more than 1 day
  if (commStatus.status === 'waiting_response' && daysSince >= 1) {
    return { level: 'medium', color: 'yellow', label: 'WAITING' };
  }
  
  return { level: 'normal', color: 'gray', label: 'NORMAL' };
};

/**
 * Handle profile display with fallbacks
 */
export const getDisplayInfo = (profile) => {
  return {
    name: profile?.full_name || 'User',
    email: profile?.email || null,
    phone: profile?.phone || null,
    location: profile?.campus_location || 'Location not specified',
    contact: profile?.phone || profile?.email || 'Contact via messages',
    initials: profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'
  };
};