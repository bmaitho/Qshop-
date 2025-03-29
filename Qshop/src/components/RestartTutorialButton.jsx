// src/components/RestartTutorialButton.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from 'lucide-react';
import { supabase } from './SupabaseClient';
import { toast } from 'react-toastify';

// Create the context
export const TutorialContext = createContext({
  restartTutorial: () => {},
  isTutorialActive: false,
  setIsTutorialActive: () => {}
});

// Hook to use the tutorial context
export const useTutorial = () => useContext(TutorialContext);

// Provider component
export const TutorialProvider = ({ children }) => {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Check tutorial status on component mount
  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tutorial_completed')
            .eq('id', user.id)
            .single();
          
          if (profile && profile.tutorial_completed === false) {
            setIsTutorialActive(true);
          }
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    checkTutorialStatus();
  }, []);
  
  const restartTutorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Reset tutorial status in database
        const { error } = await supabase
          .from('profiles')
          .update({ tutorial_completed: false })
          .eq('id', user.id);
          
        if (error) {
          throw error;
        }
        
        toast.success("Tutorial will restart when the page refreshes");
        
        // Reload the page to restart the tutorial
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error("You need to be logged in to restart the tutorial");
      }
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

// Button variants: "default", "destructive", "outline", "secondary", "ghost", "link"
// Button sizes: "default", "sm", "lg", "icon"

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