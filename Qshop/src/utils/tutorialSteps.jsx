// src/utils/tutorialSteps.js
// Updated version that skips the shop customization section

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
    title: 'Let\'s View a Product',
    content: 'Now let\'s check out a product in detail. Click "Next" to continue.',
    placement: 'center',
    disableOverlay: true,
  }
];

// Product page steps
export const getProductSteps = (isMobile = false) => [
  {
    target: '.product-image',
    title: 'Product Image',
    content: 'See high-quality images of the product.',
    placement: 'right'
  },
  {
    target: 'button:contains("Add to Cart")',
    title: 'Add to Cart',
    content: 'Easily add products to your cart with one click.',
    placement: 'top'
  },
  {
    target: 'body',
    title: 'Next Step: Your Shop',
    content: 'Now let\'s see how you can sell your own products. We\'ll check out the My Shop page.',
    placement: 'center',
    disableOverlay: true
  }
];

// My Shop steps - MODIFIED to skip shop customization
export const getMyShopSteps = (isMobile = false) => [
  {
    target: 'body',
    title: 'Your Shop',
    content: 'Welcome to your shop! Here you can manage your products and orders.',
    placement: 'center',
    disableBeacon: true
  },
  {
    target: '.add-product-button',
    title: 'Add Products',
    content: 'Click here to add new products to your shop.',
    placement: 'left'
  },
  // Skip the customize shop step entirely
  {
    target: '.orders-tab',
    title: 'Manage Orders',
    content: 'View and manage customer orders.',
    placement: 'bottom'
  },
  {
    target: 'body',
    title: 'Let\'s Explore Your Cart',
    content: 'We\'ll now check out your shopping cart. Click "Next" to continue.',
    placement: 'center',
    disableOverlay: true
  }
];

// Cart steps
export const getCartSteps = (isMobile = false) => [
  {
    target: 'body',
    title: 'Shopping Cart',
    content: 'This is your shopping cart where you can review items before checkout.',
    placement: 'center',
    disableBeacon: true
  },
  {
    target: '.cart-icon',
    title: 'Cart Access',
    content: 'You can always access your cart from here.',
    placement: 'bottom'
  },
  {
    target: 'body',
    title: 'Tutorial Complete!',
    content: 'You\'ve completed the UniHive tutorial! You can now buy and sell products with ease. Happy trading!',
    placement: 'center',
    disableOverlay: true
  }
];

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

// Orders steps
export const getOrdersSteps = () => [
  {
    target: 'body',
    title: 'Order Management',
    content: 'Here you can manage all your orders.',
    placement: 'center',
    disableBeacon: true
  },
  {
    target: '[value="new"]',
    title: 'New Orders',
    content: 'See new orders that require your attention.',
    placement: 'bottom'
  },
  {
    target: '[value="shipped"]',
    title: 'Shipped Orders',
    content: 'Track orders that are already on their way.',
    placement: 'bottom'
  },
  {
    target: 'body',
    title: 'Manage Your Business',
    content: 'Keep track of all your sales and ensure timely delivery to maintain great customer satisfaction.',
    placement: 'center',
    disableOverlay: true
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