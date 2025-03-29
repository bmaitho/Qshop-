// src/components/TutorialWrapper.jsx
import React, { useState, useEffect, useRef } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { supabase } from './SupabaseClient';
import { useTutorial } from './RestartTutorialButton';
import { X } from 'lucide-react';

const TutorialWrapper = ({ children }) => {
  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [ready, setReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const { setIsTutorialActive } = useTutorial();
  const targetCheckerRef = useRef(null);

  // Handle responsive design and touch detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Better detection of touch devices
    const detectTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        navigator.msMaxTouchPoints > 0
      );
    };
    
    detectTouch();
    handleResize();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('resize', detectTouch);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', detectTouch);
    };
  }, []);

  // Check for debug mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') {
      setDebugMode(true);
      console.log('Tutorial debug mode activated');
    }
  }, []);

  // Check user tutorial status
  useEffect(() => {
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
          // Don't start immediately - wait for elements to be ready
          setIsTutorialActive(true);
          
          if (debugMode) {
            console.log('User needs tutorial, waiting for app to load...');
          }
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };
    
    checkTutorialStatus();
  }, [debugMode]);

  // Set up DOM checking
  useEffect(() => {
    // This ensures the app has rendered before checking for elements
    const timer = setTimeout(() => {
      setReady(true);
      if (debugMode) console.log('App ready, checking for tutorial target elements');
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [debugMode]);

  // Determine if we're using mobile experience
  const isMobileExperience = isMobile || isTouchDevice;

  // Check if tutorial targets exist and start tutorial when ready
  useEffect(() => {
    if (!ready) return;
    
    clearInterval(targetCheckerRef.current);
    
    let attempts = 0;
    const maxAttempts = 5;
    
    // Continuously check for DOM elements to ensure they exist before starting
    targetCheckerRef.current = setInterval(() => {
      // Mobile elements to check
      const mobileNavbarExists = !!document.querySelector('.fixed.bottom-2') || 
                               !!document.querySelector('.mobile-navbar') ||
                               !!document.querySelector('.fixed.top-1');
      
      // Desktop elements to check
      const desktopNavbarExists = !!document.querySelector('.navbar');
      
      // Common elements
      const pageContentExists = !!document.querySelector('.max-w-7xl') || 
                               !!document.querySelector('.container');
      
      const categoryExists = !!document.querySelector('.category-section');
      
      // Determine if key elements exist based on device type
      const elementsExist = isMobileExperience ? 
        (mobileNavbarExists && pageContentExists) : 
        (desktopNavbarExists && pageContentExists);
      
      if (debugMode) {
        console.log('Tutorial target check:', {
          attempt: attempts + 1,
          mobileNavbarExists,
          desktopNavbarExists,
          pageContentExists,
          categoryExists,
          isMobileExperience,
          elementsExist
        });
      }
      
      if (elementsExist) {
        if (debugMode) console.log('Tutorial targets found, starting tutorial');
        setRunTutorial(true);
        clearInterval(targetCheckerRef.current);
      } else {
        attempts++;
        
        if (attempts >= maxAttempts) {
          // Switch to fallback mode if elements not found
          if (debugMode) console.log('Tutorial targets not found after multiple attempts, using fallback mode');
          setFallbackMode(true);
          setRunTutorial(true);
          clearInterval(targetCheckerRef.current);
        }
      }
    }, 800);
    
    // Clean up interval
    return () => clearInterval(targetCheckerRef.current);
  }, [ready, isMobileExperience, debugMode]);

  // Define steps based on device type
  const getSteps = () => {
    if (isMobileExperience) {
      return [
        {
          content: 'Welcome to UniHive! Let\'s learn how to use the app.',
          placement: 'center',
          target: 'body',
          disableBeacon: true,
          spotlightClicks: false,
        },
        {
          content: 'This is the main navigation. Tap these icons to move between different sections.',
          placement: 'top',
          target: '.fixed.bottom-2, .mobile-navbar',
          disableBeacon: true,
        },
        {
          content: 'Browse different categories to find what you need.',
          placement: 'bottom',
          target: '.category-section',
          disableBeacon: true,
        },
        {
          content: 'View your shopping cart and checkout here.',
          placement: 'top',
          target: 'a[href="/cart"]',
          disableBeacon: true,
        },
        {
          content: 'Access your account settings, orders, and profile information.',
          placement: 'top',
          target: 'a[href="/profile"]',
          disableBeacon: true,
        }
      ];
    } else {
      return [
        {
          content: 'Welcome to UniHive! Let\'s learn how to use the app.',
          placement: 'center',
          target: 'body',
          disableBeacon: true,
          spotlightClicks: false,
        },
        {
          content: 'This is the main navigation bar where you can access different parts of the app.',
          placement: 'bottom',
          target: '.navbar',
          disableBeacon: true,
        },
        {
          content: 'Search for products you\'re interested in here.',
          placement: 'bottom',
          target: 'form input[type="search"]',
          disableBeacon: true,
        },
        {
          content: 'Browse different categories to find what you need.',
          placement: 'bottom',
          target: '.category-section',
          disableBeacon: true,
        },
        {
          content: 'Save items you like to your wishlist for later.',
          placement: 'bottom',
          target: '.wishlist-icon',
          disableBeacon: true,
        },
        {
          content: 'View your shopping cart and checkout here.',
          placement: 'bottom',
          target: '.cart-icon',
          disableBeacon: true,
        },
        {
          content: 'Access your account settings, orders, and profile information.',
          placement: 'bottom',
          target: '.profile-section',
          disableBeacon: true,
        }
      ];
    }
  };

  // Fallback tutorial uses body element for all steps
  const getFallbackSteps = () => [
    {
      content: 'Welcome to UniHive! This is your student marketplace.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      content: 'You can navigate using the menu at the bottom of the screen.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      content: 'Browse products by category or search for specific items.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      content: 'Add items to your wishlist or cart as you shop.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      content: 'Access your profile to see orders and settings.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    }
  ];

  const handleJoyrideCallback = async (data) => {
    const { action, index, status, type } = data;
    
    // Log detailed info for debugging
    if (debugMode) {
      console.log('Joyride callback:', { action, index, status, type });
    }
    
    // Handle step changes
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }
    
    // Handle tour start
    if (type === EVENTS.TOUR_START) {
      setIsTutorialActive(true);
    }
    
    // Handle tutorial completion or skipping
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Mark tutorial as completed
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase
            .from('profiles')
            .update({ tutorial_completed: true })
            .eq('id', user.id);
            
          if (debugMode) console.log('Tutorial marked as completed');
        }
      } catch (error) {
        console.error('Error updating tutorial status:', error);
      }
      
      setRunTutorial(false);
      setIsTutorialActive(false);
    }
  };

  // Get the appropriate steps based on mode
  const activeSteps = fallbackMode ? getFallbackSteps() : getSteps();

  // Custom components for better mobile experience
  const joyrideProps = {
    callback: handleJoyrideCallback,
    continuous: true,
    stepIndex: stepIndex,
    steps: activeSteps,
    run: runTutorial,
    scrollToFirstStep: true,
    showProgress: true,
    showSkipButton: true,
    disableCloseOnEsc: false,
    disableOverlayClose: true,
    spotlightClicks: fallbackMode ? true : false,
    spotlightPadding: isMobileExperience ? 40 : 15,
    styles: {
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
        borderRadius: 4,
        padding: '8px 16px',
      },
      buttonBack: {
        color: '#E7C65F',
        fontSize: 14,
        marginRight: 10,
      },
      buttonSkip: {
        color: '#fff',
        fontSize: 14,
      },
      tooltip: {
        borderRadius: 8,
        fontSize: 15,
        padding: isMobileExperience ? '12px 15px' : '15px 20px',
        maxWidth: isMobileExperience ? '85vw' : '400px',
      },
      tooltipContent: {
        padding: '10px 5px',
        fontSize: isMobileExperience ? '14px' : '15px',
        lineHeight: '1.5',
      },
      tooltipTitle: {
        fontSize: isMobileExperience ? '16px' : '18px',
        fontWeight: 'bold',
        marginBottom: '10px',
      },
      tooltipFooter: {
        marginTop: '10px',
      },
    },
    floaterProps: {
      disableAnimation: isMobileExperience, // Disable animations which can cause rendering issues
      hideArrow: isMobileExperience, // Hide arrows on mobile which can position incorrectly
      offset: isMobileExperience ? 40 : 15, // Increase offset on mobile to improve visibility
    },
    // Custom components for better mobile UI
    tooltipComponent: isMobileExperience 
      ? ({ continuous, index, isLastStep, step, backProps, primaryProps, skipProps, tooltipProps }) => (
        <div 
          {...tooltipProps} 
          className="bg-[#113b1e] text-white p-4 rounded-lg shadow-xl max-w-[300px] mx-auto"
        >
          <button 
            className="absolute top-2 right-2 text-white/70 hover:text-white" 
            onClick={skipProps.onClick}
          >
            <X size={16} />
          </button>
          
          <div className="mb-4 mt-4">{step.content}</div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-xs text-white/70">
              {index + 1}/{activeSteps.length}
            </div>
            <div className="flex gap-2">
              {index > 0 && (
                <button 
                  {...backProps} 
                  className="text-[#E7C65F] text-sm px-3 py-1 border border-[#E7C65F] rounded"
                >
                  Back
                </button>
              )}
              <button 
                {...primaryProps} 
                className="bg-[#E7C65F] text-[#113b1e] text-sm font-medium px-4 py-1 rounded"
              >
                {isLastStep ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center justify-center mt-3 space-x-1">
            {activeSteps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? 'bg-[#E7C65F]' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      )
      : undefined
  };

  return (
    <>
      <Joyride {...joyrideProps} />
      
      {/* Debug panel */}
      {debugMode && (
        <div className="fixed top-0 right-0 bg-black/80 text-white p-2 text-xs z-[10001] max-w-[200px]">
          <div>Mobile: {isMobileExperience ? 'Yes' : 'No'}</div>
          <div>Run Tutorial: {runTutorial ? 'Yes' : 'No'}</div>
          <div>Step: {stepIndex + 1}/{activeSteps.length}</div>
          <div>Fallback: {fallbackMode ? 'Yes' : 'No'}</div>
          <div>Ready: {ready ? 'Yes' : 'No'}</div>
          <div className="flex gap-1 mt-1">
            <button 
              onClick={() => setRunTutorial(!runTutorial)} 
              className="bg-blue-500 px-2 py-1 rounded"
            >
              {runTutorial ? 'Stop' : 'Start'}
            </button>
            <button 
              onClick={() => setFallbackMode(!fallbackMode)} 
              className="bg-orange-500 px-2 py-1 rounded"
            >
              {fallbackMode ? 'Normal' : 'Fallback'}
            </button>
          </div>
          <div className="flex gap-1 mt-1">
            <button 
              onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} 
              className="bg-gray-500 px-2 py-1 rounded"
              disabled={stepIndex === 0}
            >
              Prev
            </button>
            <button 
              onClick={() => setStepIndex(Math.min(activeSteps.length - 1, stepIndex + 1))} 
              className="bg-gray-500 px-2 py-1 rounded"
              disabled={stepIndex === activeSteps.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {children}
    </>
  );
};

export default TutorialWrapper;