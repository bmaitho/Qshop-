// src/components/ProfileDisplayFixes.jsx
// These are reusable components for better profile display throughout the app

import React from 'react';
import { User, Phone, Mail, MapPin } from 'lucide-react';
import { getDisplayInfo } from '../utils/communicationUtils';

/**
 * Enhanced User Avatar with fallbacks
 */
export const UserAvatar = ({ profile, size = 'md', className = '' }) => {
  const displayInfo = getDisplayInfo(profile);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };
  
  return (
    <div className={`
      ${sizeClasses[size]} 
      bg-gray-100 rounded-full flex items-center justify-center 
      ${className}
    `}>
      <span className="font-medium text-gray-700">
        {displayInfo.initials}
      </span>
    </div>
  );
};

/**
 * User Info Display with graceful fallbacks
 */
export const UserInfoDisplay = ({ 
  profile, 
  showContact = true, 
  showLocation = true, 
  compact = false 
}) => {
  const displayInfo = getDisplayInfo(profile);
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <UserAvatar profile={profile} size="sm" />
        <span className="font-medium">{displayInfo.name}</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <UserAvatar profile={profile} />
        <div>
          <p className="font-medium">{displayInfo.name}</p>
          <p className="text-xs text-gray-500">User</p>
        </div>
      </div>
      
      {showContact && (
        <div className="space-y-1">
          {displayInfo.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-3 w-3" />
              <span>{displayInfo.phone}</span>
            </div>
          )}
          
          {displayInfo.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-3 w-3" />
              <span>{displayInfo.email}</span>
            </div>
          )}
          
          {!displayInfo.phone && !displayInfo.email && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Mail className="h-3 w-3" />
              <span>Contact via messages</span>
            </div>
          )}
        </div>
      )}
      
      {showLocation && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-3 w-3" />
          <span>{displayInfo.location}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Seller Info Card for Checkout/Order pages
 */
export const SellerInfoCard = ({ sellerProfile, className = '' }) => {
  const displayInfo = getDisplayInfo(sellerProfile);
  
  return (
    <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
      <h3 className="font-medium mb-3">Seller Information</h3>
      <UserInfoDisplay 
        profile={sellerProfile} 
        showContact={true} 
        showLocation={true} 
      />
    </div>
  );
};

/**
 * Buyer Info Card for Seller Order Details
 */
export const BuyerInfoCard = ({ buyerProfile, orderInfo = null, className = '' }) => {
  const displayInfo = getDisplayInfo(buyerProfile);
  
  return (
    <div className={`p-4 bg-blue-50 rounded-lg ${className}`}>
      <h3 className="font-medium mb-3">Buyer Information</h3>
      <UserInfoDisplay 
        profile={buyerProfile} 
        showContact={true} 
        showLocation={true} 
      />
      
      {orderInfo?.delivery_option && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-1">Delivery Preference</p>
          <p className="text-sm text-blue-600 capitalize">{orderInfo.delivery_option}</p>
          {orderInfo.delivery_address && (
            <p className="text-xs text-blue-600 mt-1">{orderInfo.delivery_address}</p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Contact Methods Display
 */
export const ContactMethodsDisplay = ({ profile, className = '' }) => {
  const displayInfo = getDisplayInfo(profile);
  
  const availableMethods = [];
  
  if (displayInfo.phone) {
    availableMethods.push({
      type: 'phone',
      value: displayInfo.phone,
      icon: Phone,
      label: 'Phone'
    });
  }
  
  if (displayInfo.email) {
    availableMethods.push({
      type: 'email',
      value: displayInfo.email,
      icon: Mail,
      label: 'Email'
    });
  }
  
  // Always include in-app messaging
  availableMethods.push({
    type: 'message',
    value: 'Available',
    icon: User,
    label: 'In-app Messages'
  });
  
  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">Contact Methods</h4>
      {availableMethods.map((method, index) => {
        const IconComponent = method.icon;
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <IconComponent className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">{method.label}:</span>
            <span className="text-gray-800">{method.value}</span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Enhanced Checkout Seller Display
 */
export const CheckoutSellerDisplay = ({ orderItems }) => {
  if (!orderItems || orderItems.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Seller information not available</p>
      </div>
    );
  }

  // Group by seller if multiple sellers
  const sellerGroups = orderItems.reduce((groups, item) => {
    const sellerId = item.seller_id;
    if (!groups[sellerId]) {
      groups[sellerId] = {
        seller: item.profiles || {},
        items: []
      };
    }
    groups[sellerId].items.push(item);
    return groups;
  }, {});

  return (
    <div className="space-y-4">
      {Object.values(sellerGroups).map((group, index) => (
        <SellerInfoCard 
          key={index}
          sellerProfile={group.seller}
          className="border border-gray-200"
        />
      ))}
    </div>
  );
};

/**
 * Order Item Display with fallbacks
 */
export const OrderItemDisplay = ({ orderItem, showSeller = false, showBuyer = false }) => {
  const product = orderItem.products || {};
  const seller = orderItem.profiles || {};
  
  return (
    <div className="flex gap-4 p-4 border rounded-lg">
      {/* Product Image */}
      {product.image_url ? (
        <img 
          src={product.image_url} 
          alt={product.name || 'Product'}
          className="w-16 h-16 object-cover rounded"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-gray-400 text-xs">No Image</span>
        </div>
      )}
      
      {/* Product Info */}
      <div className="flex-1">
        <h3 className="font-medium">{product.name || 'Product Name Not Available'}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">
          {product.description || 'No description available'}
        </p>
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-600">
            Qty: {orderItem.quantity} × KES {orderItem.price_per_unit?.toLocaleString() || '0'}
          </span>
          <span className="font-medium">
            KES {orderItem.subtotal?.toLocaleString() || '0'}
          </span>
        </div>
        
        {/* Seller Info */}
        {showSeller && (
          <div className="mt-2 pt-2 border-t">
            <UserInfoDisplay profile={seller} compact={true} />
          </div>
        )}
        
        {/* Buyer Info */}
        {showBuyer && orderItem.orders && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm text-gray-600">
              Buyer: Order #{orderItem.orders.id?.slice(-8) || 'Unknown'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Profile Completion Prompt
 */
export const ProfileCompletionPrompt = ({ profile, onComplete }) => {
  const displayInfo = getDisplayInfo(profile);
  const missingFields = [];
  
  if (!profile?.phone) missingFields.push('phone number');
  if (!profile?.email) missingFields.push('email address');
  if (!profile?.campus_location) missingFields.push('campus location');
  
  if (missingFields.length === 0) return null;
  
  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <User className="h-5 w-5 text-yellow-600" />
        <h3 className="font-medium text-yellow-800">Complete Your Profile</h3>
      </div>
      <p className="text-sm text-yellow-700 mb-3">
        Adding your {missingFields.join(' and ')} will help other users contact you more easily.
      </p>
      <button
        onClick={onComplete}
        className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
      >
        Complete Profile
      </button>
    </div>
  );
};

// Export all components for easy importing
export default {
  UserAvatar,
  UserInfoDisplay,
  SellerInfoCard,
  BuyerInfoCard,
  ContactMethodsDisplay,
  CheckoutSellerDisplay,
  OrderItemDisplay,
  ProfileCompletionPrompt
};