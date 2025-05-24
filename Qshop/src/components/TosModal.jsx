// src/components/TosModal.jsx
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import tosImage from '../assets/tos-image.jpg';

const TosModal = ({ isOpen, onClose }) => {
  // Close modal on escape key press
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    // Lock body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'visible';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-hidden relative animate-in fade-in-50 zoom-in-95">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary dark:text-gray-100">Terms of Service</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="overflow-y-auto p-4 max-h-[70vh]">
          <img 
            src={tosImage} 
            alt="Terms of Service" 
            className="w-full h-auto"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/api/placeholder/800/600";
              console.error("Failed to load ToS image");
            }}
          />
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button 
            onClick={onClose} 
            className="bg-secondary text-primary hover:bg-secondary/90 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TosModal;