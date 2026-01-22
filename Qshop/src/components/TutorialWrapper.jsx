// src/components/TutorialWrapper.jsx
// Streamlined version - starts at MyShop with detailed order management focus

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { X } from 'lucide-react';
import { useTutorial } from './RestartTutorialButton';

// Import the streamlined tutorial steps
import {
  getMyShopSteps,
  getOrdersSteps,
  getAddProductSteps,
  getInitialTutorialPath,
  shouldStartTutorial
} from '../utils/tutorialSteps';

// Local storage keys
const TUTORIAL_COMPLETED_KEY = 'unihive_tutorial_completed';
const MYSHOP_INTRO_COMPLETED_KEY = 'unihive_myshop_intro_completed';
const ORDERS_TUTORIAL_PENDING_KEY = 'unihive_orders_tutorial_pending';

const TutorialWrapper = ({ children }) => {
  const { isTutorialActive, setIsTutorialActive } = useTutorial();
  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [ready, setReady] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  // Tutorial modes
  const [myShopIntroMode, setMyShopIntroMode] = useState(false);
  const [ordersMode, setOrdersMode] = useState(false);
  const [addProductMode, setAddProductMode] = useState(false);
  
  const targetCheckerRef = useRef(null);
  const ordersCheckInterval = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(
    localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true'
  );
  
  const isMobileExperience = isMobile || isTouchDevice;
  
  // Handle responsive design and touch detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
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

  // NEW USER DETECTION: Start tutorial for new users
  useEffect(() => {
    if (!isTutorialActive || hasCompletedTutorial) return;
    
    const checkForNewUser = () => {
      const isNewUser = localStorage.getItem('isNewUser') === 'true';
      const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
      
      console.log('New user check:', { 
        isNewUser, 
        tutorialCompleted, 
        isTutorialActive,
        currentPath: location.pathname
      });
      
      // Start tutorial for new users who haven't completed it
      if (isNewUser && !tutorialCompleted && !hasCompletedTutorial) {
        console.log('🎯 Starting streamlined tutorial for new user');
        setIsTutorialActive(true);
        
        // Clear the new user flag after starting tutorial
        localStorage.removeItem('isNewUser');
        
        // Navigate to MyShop to start tutorial
        if (location.pathname !== '/myshop') {
          console.log('📍 Navigating to MyShop to start tutorial');
          navigate('/myshop');
        } else {
          // Already on MyShop, start intro
          setMyShopIntroMode(true);
          setRunTutorial(true);
        }
      }
    };

    const timer = setTimeout(checkForNewUser, 1000);
    return () => clearTimeout(timer);
  }, [isTutorialActive, location.pathname, navigate, hasCompletedTutorial]);

  // Handle route changes
  useEffect(() => {
    if (runTutorial && location.pathname !== '/myshop') {
      setRunTutorial(false);
    }
    setReady(false);
    
    // Reset modes when changing routes
    if (location.pathname !== '/myshop') {
      setAddProductMode(false);
      setOrdersMode(false);
      localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
    }
    
    const timer = setTimeout(() => {
      setReady(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Initialize tutorial state
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
    
    if (tutorialCompleted) {
      setIsTutorialActive(false);
      setHasCompletedTutorial(true);
    } else {
      setIsTutorialActive(true);
    }
  }, []);

  // Check for Orders tab activation
  useEffect(() => {
    const shouldCheckForOrdersTab = 
      location.pathname === '/myshop' && 
      isTutorialActive && 
      !hasCompletedTutorial &&
      localStorage.getItem(ORDERS_TUTORIAL_PENDING_KEY) === 'true';
    
    if (!shouldCheckForOrdersTab) {
      if (ordersCheckInterval.current) {
        clearInterval(ordersCheckInterval.current);
        ordersCheckInterval.current = null;
      }
      return;
    }
    
    const checkOrdersTabActive = () => {
      try {
        // Method 1: Check if any of the SellerOrders tabs are active
        const ordersTabsActive = document.querySelector(
          '[value="all"][aria-selected="true"], ' +
          '[value="urgent"][aria-selected="true"], ' +
          '[value="ready"][aria-selected="true"], ' +
          '[value="new"][aria-selected="true"], ' +
          '[value="shipped"][aria-selected="true"], ' +
          '[value="delivered"][aria-selected="true"]'
        );

        // Method 2: Check if SellerOrders content is visible
        const ordersContent = document.querySelector('.seller-orders-container') ||
                             document.querySelector('[class*="SellerOrders"]') ||
                             // Check for specific SellerOrders elements
                             document.querySelector('input[placeholder="Search by order ID"]');

        // Method 3: Check if we're on MyShop page and the orders section is visible
        const isOnOrdersSection = ordersTabsActive || ordersContent;

        if (debugMode) {
          console.log('🔍 Checking for Orders section:', {
            ordersTabsActive: !!ordersTabsActive,
            ordersContent: !!ordersContent,
            isOnOrdersSection
          });
        }

        if (isOnOrdersSection) {
          console.log('✅ Orders section is ACTIVE - starting Orders tutorial');

          // Clear the interval
          if (ordersCheckInterval.current) {
            clearInterval(ordersCheckInterval.current);
            ordersCheckInterval.current = null;
          }

          // Start the Orders tutorial
          startOrdersTutorial();
        }
      } catch (error) {
        console.error('Error checking for Orders tab:', error);
      }
    };
    
    if (!ordersCheckInterval.current) {
      ordersCheckInterval.current = setInterval(checkOrdersTabActive, 500);
      checkOrdersTabActive();
    }
    
    return () => {
      if (ordersCheckInterval.current) {
        clearInterval(ordersCheckInterval.current);
        ordersCheckInterval.current = null;
      }
    };
  }, [location.pathname, isTutorialActive, hasCompletedTutorial]);

  // Detect Add Product dialog
  useEffect(() => {
    if (!ready || hasCompletedTutorial || location.pathname !== '/myshop') return;
    
    const checkInterval = setInterval(() => {
      const productNameInput = document.getElementById('name');
      const sheetHeader = document.querySelector('h2, h3');
      const isAddProductOpen = productNameInput && sheetHeader?.textContent?.includes('Add New Product');
      
      if (isAddProductOpen && !addProductMode) {
        console.log('📝 Add Product dialog detected');
        setAddProductMode(true);
        setMyShopIntroMode(false);
        setOrdersMode(false);
        setStepIndex(0);
        setRunTutorial(true);
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, [ready, location.pathname, hasCompletedTutorial, addProductMode]);

  // Start Orders tutorial explicitly
  const startOrdersTutorial = () => {
    if (!ordersMode) {
      setRunTutorial(false);
      setOrdersMode(true);
      setAddProductMode(false);
      setMyShopIntroMode(false);
      setStepIndex(0);
      
      localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
      
      setTimeout(() => {
        setRunTutorial(true);
      }, 300);
    }
  };
  
  // Complete MyShop intro and prepare for Orders
  const completeMyShopIntro = () => {
    localStorage.setItem(MYSHOP_INTRO_COMPLETED_KEY, 'true');
    localStorage.setItem(ORDERS_TUTORIAL_PENDING_KEY, 'true');
    
    setRunTutorial(false);
    setMyShopIntroMode(false);
    
    // Try to click Orders tab
    const ordersTab = document.querySelector('.orders-tab, [value="orders"]');
    if (ordersTab) {
      console.log('🎯 Clicking Orders tab to continue tutorial');
      try {
        ordersTab.click();
      } catch (error) {
        console.error('Failed to click Orders tab:', error);
      }
    } else {
      console.warn('⚠️ Orders tab not found');
    }
  };
  
  // Complete full tutorial
  const completeFullTutorial = () => {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    localStorage.removeItem(MYSHOP_INTRO_COMPLETED_KEY);
    localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
    localStorage.removeItem('isNewUser');
    
    setRunTutorial(false);
    setIsTutorialActive(false);
    setHasCompletedTutorial(true);
    
    console.log('🎉 Tutorial completed!');
  };
  
  // Get current steps based on mode
  const getCurrentSteps = () => {
    if (addProductMode) return getAddProductSteps();
    if (ordersMode) return getOrdersSteps(isMobileExperience);
    if (myShopIntroMode) return getMyShopSteps(isMobileExperience);
    
    // Default to MyShop intro if on MyShop page
    if (location.pathname === '/myshop') {
      return getMyShopSteps(isMobileExperience);
    }
    
    return [];
  };
  
  // Check if current page has tutorial targets
  const checkCurrentPageHasTargets = () => {
    const steps = getCurrentSteps();
    
    for (const step of steps) {
      if (step.target && step.target !== 'body') {
        const element = document.querySelector(step.target);
        if (element) return true;
      }
    }
    
    return steps.length > 0;
  };
  
  // Handle joyride callback
  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;
    const steps = getCurrentSteps();
    
    // Handle completion
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      console.log('📍 Tutorial segment completed', { 
        mode: addProductMode ? 'AddProduct' : ordersMode ? 'Orders' : 'MyShopIntro' 
      });
      
      // Add Product mode - just exit and continue
      if (addProductMode) {
        setAddProductMode(false);
        setTimeout(() => {
          if (location.pathname === '/myshop') {
            setMyShopIntroMode(true);
            setStepIndex(0);
            setRunTutorial(true);
          }
        }, 500);
        return;
      }
      
      // Orders mode - tutorial complete!
      if (ordersMode) {
        completeFullTutorial();
        return;
      }
      
      // MyShop intro - move to Orders
      if (myShopIntroMode) {
        completeMyShopIntro();
        return;
      }
      
      // Default - mark complete
      completeFullTutorial();
      return;
    }
    
    // Handle step navigation
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        const nextIndex = index + 1;
        
        if (nextIndex >= steps.length) {
          setRunTutorial(false);
          
          // Navigate based on mode
          if (myShopIntroMode && !addProductMode && !ordersMode) {
            completeMyShopIntro();
          } else if (ordersMode) {
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
  
  // Start tutorial when page is ready
  useEffect(() => {
    if (!ready || !isTutorialActive || hasCompletedTutorial) return;
    
    clearTimeout(targetCheckerRef.current);
    
    const myShopIntroCompleted = localStorage.getItem(MYSHOP_INTRO_COMPLETED_KEY) === 'true';
    const ordersPending = localStorage.getItem(ORDERS_TUTORIAL_PENDING_KEY) === 'true';
    
    targetCheckerRef.current = setTimeout(() => {
      // Handle special modes
      if (addProductMode || ordersMode) {
        setStepIndex(0);
        setRunTutorial(true);
        if (debugMode) {
          console.log(`Starting ${addProductMode ? 'Add Product' : 'Orders'} tutorial`);
        }
        return;
      }
      
      // If on MyShop and intro completed, wait for Orders tab
      if (location.pathname === '/myshop' && myShopIntroCompleted && ordersPending) {
        if (debugMode) {
          console.log('Waiting for Orders tab activation');
        }
        return;
      }
      
      // Start MyShop intro if on MyShop page
      if (location.pathname === '/myshop' && !myShopIntroCompleted) {
        if (checkCurrentPageHasTargets()) {
          setMyShopIntroMode(true);
          setStepIndex(0);
          setRunTutorial(true);
          if (debugMode) {
            console.log('Starting MyShop intro');
          }
        }
      }
    }, 800);
    
    return () => clearTimeout(targetCheckerRef.current);
  }, [ready, location.pathname, isTutorialActive, hasCompletedTutorial, addProductMode, ordersMode]);

  // Joyride configuration
  const activeSteps = getCurrentSteps();
  
  const joyrideProps = {
    steps: activeSteps,
    run: runTutorial,
    stepIndex: stepIndex,
    continuous: true,
    showProgress: true,
    showSkipButton: true,
    disableScrolling: false,
    callback: handleJoyrideCallback,
    styles: {
      options: {
        arrowColor: '#fff',
        backgroundColor: '#fff',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        primaryColor: '#2563eb',
        textColor: '#1f2937',
        width: isMobile ? 300 : 400,
        zIndex: 10000,
      },
      tooltip: {
        borderRadius: 12,
        fontSize: 14,
        padding: 20,
      },
      tooltipTitle: {
        fontSize: 18,
        fontWeight: 600,
        marginBottom: 8,
      },
      tooltipContent: {
        padding: '8px 0',
        lineHeight: 1.6,
      },
      buttonNext: {
        backgroundColor: '#2563eb',
        borderRadius: 8,
        fontSize: 14,
        padding: '8px 16px',
        fontWeight: 500,
      },
      buttonBack: {
        color: '#6b7280',
        marginRight: 8,
      },
      buttonSkip: {
        color: '#9ca3af',
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

  // Debug panel
  const DebugPanel = () => (
    <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg text-xs z-[10001] font-mono">
      <div className="font-bold mb-2">Tutorial Debug</div>
      <div>Active: {isTutorialActive ? 'Yes' : 'No'}</div>
      <div>Running: {runTutorial ? 'Yes' : 'No'}</div>
      <div>Step: {stepIndex + 1}/{activeSteps.length}</div>
      <div>Mode: {
        addProductMode ? 'AddProduct' : 
        ordersMode ? 'Orders' : 
        myShopIntroMode ? 'MyShopIntro' : 
        'None'
      }</div>
      <div>Completed: {hasCompletedTutorial ? 'Yes' : 'No'}</div>
      <div>Path: {location.pathname}</div>
      <div className="flex gap-1 mt-2">
        <button 
          onClick={() => setRunTutorial(!runTutorial)} 
          className="bg-blue-500 px-2 py-1 rounded"
        >
          {runTutorial ? 'Stop' : 'Start'}
        </button>
        <button 
          onClick={() => {
            setOrdersMode(!ordersMode);
            setMyShopIntroMode(false);
            setAddProductMode(false);
          }} 
          className="bg-purple-500 px-2 py-1 rounded"
        >
          Orders
        </button>
      </div>
      <div className="flex gap-1 mt-1">
        <button 
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} 
          className="bg-gray-500 px-2 py-1 rounded"
          disabled={stepIndex === 0}
        >
          ←
        </button>
        <button 
          onClick={() => setStepIndex(Math.min(activeSteps.length - 1, stepIndex + 1))} 
          className="bg-gray-500 px-2 py-1 rounded"
          disabled={stepIndex === activeSteps.length - 1}
        >
          →
        </button>
        <button 
          onClick={() => {
            localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
            localStorage.removeItem(MYSHOP_INTRO_COMPLETED_KEY);
            localStorage.removeItem(ORDERS_TUTORIAL_PENDING_KEY);
            localStorage.setItem('isNewUser', 'true');
            setIsTutorialActive(true);
            setHasCompletedTutorial(false);
            setMyShopIntroMode(false);
            setAddProductMode(false);
            setOrdersMode(false);
            setStepIndex(0);
            navigate('/myshop');
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