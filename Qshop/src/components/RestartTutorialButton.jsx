// src/components/RestartTutorialButton.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Local storage keys - MUST match TutorialWrapper
const TUTORIAL_COMPLETED_KEY = 'unihive_tutorial_completed';
const TUTORIAL_PROGRESS_KEY = 'unihive_tutorial_progress';
const MYSHOP_INTRO_COMPLETED_KEY = 'unihive_myshop_intro_completed';
const ORDERS_TUTORIAL_PENDING_KEY = 'unihive_orders_tutorial_pending';

// Create the context
export const TutorialContext = createContext({
  restartTutorial: () => {},
  isTutorialActive: false,
  setIsTutorialActive: () => {},
  isInitialized: false
});

// Hook to use the tutorial context
export const useTutorial = () => useContext(TutorialContext);

// Provider component
export const TutorialProvider = ({ children }) => {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  
  // Check tutorial status on component mount
  useEffect(() => {
    const checkTutorialStatus = () => {
      try {
        const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
        
        // If tutorial is not marked as completed, set it as active
        if (!tutorialCompleted) {
          setIsTutorialActive(true);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    checkTutorialStatus();
  }, []);
  
  const restartTutorial = () => {
    try {
      console.log('🔄 Restarting tutorial...');
      
      // Clear ALL tutorial-related localStorage keys
      localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
      localStorage.removeItem(TUTORIAL_PROGRESS_KEY);
      localStorage.removeItem(MYSHOP_INTRO_COMPLETED_KEY);
      localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
      
      // Set as new user to trigger tutorial
      localStorage.setItem('isNewUser', 'true');
      
      // Activate tutorial
      setIsTutorialActive(true);
      
      toast.success("Tutorial will restart at MyShop");
      
      // Navigate to MyShop where tutorial starts
      navigate('/myshop');
      
      // Reload after navigation to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error restarting tutorial:', error);
      toast.error("Failed to restart tutorial");
    }
  };
  
  return (
    <TutorialContext.Provider value={{ 
      restartTutorial, 
      isTutorialActive, 
      setIsTutorialActive,
      isInitialized
    }}>
      {children}
    </TutorialContext.Provider>
  );
};

// Button component that can be placed in the UI
const RestartTutorialButton = ({ 
  variant = "outline", 
  size = "default", 
  className = "",
  showIcon = true,
  children
}) => {
  const { restartTutorial, isTutorialActive } = useTutorial();
  
  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={restartTutorial}
      disabled={isTutorialActive}
    >
      {showIcon && <HelpCircle className="h-4 w-4 mr-2" />}
      {children || "Restart Tutorial"}
    </Button>
  );
};

export default RestartTutorialButton;