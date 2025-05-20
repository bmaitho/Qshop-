// src/components/TosBanner.jsx
import React, { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

const TosBanner = ({ onViewToS }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Check if user has already seen the banner
    const hasDismissedToSBanner = localStorage.getItem('hasDismissedToSBanner') === 'true';
    
    if (!hasDismissedToSBanner) {
      setIsVisible(true);
    }
  }, []);
  
  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('hasDismissedToSBanner', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-[#0D2B20] text-white shadow-md mb-6 rounded-lg overflow-hidden">
      <div className="p-4 flex items-start md:items-center justify-between">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-[#E7C65F] flex-shrink-0 mt-0.5 md:mt-0" />
          <div>
            <p className="font-medium">Seller Terms of Service</p>
            <p className="text-sm text-gray-200 mt-1">
              Please review our Terms of Service before selling items in your shop. By listing products, you agree to follow our marketplace rules.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={onViewToS}
            className="whitespace-nowrap bg-[#E7C65F] text-[#0D2B20] hover:bg-[#E7C65F]/90"
          >
            View Terms
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TosBanner;