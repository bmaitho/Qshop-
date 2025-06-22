// src/components/TutorialWrapper.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { X } from 'lucide-react';
import { useTutorial } from './RestartTutorialButton';

// Import the tutorial steps
import {
  getHomeSteps,
  getMarketplaceSteps,
  getMyShopSteps,
  getOrdersSteps,
  getAddProductSteps,
  getFallbackSteps
} from '../utils/tutorialSteps';

// Local storage keys for tutorial state
const TUTORIAL_COMPLETED_KEY = 'unihive_tutorial_completed';
const TUTORIAL_PROGRESS_KEY = 'unihive_tutorial_progress';
const MYSHOP_TUTORIAL_COMPLETED_KEY = 'unihive_myshop_tutorial_completed';
const ORDERS_TUTORIAL_PENDING_KEY = 'unihive_orders_tutorial_pending';

const TutorialWrapper = ({ children }) => {
  const { isTutorialActive, setIsTutorialActive } = useTutorial();
  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [ready, setReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  // Special modes
  const [addProductMode, setAddProductMode] = useState(false);
  const [ordersMode, setOrdersMode] = useState(false);
  
  const targetCheckerRef = useRef(null);
  const ordersCheckInterval = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(
    localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true'
  );
  
  // Check if mobile or touch experience for appropriate steps
  const isMobileExperience = isMobile || isTouchDevice;
  
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

  // NEW: Check for new users and initialize tutorial
  useEffect(() => {
    // Only check if tutorial system is initialized and not already completed
    if (!isTutorialActive || hasCompletedTutorial) return;
    
    const checkForNewUser = () => {
      const isNewUser = localStorage.getItem('isNewUser') === 'true';
      const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
      
      console.log('New user check:', { 
        isNewUser, 
        tutorialCompleted, 
        isTutorialActive,
        currentPath: location.pathname,
        hasCompletedTutorial
      });
      
      // Start tutorial for new users who haven't completed it
      if (isNewUser && !tutorialCompleted && !hasCompletedTutorial) {
        console.log('🎯 Starting tutorial for new user');
        setIsTutorialActive(true);
        setRunTutorial(true);
        
        // Clear the new user flag after starting tutorial
        localStorage.removeItem('isNewUser');
        
        // Navigate to home if not already there to start tutorial
        if (location.pathname !== '/home' && location.pathname !== '/complete-profile') {
          console.log('📍 Navigating to home to start tutorial');
          navigate('/home');
        }
      }
    };

    // Small delay to ensure everything is ready
    const timer = setTimeout(checkForNewUser, 1000);
    return () => clearTimeout(timer);
  }, [isTutorialActive, setIsTutorialActive, location.pathname, navigate, hasCompletedTutorial]);

  // Handle route changes - pause tutorial and reset
  useEffect(() => {
    if (runTutorial) {
      setRunTutorial(false);
    }
    setReady(false);
    
    // Reset special modes when changing routes
    setAddProductMode(false);
    setOrdersMode(false);
    
    // If leaving MyShop, clear the pending orders tutorial flag
    if (location.pathname !== '/myshop') {
      localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
    }
    
    // Wait for the page to load before checking for elements
    const timer = setTimeout(() => {
      setReady(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Start the tutorial when the page is ready
  useEffect(() => {
    // Check local storage for tutorial status
    const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
    
    // If tutorial is already completed, don't activate it again
    if (tutorialCompleted) {
      setIsTutorialActive(false);
      setHasCompletedTutorial(true);
    } else {
      setIsTutorialActive(true);
    }
  }, []);

  // Clear intervals when component unmounts
  useEffect(() => {
    return () => {
      if (ordersCheckInterval.current) {
        clearInterval(ordersCheckInterval.current);
      }
    };
  }, []);

  // Check for Orders tab activation and trigger Orders tutorial
  useEffect(() => {
    // Only run this check if we're on the MyShop page, the tutorial is active,
    // and the Orders tutorial is pending
    const shouldCheckForOrdersTab = 
      location.pathname === '/myshop' && 
      isTutorialActive && 
      !hasCompletedTutorial &&
      localStorage.getItem(ORDERS_TUTORIAL_PENDING_KEY) === 'true';
    
    if (!shouldCheckForOrdersTab) {
      // Clear any existing interval
      if (ordersCheckInterval.current) {
        clearInterval(ordersCheckInterval.current);
        ordersCheckInterval.current = null;
      }
      return;
    }
    
    // Function to check if Orders tab is active
    const checkOrdersTabActive = () => {
      try {
        // Check for visual indicators that Orders tab is active
        const ordersTabActive = document.querySelector('[value="orders"][aria-selected="true"]');
        
        if (ordersTabActive) {
          if (debugMode) {
            console.log('Orders tab is active - starting Orders tutorial');
          }
          
          // Clear the interval since we found what we were looking for
          clearInterval(ordersCheckInterval.current);
          ordersCheckInterval.current = null;
          
          // Start the Orders tutorial
          startOrdersTutorial();
        }
      } catch (error) {
        console.error('Error checking for Orders tab:', error);
      }
    };
    
    // Set up interval to check for Orders tab activation
    if (!ordersCheckInterval.current) {
      ordersCheckInterval.current = setInterval(checkOrdersTabActive, 500);
      
      // Initial check
      checkOrdersTabActive();
    }
    
    return () => {
      if (ordersCheckInterval.current) {
        clearInterval(ordersCheckInterval.current);
        ordersCheckInterval.current = null;
      }
    };
  }, [location.pathname, isTutorialActive, hasCompletedTutorial]);

  // Detect if add product dialog/sheet is open
  useEffect(() => {
    if (!ready || hasCompletedTutorial) return;
    
    // Check for add product dialog/sheet
    const addProductCheck = () => {
      const sheetHeader = document.querySelector('h2:contains("Add New Product"), h3:contains("Add New Product")');
      const productNameInput = document.getElementById('name');
      
      if (productNameInput || sheetHeader) {
        return true;
      }
      return false;
    };
    
    // Set up interval to check for special sheets
    const checkInterval = setInterval(() => {
      if (location.pathname === '/myshop') {
        const isAddProduct = addProductCheck();
        
        if (isAddProduct && !addProductMode) {
          setAddProductMode(true);
          setStepIndex(0);
          setRunTutorial(true);
        }
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, [ready, location.pathname, hasCompletedTutorial]);

  // Function to explicitly start the Orders tutorial
  const startOrdersTutorial = () => {
    // Only start if we're not already in orders mode
    if (!ordersMode) {
      // Clear any existing tutorial
      setRunTutorial(false);
      
      // Set up the Orders tutorial
      setOrdersMode(true);
      setAddProductMode(false);
      setStepIndex(0);
      
      // Mark Orders tutorial as no longer pending
      localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
      
      // Delay slightly to ensure UI is ready
      setTimeout(() => {
        setRunTutorial(true);
      }, 300);
    }
  };
  
  // Function to mark the MyShop part as completed and set Orders as pending
  const completeMyShopTutorial = () => {
    localStorage.setItem(MYSHOP_TUTORIAL_COMPLETED_KEY, 'true');
    localStorage.setItem(ORDERS_TUTORIAL_PENDING_KEY, 'true');
    
    // Stop the current tutorial
    setRunTutorial(false);
    
    // Look for the Orders tab and try to click it
    const ordersTab = document.querySelector('.orders-tab, [value="orders"]');
    if (ordersTab) {
      if (debugMode) {
        console.log('MyShop tutorial completed - trying to click Orders tab');
      }
      
      // Try to programmatically click the Orders tab
      try {
        ordersTab.click();
      } catch (error) {
        console.error('Failed to click Orders tab:', error);
      }
    } else {
      if (debugMode) {
        console.warn('Orders tab not found');
      }
    }
  };
  
  // Function to mark the complete tutorial as done
  const completeFullTutorial = () => {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    localStorage.removeItem(MYSHOP_TUTORIAL_COMPLETED_KEY);
    localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
    localStorage.removeItem('isNewUser'); // NEW: Clear new user flag
    setRunTutorial(false);
    setIsTutorialActive(false);
    setHasCompletedTutorial(true); // NEW: Update state
    
    if (debugMode) {
      console.log('Full tutorial completed and marked as done');
    }
  };
  
  // Get appropriate steps based on current state
  const getStepsForCurrentPage = () => {
    // Handle special modes first
    if (addProductMode) {
      return getAddProductSteps();
    }
    
    if (ordersMode) {
      return getOrdersSteps();
    }
    
    if (fallbackMode) {
      return getFallbackSteps();
    }
    
    // Normal page-based steps
    switch (location.pathname) {
      case '/':
      case '/home':
        return getHomeSteps(isMobileExperience);
      case '/studentmarketplace':
        return getMarketplaceSteps(isMobileExperience);
      case '/myshop':
        return getMyShopSteps(isMobileExperience);
      default:
        return getFallbackSteps();
    }
  };
  
  // Check if current page has tutorial targets
  const checkCurrentPageHasTargets = () => {
    const steps = getStepsForCurrentPage();
    
    // Check if at least one target exists
    for (const step of steps) {
      if (step.target && step.target !== 'body') {
        const element = document.querySelector(step.target);
        if (element) {
          return true;
        }
      }
    }
    
    return steps.length > 0; // At least return true if we have steps with body targets
  };
  
  // Handle joyride callback
  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;
    
    // If we're in a special mode, use appropriate steps
    let steps = [];
    if (addProductMode) {
      steps = getAddProductSteps();
    } else if (ordersMode) {
      steps = getOrdersSteps();
    } else if (fallbackMode) {
      steps = getFallbackSteps();
    } else {
      steps = getStepsForCurrentPage();
    }
    
    // Handle tutorial completed or skipped
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // NEW: Enhanced completion handling
      console.log('🎉 Tutorial completed via callback');
      
      // If we're in add product mode, just exit that mode and continue
      if (addProductMode) {
        setAddProductMode(false);
        
        // Wait a moment before continuing regular tutorial
        setTimeout(() => {
          if (location.pathname === '/myshop') {
            setStepIndex(0);
            setRunTutorial(true);
          }
        }, 500);
        
        return;
      }
      
      // If we're in orders mode, mark the full tutorial as complete
      if (ordersMode) {
        completeFullTutorial();
        return;
      }
      
      // If we're on MyShop page and finished the steps, mark it as complete and set up Orders tutorial
      if (location.pathname === '/myshop' && !ordersMode) {
        completeMyShopTutorial();
        return;
      }
      
      // Default case - if user skipped, mark as complete
      completeFullTutorial();
      return;
    }
    
    // Handle step after actions
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        const nextIndex = index + 1;
        
        // Check if we've reached the end of steps for this page
        if (nextIndex >= steps.length) {
          setRunTutorial(false);
          
          // Only navigate automatically if we're not in a special mode
          if (!addProductMode && !ordersMode) {
            // Navigate based on current page
            if (location.pathname === '/' || location.pathname === '/home') {
              navigate('/studentmarketplace');
            } else if (location.pathname === '/studentmarketplace' || location.pathname.includes('/search')) {
              navigate('/myshop');
            } else if (location.pathname === '/myshop') {
              // Completed MyShop tutorial, mark it as done and set up Orders tutorial
              completeMyShopTutorial();
            }
          } else if (ordersMode) {
            // If we've completed all orders steps, mark the full tutorial as done
            completeFullTutorial();
          }
        } else {
          setStepIndex(nextIndex);
        }
      } else if (action === ACTIONS.PREV) {
        setStepIndex(Math.max(0, index - 1));
      }
    }
  };
  
  // Effects for checking tutorial targets and starting tutorial
  useEffect(() => {
    // If tutorial has been completed, don't run it
    if (!ready || !isTutorialActive || hasCompletedTutorial) return;
    
    clearTimeout(targetCheckerRef.current);
    
    // Check if MyShop tutorial is already completed
    const myShopCompleted = localStorage.getItem(MYSHOP_TUTORIAL_COMPLETED_KEY) === 'true';
    
    // If Orders tutorial is pending, don't start a new tutorial automatically
    const ordersPending = localStorage.getItem(ORDERS_TUTORIAL_PENDING_KEY) === 'true';
    
    // Delay a bit to make sure all elements are rendered
    targetCheckerRef.current = setTimeout(() => {
      // For special modes, always run tutorial
      if (addProductMode) {
        setStepIndex(0);
        setRunTutorial(true);
        if (debugMode) {
          console.log('Starting Add Product tutorial');
        }
        return;
      }
      
      if (ordersMode) {
        setStepIndex(0);
        setRunTutorial(true);
        if (debugMode) {
          console.log('Starting Orders tutorial');
        }
        return;
      }
      
      // If we're on MyShop page and MyShop tutorial is completed and Orders is pending,
      // don't start a new tutorial - wait for Orders tab to be active
      if (location.pathname === '/myshop' && myShopCompleted && ordersPending) {
        if (debugMode) {
          console.log('MyShop tutorial completed, waiting for Orders tab activation');
        }
        return;
      }
      
      // Check if the elements exist before starting the tutorial
      if (checkCurrentPageHasTargets()) {
        setStepIndex(0);
        setRunTutorial(true);
        if (debugMode) {
          console.log(`Starting tutorial for ${location.pathname}`);
        }
      } else {
        // If no targets found, try fallback mode
        if (!fallbackMode) {
          setFallbackMode(true);
          setStepIndex(0);
          setRunTutorial(true);
          if (debugMode) {
            console.log('No targets found, using fallback tutorial');
          }
        }
      }
    }, 1500);
    
    return () => clearTimeout(targetCheckerRef.current);
  }, [ready, location.pathname, isTutorialActive, hasCompletedTutorial, addProductMode, ordersMode]);

  // Get active steps for display
  const activeSteps = getStepsForCurrentPage();

  // Joyride configuration
  const joyrideProps = {
    steps: activeSteps,
    stepIndex,
    continuous: true,
    showProgress: true,
    showSkipButton: true,
    run: runTutorial && isTutorialActive && !hasCompletedTutorial,
    callback: handleJoyrideCallback,
    styles: {
      options: {
        primaryColor: '#e7c65f',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        overlayColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
      },
      buttonNext: {
        backgroundColor: '#e7c65f',
        color: '#0e1a19',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: '500',
      },
      buttonBack: {
        color: '#666',
        marginRight: '10px',
      },
      buttonSkip: {
        color: '#999',
      },
      tooltip: {
        borderRadius: '8px',
        fontSize: '14px',
      },
      tooltipTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#0e1a19',
      },
      tooltipContent: {
        color: '#333',
        lineHeight: '1.5',
      },
    },
    locale: {
      back: 'Back',
      close: 'Close',
      last: 'Finish',
      next: 'Next',
      skip: 'Skip Tutorial',
    },
  };

  // Debug panel component
  const DebugPanel = () => (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs z-[1001] max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">Tutorial Debug</span>
        <button onClick={() => setDebugMode(false)}>
          <X className="h-3 w-3" />
        </button>
      </div>
      <div>Tutorial: {isTutorialActive ? 'Active' : 'Inactive'}</div>
      <div>Running: {runTutorial ? 'Yes' : 'No'}</div>
      <div>Step: {stepIndex + 1}/{activeSteps.length}</div>
      <div>Mode: {addProductMode ? 'AddProduct' : ordersMode ? 'Orders' : 'Normal'}</div>
      <div>Completed: {hasCompletedTutorial ? 'Yes' : 'No'}</div>
      <div>Path: {location.pathname.substring(0, 15)}</div>
      <div className="flex gap-1 mt-1">
        <button 
          onClick={() => setRunTutorial(!runTutorial)} 
          className="bg-blue-500 px-2 py-1 rounded"
        >
          {runTutorial ? 'Stop' : 'Start'}
        </button>
        <button 
          onClick={() => {
            setOrdersMode(!ordersMode);
            setAddProductMode(false);
          }} 
          className="bg-purple-500 px-2 py-1 rounded"
        >
          {ordersMode ? 'Exit Orders' : 'Orders'}
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
        <button 
          onClick={() => {
            localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
            localStorage.removeItem(MYSHOP_TUTORIAL_COMPLETED_KEY);
            localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
            localStorage.setItem('isNewUser', 'true'); // NEW: Reset new user flag
            setIsTutorialActive(true);
            setHasCompletedTutorial(false);
            setFallbackMode(false);
            setAddProductMode(false);
            setOrdersMode(false);
            setStepIndex(0);
            setRunTutorial(true);
          }} 
          className="bg-green-500 px-2 py-1 rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Joyride {...joyrideProps} />
      {debugMode && <DebugPanel />}
      {children}
    </>
  );
};

export default TutorialWrapper;