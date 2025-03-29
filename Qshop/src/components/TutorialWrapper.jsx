// src/components/TutorialWrapper.jsx
import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, EVENTS } from 'react-joyride';
import { supabase } from './SupabaseClient';
import { useTutorial } from './RestartTutorialButton';

const TutorialWrapper = ({ children }) => {
  const [runTutorial, setRunTutorial] = useState(false);
  const [steps, setSteps] = useState([]);
  const { setIsTutorialActive } = useTutorial();

  useEffect(() => {
    // Check if user has completed tutorial
    const checkTutorialStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('tutorial_completed')
          .eq('id', user.id)
          .single();
        
        if (profile && profile.tutorial_completed === false) {
          setRunTutorial(true);
          setIsTutorialActive(true);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };
    
    checkTutorialStatus();
  }, []);

  useEffect(() => {
    // Define universal tutorial steps for all users
    setSteps([
      {
        target: '.navbar',
        content: 'Welcome to UniHive! This is the main navigation bar where you can access different parts of the app.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.search-bar',
        content: 'Search for products youre interested in here.',
        placement: 'bottom',
      },
      {
        target: '.category-section',
        content: 'Browse different categories to find what you need.',
        placement: 'bottom',
      },
      {
        target: '.wishlist-icon',
        content: 'Save items you like to your wishlist for later.',
        placement: 'bottom',
      },
      {
        target: '.cart-icon',
        content: 'View your shopping cart and checkout here.',
        placement: 'bottom',
      },
      {
        target: '.shop-link',
        content: 'Open your own shop and start selling products to other students!',
        placement: 'bottom',
      },
      {
        target: '.profile-section',
        content: 'Access your account settings, orders, wishlist, and profile information.',
        placement: 'bottom',
      }
    ]);
  }, []);

  const handleJoyrideCallback = async (data) => {
    const { status, type } = data;
    
    if (([STATUS.FINISHED, STATUS.SKIPPED]).includes(status)) {
      // Mark tutorial as completed
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase
            .from('profiles')
            .update({ tutorial_completed: true })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('Error updating tutorial status:', error);
      }
      
      setRunTutorial(false);
      setIsTutorialActive(false);
    }
    
    // If user clicks "skip", end the tutorial
    if (type === EVENTS.STEP_AFTER && status === STATUS.SKIPPED) {
      setRunTutorial(false);
      setIsTutorialActive(false);
    }
  };

  return (
    <>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton={false}
        run={runTutorial}
        scrollToFirstStep
        showProgress
        showSkipButton
        steps={steps}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#E7C65F',
            backgroundColor: '#113b1e',
            textColor: '#fff',
            arrowColor: '#113b1e',
            overlayColor: 'rgba(0, 0, 0, 0.5)'
          },
          buttonNext: {
            backgroundColor: '#E7C65F',
            color: '#113b1e',
            fontSize: 14,
          },
          buttonBack: {
            color: '#E7C65F',
            fontSize: 14,
          },
          buttonSkip: {
            color: '#fff',
            fontSize: 14,
          },
          tooltip: {
            borderRadius: 8,
            fontSize: 15,
          }
        }}
      />
      {children}
    </>
  );
};

export default TutorialWrapper;