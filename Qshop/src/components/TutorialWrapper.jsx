// src/components/TutorialWrapper.jsx - Direct Orders Tutorial Solution
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
    setRunTutorial(false);
    setIsTutorialActive(false);
    
    if (debugMode) {
      console.log('Full tutorial completed and marked as done');
    }
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
        if (debugMode) console.log('Starting tutorial for', location.pathname);
      } else {
        if (debugMode) console.log('No tutorial targets found for', location.pathname);
        // If no elements found, try fallback mode
        setFallbackMode(true);
        setStepIndex(0);
        setRunTutorial(true);
      }
    }, 800);
    
    return () => clearTimeout(targetCheckerRef.current);
  }, [ready, location.pathname, isTutorialActive, hasCompletedTutorial, addProductMode, ordersMode]);

  // Check if the current page has valid tutorial targets
  const checkCurrentPageHasTargets = () => {
    // First check if the tutorial has been completed
    const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
    
    // If the tutorial is completed and we're on a page without specific steps (like wishlist),
    // don't trigger the fallback steps
    if (tutorialCompleted) {
      const currentPath = location.pathname;
      const hasSpecificTutorial = 
        currentPath === '/' || 
        currentPath === '/home' ||
        currentPath === '/studentmarketplace' || 
        currentPath.includes('/search') ||
        currentPath === '/myshop';
        
      // If we're on a page without specific steps, don't show any tutorial
      if (!hasSpecificTutorial) {
        return false;
      }
    }
    
    // Regular check for specific tutorial steps
    const steps = getStepsForCurrentPage();
    if (!steps || steps.length === 0) return false;
    
    // Check if at least one step target exists
    return steps.some((step) => {
      // Skip checks for body targets
      if (!step.target || step.target === 'body') return true;
      return checkElementExists(step.target);
    });
  };
  
  // Check if an element exists for the given selector
  const checkElementExists = (selector) => {
    if (!selector) return false;
    
    // Handle multiple comma-separated selectors
    const selectors = selector.split(',').map(s => s.trim());
    
    // Check if any of the selectors match an element
    return selectors.some(s => {
      try {
        const element = document.querySelector(s);
        return !!element;
      } catch (e) {
        return false;
      }
    });
  };

  // Get steps for the current page
  const getStepsForCurrentPage = () => {
    // Check for special modes first
    if (addProductMode) {
      return getAddProductSteps();
    }
    if (ordersMode) {
      return getOrdersSteps();
    }
    
    // Regular page flow
    if (location.pathname === '/' || location.pathname === '/home') {
      return getHomeSteps(isMobileExperience);
    } else if (location.pathname === '/studentmarketplace' || location.pathname.includes('/search')) {
      return getMarketplaceSteps(isMobileExperience);
    } else if (location.pathname === '/myshop') {
      return getMyShopSteps(isMobileExperience);
    }
    
    return [];
  };
  
  // Get the appropriate steps
  const getActiveSteps = () => {
    if (addProductMode) {
      return getAddProductSteps();
    }
    if (ordersMode) {
      return getOrdersSteps();
    }
    if (fallbackMode) {
      return getFallbackSteps();
    }
    return getStepsForCurrentPage();
  };

  // Get the appropriate steps based on mode and current page
  const activeSteps = getActiveSteps();

  // Only run tutorial if steps exist
  const shouldRun = runTutorial && activeSteps.length > 0;

  // Prepare target step indices that need spotlightClicks enabled
  const needsSpotlightClicks = (index) => {
    if (!activeSteps || index >= activeSteps.length) return false;
    
    // Get the current step
    const step = activeSteps[index];
    
    // If the step explicitly sets spotlightClicks, respect that
    if (step.spotlightClicks === true) {
      return true;
    }
    
    // Enable spotlight clicks by default for orders tab in MyShop
    if (location.pathname === '/myshop' && !ordersMode && !addProductMode) {
      // If the target contains "orders-tab", enable spotlight clicks
      if (step.target && step.target.includes('.orders-tab')) {
        return true;
      }
    }
    
    return false;
  };

  // Joyride configuration
  const joyrideProps = {
    callback: handleJoyrideCallback,
    continuous: true,
    stepIndex: stepIndex,
    steps: activeSteps,
    run: shouldRun,
    scrollToFirstStep: true,
    showProgress: true,
    showSkipButton: true,
    disableCloseOnEsc: false,
    disableOverlayClose: true,
    spotlightClicks: needsSpotlightClicks(stepIndex) || fallbackMode,
    spotlightPadding: isMobileExperience ? 40 : 15,
    hideBackButton: stepIndex === 0,
    disableOverlay: false,
    floaterProps: {
      disableAnimation: isMobileExperience,
      hideArrow: isMobileExperience,
      offset: isMobileExperience ? 40 : 15,
    },
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
    // Custom tooltip for mobile
    tooltipComponent: ({ continuous, index, isLastStep, step, backProps, primaryProps, skipProps, tooltipProps }) => (
      <div 
        {...tooltipProps} 
        className="bg-[#113b1e] text-white p-4 rounded-lg shadow-xl max-w-[300px] mx-auto relative"
      >
        <button 
          className="absolute top-2 right-2 text-white/70 hover:text-white z-10"
          onClick={(e) => {
            e.stopPropagation();
            skipProps.onClick(e);
          }}
          aria-label="Close tutorial"
        >
          <X size={16} />
        </button>
        
        {step.title && (
          <h3 className="text-[#E7C65F] font-bold text-lg mb-2">{step.title}</h3>
        )}
        
        <div className="mb-4 mt-2">{step.content}</div>
        
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
  };

  // Debug panel
  const DebugPanel = () => (
    <div className="fixed top-0 right-0 bg-black/80 text-white p-2 text-xs z-[10001] max-w-[200px]">
      <div>Mobile: {isMobileExperience ? 'Yes' : 'No'}</div>
      <div>Tutorial: {shouldRun ? 'Running' : 'Stopped'}</div>
      <div>Step: {stepIndex + 1}/{activeSteps.length}</div>
      <div>Add Product: {addProductMode ? 'Yes' : 'No'}</div>
      <div>Orders Mode: {ordersMode ? 'Yes' : 'No'}</div>
      <div>MyShop Done: {localStorage.getItem(MYSHOP_TUTORIAL_COMPLETED_KEY) === 'true' ? 'Yes' : 'No'}</div>
      <div>Orders Pending: {localStorage.getItem(ORDERS_TUTORIAL_PENDING_KEY) === 'true' ? 'Yes' : 'No'}</div>
      <div>SpotlightClicks: {needsSpotlightClicks(stepIndex) ? 'Yes' : 'No'}</div>
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
            setIsTutorialActive(true);
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