// src/components/RestartTutorialButton.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Local storage keys for tutorial state
const TUTORIAL_COMPLETED_KEY = 'unihive_tutorial_completed';
const TUTORIAL_PROGRESS_KEY = 'unihive_tutorial_progress';

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
      // Reset tutorial status in local storage
      localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
      localStorage.removeItem(TUTORIAL_PROGRESS_KEY);
      
      setIsTutorialActive(true);
      toast.success("Tutorial will restart on the home page");
      
      // First navigate to the home page where tutorial starts
      navigate('/home');
      
      // Then reload after a short delay to ensure navigation completes
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