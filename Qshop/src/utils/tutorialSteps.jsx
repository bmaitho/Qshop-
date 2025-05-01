// src/utils/tutorialSteps.js
// Updated with integrated MyShop + Orders approach

// Home page steps
export const getHomeSteps = (isMobile = false) => [
  {
    target: 'body',
    title: 'Welcome to UniHive!',
    content: 'This tutorial will guide you through using our marketplace platform. Let\'s start by exploring the main features.',
    placement: 'center',
    disableBeacon: true
  },
  {
    target: '.navbar, .mobile-navbar',
    title: 'Navigation',
    content: 'This is the main navigation bar where you can access different parts of UniHive.',
    placement: 'bottom',
  },
  {
    target: isMobile ? '#nav-shop' : '.main-nav a[href="/studentmarketplace"]',
    title: 'Student Marketplace',
    content: 'Click here to browse products from student sellers across campus.',
    placement: 'bottom',
  },
  // Skip straight to marketplace without waiting for click
  {
    target: 'body',
    title: 'Let\'s Browse Products',
    content: 'Now we\'ll go to the marketplace to see what\'s available. Click "Next" to continue.',
    placement: 'center',
    disableOverlay: true,
  }
];

// Marketplace steps
export const getMarketplaceSteps = (isMobile = false) => [
  {
    target: isMobile ? '.search-bar' : '.search-bar, form.search-bar',
    title: 'Search Bar',
    content: 'Search for specific products by name or description.',
    placement: 'bottom'
  },
  {
    target: isMobile ? '.category-section' : '.category-section, [class*="filter"]',
    title: 'Categories',
    content: 'Browse products by category to find what you need.',
    placement: 'right'
  },
  {
    target: '.product-card',
    title: 'Product Cards',
    content: 'These cards show products for sale. Click on any product to see details.',
    placement: 'top'
  },
  {
    target: isMobile ? '.wishlist-icon' : '.cart-icon, .wishlist-icon',
    title: 'Cart & Wishlist',
    content: 'Add products to your cart to purchase them, or save them to your wishlist for later.',
    placement: 'left'
  },
  {
    target: 'body',
    title: 'Let\'s Check Your Shop',
    content: 'Now let\'s see how you can sell your own products. We\'ll head to your shop page.',
    placement: 'center',
    disableOverlay: true,
  }
];

export const getMyShopSteps = (isMobile = false) => [
  {
    target: 'body',
    title: 'Your Shop Dashboard',
    content: 'Welcome to your shop! Here you can manage your products and orders.',
    placement: 'center',
    disableBeacon: true
  },
  {
    target: '.customize-shop-button',
    title: 'Shop Customization',
    content: 'Click here to set up your shop name, banner, and policies.',
    placement: isMobile ? 'top' : 'right',
    spotlightClicks: true
  },
  {
    target: '.add-product-button',
    title: 'Add Products',
    content: 'Start selling by creating new product listings here.',
    placement: isMobile ? 'top' : 'right',
    spotlightClicks: true
  },
  {
    target: '.orders-tab',
    title: 'Order Management',
    content: 'Click here to view and manage your customer orders.',
    placement: 'bottom',
    spotlightClicks: true
  },
  {
    target: '.grid-cols-2.md\\:grid-cols-4',
    title: 'Sales Overview',
    content: 'Track your key metrics: active listings, sales, and revenue.',
    placement: 'bottom'
  }
];

export const getOrdersSteps = (isMobile = false) => [
  {
    target: '[value="new"]',
    title: 'New Orders',
    content: 'View pending orders that need your attention here.',
    placement: 'bottom',
    spotlightClicks: true
  },
  {
    target: 'input[placeholder*="Search"]',
    title: 'Order Search',
    content: 'Find orders by ID using this search field.',
    placement: 'left'
  },
  {
    target: '.bg-orange-100',
    title: 'Order Status',
    content: 'Processing orders are highlighted in orange. Update status as you fulfill them.',
    placement: 'right'
  },
  {
    target: 'button:has(.mr-1)', // Mark as In Transit button
    title: 'Update Status',
    content: 'Click here when you ship items to update order status.',
    placement: 'left',
    spotlightClicks: true
  },
  {
    target: 'button:has(.h-4.w-4)', // Contact Buyer button
    title: 'Customer Communication',
    content: 'Message buyers directly about their orders.',
    placement: 'top'
  },
  {
    target: 'button:contains("Details")',
    title: 'Order Details',
    content: 'View full order information including delivery details.',
    placement: 'right'
  },
  {
    target: '.bg-blue-100', // In Transit status
    title: 'Shipping Tracking',
    content: 'Orders in transit are marked blue. Update when delivered.',
    placement: 'bottom'
  }
];

// Unified shop tutorial handler
export const getShopTutorialSteps = (activeTab, isMobile) => {
  const baseSteps = getMyShopSteps(isMobile);
  
  if (activeTab === 'orders') {
    return [
      ...baseSteps.filter(step => step.target !== '.orders-tab'),
      ...getOrdersSteps(isMobile)
    ];
  }
  return baseSteps;
};

// Add Product steps
export const getAddProductSteps = () => [
  {
    target: 'input#name',
    title: 'Product Name',
    content: 'Enter the name of your product here.',
    placement: 'bottom'
  },
  {
    target: 'input#price',
    title: 'Product Price',
    content: 'Set a competitive price for your product.',
    placement: 'bottom'
  },
  {
    target: 'textarea#description',
    title: 'Product Description',
    content: 'Provide a detailed description to help sell your product.',
    placement: 'top'
  },
  {
    target: '#category',
    title: 'Product Category',
    content: 'Select the most relevant category for your product.',
    placement: 'right'
  },
  {
    target: 'label:contains("Product Image")',
    title: 'Product Image',
    content: 'Add clear, high-quality images to showcase your product.',
    placement: 'top'
  },
  {
    target: 'button[type="submit"]',
    title: 'Submit',
    content: 'Click here to add your product once all information is complete.',
    placement: 'top'
  }
];

// Fallback steps for when specific page steps aren't found
export const getFallbackSteps = () => [
  {
    target: 'body',
    title: 'Exploring UniHive',
    content: 'You\'re now exploring UniHive! Feel free to browse around or follow the navigation to specific sections.',
    placement: 'center',
    disableBeacon: true
  },
  {
    target: '.mobile-navbar, .navbar',
    title: 'Navigation',
    content: 'Use the navigation to move between different sections of the app.',
    placement: 'bottom'
  },
  {
    target: 'body',
    title: 'Continue Your Journey',
    content: 'Let\'s continue exploring UniHive features. Click "Next" to proceed with the tutorial.',
    placement: 'center'
  }
];