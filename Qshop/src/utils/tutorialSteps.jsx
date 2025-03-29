// src/utils/tutorialSteps.js
// This file contains all the tutorial steps for different parts of the app

/**
 * Get steps for the home page introduction
 * @param {boolean} isMobileExperience - Whether user is on mobile or touch device
 * @returns {Array} Array of tutorial step objects
 */
export const getHomeSteps = (isMobileExperience) => {
    return [
      {
        title: 'Welcome to UniHive!',
        content: 'Let\'s explore the key features of your student marketplace.',
        placement: 'center',
        target: 'body',
        disableBeacon: true,
        spotlightClicks: false,
      },
      {
        title: 'Navigation',
        content: isMobileExperience 
          ? 'This navigation bar is how you move between different sections of the app.' 
          : 'The navigation bar at the top lets you move between different sections of the app.',
        placement: isMobileExperience ? 'top' : 'bottom',
        target: isMobileExperience ? '.mobile-navbar' : '.navbar',
        disableBeacon: true,
      },
      {
        title: 'Next Stop: Marketplace',
        content: 'Let\'s check out the Student Marketplace first, where you can browse and search for products.',
        placement: 'bottom',
        target: isMobileExperience ? '#nav-shop' : 'a[href="/studentmarketplace"]',
        disableBeacon: true,
        spotlightClicks: true,
      }
    ];
  };
  
  /**
   * Get steps for the marketplace page
   * @param {boolean} isMobileExperience - Whether user is on mobile or touch device
   * @returns {Array} Array of tutorial step objects
   */
  export const getMarketplaceSteps = (isMobileExperience) => {
    return [
      {
        title: 'Student Marketplace',
        content: 'This is the Student Marketplace, where you can find products from other students.',
        placement: 'center',
        target: 'body',
        disableBeacon: true,
      },
      {
        title: 'Search for Products',
        content: 'Use the search bar to find specific items you\'re looking for.',
        placement: 'bottom',
        target: '.search-bar',
        disableBeacon: true,
      },
      {
        title: 'Browse Categories',
        content: 'Browse different categories to find what you need.',
        placement: 'bottom',
        target: '.category-section',
        disableBeacon: true,
      },
      {
        title: 'View Products',
        content: 'Click on a product to view its details and learn more about it.',
        placement: 'center',
        target: '.product-card',
        disableBeacon: true,
        spotlightClicks: true,
      }
    ];
  };
  
  /**
   * Get steps for the product details page
   * @param {boolean} isMobileExperience - Whether user is on mobile or touch device
   * @returns {Array} Array of tutorial step objects
   */
  export const getProductSteps = (isMobileExperience) => {
    return [
      {
        title: 'Product Details',
        content: 'This is a product details page. You can see all the information about the product here.',
        placement: 'center',
        target: 'body',
        disableBeacon: true,
      },
      {
        title: 'Product Actions',
        content: 'From here, you can add items to your cart or wishlist.',
        placement: 'bottom',
        target: 'button',
        disableBeacon: true,
      },
      {
        title: 'Next Stop: My Shop',
        content: 'Now let\'s see how you can sell your own items. Let\'s go to My Shop next.',
        placement: 'bottom',
        target: isMobileExperience ? '#nav-myshop' : '.shop-link, a[href="/myshop"]',
        disableBeacon: true,
        spotlightClicks: true,
      }
    ];
  };
  
  /**
   * Get steps for the my shop page
   * @param {boolean} isMobileExperience - Whether user is on mobile or touch device
   * @returns {Array} Array of tutorial step objects
   */
  export const getMyShopSteps = (isMobileExperience) => {
    return [
      {
        title: 'My Shop',
        content: 'This is your shop, where you can sell your own items to other students.',
        placement: 'center',
        target: 'body',
        disableBeacon: true,
      },
      {
        title: 'Add New Products',
        content: 'Click here to add new products to your shop.',
        placement: 'bottom',
        target: '.add-product-button',
        disableBeacon: true,
      },
      {
        title: 'Manage Your Listings',
        content: 'Here you can see and manage all your product listings.',
        placement: 'top',
        target: '.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3, div[class*="grid-cols"]',
        disableBeacon: true,
      },
      {
        title: 'Track Orders',
        content: 'The Orders tab lets you manage and track orders from customers.',
        placement: 'bottom',
        target: '.orders-tab, [value="orders"]',
        disableBeacon: true,
      },
      {
        title: 'Next Stop: Cart',
        content: 'Finally, let\'s check out the shopping cart feature.',
        placement: 'bottom',
        target: isMobileExperience ? '.cart-icon' : '.cart-icon',
        disableBeacon: true,
        spotlightClicks: true,
      }
    ];
  };
  /**
   * Get steps for the shopping cart
   * @param {boolean} isMobileExperience - Whether user is on mobile or touch device
   * @returns {Array} Array of tutorial step objects
   */
  export const getCartSteps = (isMobileExperience) => {
    // Check if cart is empty by looking for elements that would indicate items
    const hasItems = document.querySelector('.product-card') || 
                    document.querySelector('[class*="checkout"]') ||
                    document.querySelector('[class*="proceed"]');
    
    return [
      {
        title: 'Shopping Cart',
        content: 'This is your shopping cart, where you can see items you\'ve added and proceed to checkout.',
        placement: 'center',
        target: 'body',
        disableBeacon: true,
      },
      // Conditional step based on whether there are items
      ...(hasItems ? [
        {
          title: 'Checkout Process',
          content: 'When you\'re ready to buy, you can proceed to checkout and pay for your items.',
          placement: 'bottom',
          target: '[class*="checkout"], button[class*="bg-secondary"], button.w-full',
          disableBeacon: true,
        }
      ] : [
        {
          title: 'Empty Cart',
          content: 'Your cart is currently empty. Add items from the marketplace before proceeding to checkout.',
          placement: 'bottom',
          target: 'a[href="/studentmarketplace"]',
          disableBeacon: true,
        }
      ]),
      {
        title: 'Congratulations!',
        content: 'You\'ve completed the tutorial! Now you know how to navigate UniHive, browse and buy products, and even sell your own items.',
        placement: 'center',
        target: 'body',
        disableBeacon: true,
      }
    ];
  };
  
  /**
   * Get fallback steps that work on any page when specific elements can't be found
   * @returns {Array} Array of tutorial step objects
   */
  export const getFallbackSteps = () => [
    {
      title: 'Welcome to UniHive!',
      content: 'This is your student marketplace where you can buy and sell items with other students.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      title: 'Navigation',
      content: 'You can navigate using the menu at the top or bottom of the screen.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      title: 'Browse & Search',
      content: 'Browse products by category or search for specific items.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      title: 'Wishlist & Cart',
      content: 'Add items to your wishlist or cart as you shop.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      title: 'Your Profile',
      content: 'Access your profile to see orders and settings.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    }
  ];