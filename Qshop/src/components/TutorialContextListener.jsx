// src/components/TutorialContextListener.jsx
import React, { useEffect } from 'react';
import { useTutorial } from './RestartTutorialButton';

/**
 * This component listens for dialog/sheet openings in the app
 * and helps the TutorialWrapper detect when to show special tutorials
 * for shop customization, add product, etc.
 */
const TutorialContextListener = () => {
  const { isTutorialActive } = useTutorial();
  
  useEffect(() => {
    if (!isTutorialActive) return;
    
    // Helper function to check if shop settings is open
    const checkForShopSettings = () => {
      const shopSettingsSheet = document.querySelector('.SheetContent');
      if (!shopSettingsSheet) return false;
      
      const shopNameInput = shopSettingsSheet.querySelector('#shopName');
      if (shopNameInput) {
        document.dispatchEvent(new CustomEvent('shopCustomizationOpened'));
        return true;
      }
      return false;
    };
    
    // Check immediately and then set up an interval
    checkForShopSettings();
    const intervalId = setInterval(checkForShopSettings, 500);
    
    // Also set up mutation observer as a backup
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          checkForShopSettings();
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
      observer.disconnect();
    };
  }, [isTutorialActive]);
  
  return null; // This is a utility component, it doesn't render anything
};

export default TutorialContextListener;