// src/components/RestartTutorialButton.jsx
import React, { useContext } from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from 'lucide-react';
import { supabase } from './SupabaseClient';
import { toast } from 'react-toastify';

// Create a context for the tutorial control
import { createContext, useState, useEffect } from 'react';

// Create the context
export const TutorialContext = createContext({
  restartTutorial: () => {},
  isTutorialActive: false
});

// Hook to use the tutorial context
export const useTutorial = () => useContext(TutorialContext);

// Provider component
export const TutorialProvider = ({ children }) => {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  
  const restartTutorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Reset tutorial status in database
        await supabase
          .from('profiles')
          .update({ tutorial_completed: false })
          .eq('id', user.id);
          
        // Reload the page to restart the tutorial
        window.location.reload();
        
        toast.success("Tutorial will restart when the page refreshes");
      }
    } catch (error) {
      console.error('Error restarting tutorial:', error);
      toast.error("Failed to restart tutorial");
    }
  };
  
  return (
    <TutorialContext.Provider value={{ restartTutorial, isTutorialActive, setIsTutorialActive }}>
      {children}
    </TutorialContext.Provider>
  );
};

// Button component that can be placed in the UI
const RestartTutorialButton = ({ variant = "outline", size = "default", className = "" }) => {
  const { restartTutorial } = useTutorial();
  
  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={restartTutorial}
    >
      <HelpCircle className="h-4 w-4 mr-2" />
      Restart Tutorial
    </Button>
  );
};

export default RestartTutorialButton;