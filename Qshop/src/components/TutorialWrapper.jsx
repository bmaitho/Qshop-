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
  getProductSteps,
  getMyShopSteps,
  getShopCustomizationSteps,
  getAddProductSteps,
  getOrdersSteps,
  getCartSteps,
  getFallbackSteps
} from '../utils/tutorialSteps';

// Local storage keys for tutorial state
const TUTORIAL_COMPLETED_KEY = 'unihive_tutorial_completed';
const TUTORIAL_PROGRESS_KEY = 'unihive_tutorial_progress';

const TutorialWrapper = ({ children }) => {
  const { isTutorialActive, setIsTutorialActive } = useTutorial();
  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [ready, setReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  // Track special tutorial modes for shop settings and add product
  const [shopCustomizationMode, setShopCustomizationMode] = useState(false);
  const [addProductMode, setAddProductMode] = useState(false);
  const [ordersMode, setOrdersMode] = useState(false);
  
  const targetCheckerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(
    localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true'
  );
  
  // Check if mobile or touch experience for appropriate steps
  const isMobileExperience = isMobile || isTouchDevice;
  
  // Function to trigger clicking the customize shop button
  const triggerCustomizeShopClick = () => {
    const button = document.querySelector('.customize-shop-button, button:has(svg[data-lucide="settings"]), button:contains("Customize Shop"), button:contains("Edit Shop")');
    if (button) {
      console.log('Auto-clicking shop customize button');
      button.click();
    }
  };
  
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
    setShopCustomizationMode(false);
    setAddProductMode(false);
    setOrdersMode(false);
    
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
  
  // Add improved detection for shop customization mode
  useEffect(() => {
    if (!ready || hasCompletedTutorial) return;
    
    const checkForShopCustomization = () => {
      // Look for shop settings elements
      const shopNameInput = document.querySelector('#shopName');
      const sheetWithShopSettings = document.querySelector('[role="dialog"] h2, [role="dialog"] h3');
      const isShopSettings = sheetWithShopSettings && 
                            (sheetWithShopSettings.textContent.includes('Shop Settings') || 
                             sheetWithShopSettings.textContent.includes('Shop Information'));
      
      if (shopNameInput || isShopSettings) {
        // If shop customization detected but mode not set
        if (!shopCustomizationMode) {
          console.log('Shop settings form detected - starting customization tutorial');
          setShopCustomizationMode(true);
          setAddProductMode(false);
          setOrdersMode(false);
          setStepIndex(0);
          setRunTutorial(true);
        }
        return true;
      }
      return false;
    };
    
    // Check right away
    checkForShopCustomization();
    
    // Set up a regular interval to check
    const intervalId = setInterval(checkForShopCustomization, 500);
    
    // Also set up a MutationObserver to check when DOM changes
    const observer = new MutationObserver(() => {
      checkForShopCustomization();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      clearInterval(intervalId);
      observer.disconnect();
    };
  }, [ready, hasCompletedTutorial, shopCustomizationMode]);
  
  // Detect if special sheets are open
  useEffect(() => {
    if (!ready || hasCompletedTutorial) return;
    
    // Check for shop customization dialog/sheet
    const shopCustomizationCheck = () => {
      const sheetHeader = document.querySelector('h2:contains("Shop Settings"), h3:contains("Shop Settings")');
      const shopNameInput = document.getElementById('shopName');
      const descriptionInput = document.getElementById('description');
      
      if (shopNameInput || descriptionInput || sheetHeader) {
        return true;
      }
      return false;
    };
    
    // Check for add product dialog/sheet
    const addProductCheck = () => {
      const sheetHeader = document.querySelector('h2:contains("Add New Product"), h3:contains("Add New Product")');
      const productNameInput = document.getElementById('name');
      
      if (productNameInput || sheetHeader) {
        return true;
      }
      return false;
    };
    
    // Check for orders tab
    const ordersCheck = () => {
      const ordersTab = document.querySelector('.orders-tab, [value="orders"]');
      const ordersActive = document.querySelector('[value="orders"][aria-selected="true"]');
      
      if (ordersActive) {
        return true;
      }
      return false;
    };
    
    // Set up interval to check for special sheets
    const checkInterval = setInterval(() => {
      if (location.pathname === '/myshop') {
        const isShopCustomization = shopCustomizationCheck();
        const isAddProduct = addProductCheck();
        const isOrders = ordersCheck();
        
        if (isShopCustomization && !shopCustomizationMode) {
          setShopCustomizationMode(true);
          setAddProductMode(false);
          setOrdersMode(false);
          setStepIndex(0);
          setRunTutorial(true);
        } else if (isAddProduct && !addProductMode) {
          setAddProductMode(true);
          setShopCustomizationMode(false);
          setOrdersMode(false);
          setStepIndex(0);
          setRunTutorial(true);
        } else if (isOrders && !ordersMode) {
          setOrdersMode(true);
          setShopCustomizationMode(false);
          setAddProductMode(false);
          setStepIndex(0);
          setRunTutorial(true);
        }
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, [ready, location.pathname, hasCompletedTutorial]);
  
  // Handle joyride callback
  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;
    
    // If we're in a special mode, use appropriate steps
    let steps = [];
    if (shopCustomizationMode) {
      steps = getShopCustomizationSteps();
    } else if (addProductMode) {
      steps = getAddProductSteps();
    } else if (ordersMode) {
      steps = getOrdersSteps();
    } else if (fallbackMode) {
      steps = getFallbackSteps();
    } else {
      steps = getStepsForCurrentPage();
    }
    
    // Check for auto-click on MyShop final step
    if (location.pathname === '/myshop' && 
        type === EVENTS.STEP_AFTER && 
        index === steps.length - 1 && 
        !shopCustomizationMode &&
        !addProductMode &&
        !ordersMode) {
      // Auto-click the customize shop button after a short delay
      setTimeout(triggerCustomizeShopClick, 300);
      return; // Don't proceed with navigation
    }
    
    // Special handling for cart page - when completing the cart tutorial, mark as done permanently
    if (location.pathname === '/cart') {
      if ((type === EVENTS.STEP_AFTER && index === (steps.length - 1)) || 
          [STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
        // Definitively end the tutorial - no more steps anywhere
        localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
        setRunTutorial(false);
        setIsTutorialActive(false);
        return;
      }
    }
    
    // Also exit special modes when finished/skipped
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setShopCustomizationMode(false);
      setAddProductMode(false);
      setOrdersMode(false);
      
      // Wait a moment before continuing regular tutorial
      setTimeout(() => {
        if (location.pathname === '/myshop') {
          setStepIndex(0);
          setRunTutorial(true);
        }
      }, 500);
      
      return;
    }
    
    // Handle step changes
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        const nextIndex = index + 1;
        
        // Check if we've reached the end of steps for this page
        if (nextIndex >= steps.length) {
          setRunTutorial(false);
          
          // Only navigate automatically if we're not in a special mode
          if (!shopCustomizationMode && !addProductMode && !ordersMode) {
            // Navigate based on current page
            if (location.pathname === '/' || location.pathname === '/home') {
              navigate('/studentmarketplace');
            } else if (location.pathname === '/studentmarketplace' || location.pathname.includes('/search')) {
              // Find a product to navigate to
              const productElements = document.querySelectorAll('.product-card a');
              if (productElements.length > 0) {
                const href = productElements[0].getAttribute('href');
                if (href) navigate(href);
                else navigate('/myshop'); // Fallback
              } else {
                navigate('/myshop'); // Fallback if no products found
              }
            } else if (location.pathname.includes('/product/')) {
              navigate('/myshop');
            } else if (location.pathname === '/myshop') {
              // For MyShop, don't navigate away - we handle this separately
              // Wait for the shop customization to be triggered
            } else if (location.pathname === '/cart') {
              // Cart is the final step, just complete the tutorial
            }
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
    
    // Delay a bit to make sure all elements are rendered
    targetCheckerRef.current = setTimeout(() => {
      // For special modes, always run tutorial
      if (shopCustomizationMode || addProductMode || ordersMode) {
        setStepIndex(0);
        setRunTutorial(true);
        if (debugMode) {
          if (shopCustomizationMode) console.log('Starting Shop Customization tutorial');
          if (addProductMode) console.log('Starting Add Product tutorial');
          if (ordersMode) console.log('Starting Orders tutorial');
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
  }, [ready, location.pathname, isTutorialActive, hasCompletedTutorial, shopCustomizationMode, addProductMode, ordersMode]);

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
        currentPath.includes('/product/') ||
        currentPath === '/myshop' ||
        currentPath === '/cart';
        
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
    if (shopCustomizationMode) {
      return getShopCustomizationSteps();
    }
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
    } else if (location.pathname.includes('/product/')) {
      return getProductSteps(isMobileExperience);
    } else if (location.pathname === '/myshop') {
      return getMyShopSteps(isMobileExperience);
    } else if (location.pathname === '/cart') {
      return getCartSteps(isMobileExperience);
    }
    
    return [];
  };
  
  // Get the appropriate steps
  const getActiveSteps = () => {
    if (shopCustomizationMode) {
      return getShopCustomizationSteps();
    }
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
    spotlightClicks: fallbackMode ? true : false,
    spotlightPadding: isMobileExperience ? 40 : 15,
    hideBackButton: stepIndex === 0,
    disableOverlay: false,
    floaterProps: {
      disableAnimation: isMobileExperience, // Disable animations which can cause rendering issues
      hideArrow: isMobileExperience, // Hide arrows on mobile which can position incorrectly
      offset: isMobileExperience ? 40 : 15, // Increase offset on mobile to improve visibility
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
      <div>Fallback: {fallbackMode ? 'Yes' : 'No'}</div>
      <div>Ready: {ready ? 'Yes' : 'No'}</div>
      <div>Path: {location.pathname.substring(0, 15)}</div>
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
        <button 
          onClick={() => {
            localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
            localStorage.removeItem(TUTORIAL_PROGRESS_KEY);
            setIsTutorialActive(true);
            setFallbackMode(false);
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