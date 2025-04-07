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
      title: 'Featured Shops',
      content: 'Best performing and best looking shops appear here. Psst... you can appear here too!',
      placement: 'top',
      target: '.max-w-7xl.mx-auto.px-4.py-16.border-b',
      disableBeacon: true,
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
      content: 'Buy all the trendiest must-haves from UniHive entrepreneurs near you!',
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
      content: 'All the hottest top of the line products by UniHive entrepreneurs... Psst, don\'t wait too long, they sell out quick!',
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
      content: 'Let\'s see how you can also sell your own products and join our bustling community today!',
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
      title: 'Your Shop Dashboard',
      content: 'Let\'s see how you can sell your own products and join our bustling community today!',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      title: 'Shop Statistics',
      content: 'Track your sales, revenue, and pending orders at a glance.',
      placement: 'bottom',
      target: '.grid-cols-2.md\\:grid-cols-4, .grid-cols-2', // Stats grid
      disableBeacon: true,
    },
    {
      title: 'Customize Your Shop',
      content: 'Click here to create your very own shop... Psst, make it look classy so you can be featured, just like the ones in the homepage!',
      placement: isMobileExperience ? 'top' : 'right',
      target: '.customize-shop-button, button:has(svg[data-lucide="settings"]), button:has(.settings-icon)', 
      disableBeacon: true,
      spotlightClicks: true,
    }
  ];
};

// Also, improve the shop customization steps to ensure they work when the form appears:

export const getShopCustomizationSteps = () => {
  return [
    {
      title: 'Shop Identity',
      content: 'Give your shop a memorable name that reflects your brand.',
      placement: 'bottom',
      target: '#shopName, input[id="shopName"]',
      disableBeacon: true,
    },
    {
      title: 'Shop Banner',
      content: 'This is the main cover image for your shop. Pick an aesthetic high quality image for a better look.',
      placement: 'bottom',
      target: 'form .border-2, [class*="border-2"], div[class*="border-2"]',
      disableBeacon: true,
    },
    {
      title: 'Shop Description',
      content: 'Tell customers what makes your products special in 2-3 sentences.',
      placement: 'bottom',
      target: '#description',
      disableBeacon: true,
    },
    {
      title: 'Premium Features',
      content: 'Premium users get access to additional customization options and marketing tools.',
      placement: 'bottom',
      target: '#policies, div:has(#policies)',
      disableBeacon: true,
    },
    {
      title: 'Finalize Your Shop',
      content: 'Click here to update shop to create it and come back whenever you want to upgrade your shop or customize it further.',
      placement: 'top',
      target: 'form button[type="submit"]',
      disableBeacon: true,
      spotlightClicks: true,
    }
  ];
};

/**
 * Get steps for the add product section
 * @param {boolean} isMobileExperience - Whether user is on mobile or touch device
 * @returns {Array} Array of tutorial step objects
 */
export const getAddProductSteps = () => {
  return [
    {
      title: 'Add New Product',
      content: 'Here you can add new products to your shop inventory.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      title: 'Product Details',
      content: 'Fill in all the important details like name, price, and description.',
      placement: 'top',
      target: '#name',
      disableBeacon: true,
    },
    {
      title: 'Product Image',
      content: 'Upload good quality images for your products to attract your customers\' eye.',
      placement: 'bottom',
      target: '[class*="border-2"], [class*="border-dashed"]',
      disableBeacon: true,
    },
    {
      title: 'Publish Product',
      content: 'Click add product to have your stuff appear on the student marketplace.',
      placement: 'top',
      target: 'button[type="submit"]',
      disableBeacon: true,
      spotlightClicks: true,
    }
  ];
};

/**
 * Get steps for the orders section
 * @returns {Array} Array of tutorial step objects
 */
export const getOrdersSteps = () => {
  return [
    {
      title: 'Orders Management',
      content: 'Once someone purchases something from your shop, new orders will appear here.',
      placement: 'center',
      target: 'body',
      disableBeacon: true,
    },
    {
      title: 'Order Status',
      content: 'You can track the status of each order and keep your customers updated.',
      placement: 'bottom',
      target: '.tabsList, [value="new"], [value="shipped"], [value="delivered"], [value="all"]',
      disableBeacon: true,
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