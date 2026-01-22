// src/utils/tutorialSteps.js
// Streamlined tutorial - starts at MyShop with detailed order management

// REMOVED: Home and Marketplace steps - tutorial now starts directly at MyShop

// MyShop Introduction - Focused and streamlined
export const getMyShopSteps = (isMobile = false) => [
  {
    target: 'body',
    title: 'Welcome to Your Shop! 🎉',
    content: 'This is your seller dashboard. Here you\'ll manage products, process orders, and communicate with buyers. Let\'s get you started!',
    placement: 'center',
    disableBeacon: true
  },
  {
    target: '.grid-cols-2.md\\:grid-cols-4',
    title: 'Your Sales Overview',
    content: 'Track key metrics at a glance: active listings, total sales, revenue, and pending orders.',
    placement: 'bottom'
  },
  {
    target: '.customize-shop-button',
    title: 'Customize Your Shop',
    content: 'Set up your shop name, banner, and policies to build trust with buyers.',
    placement: isMobile ? 'top' : 'right',
    spotlightClicks: false
  },
  {
    target: '.add-product-button',
    title: 'Add Your Products',
    content: 'Click here to create product listings. Add clear photos, descriptions, and competitive prices.',
    placement: isMobile ? 'top' : 'right',
    spotlightClicks: false
  },
  {
    target: '.orders-tab, [value="orders"]',
    title: 'Order Management Hub',
    content: 'This is where the real work happens! Click the Orders tab to learn how to process customer orders properly.',
    placement: 'bottom',
    spotlightClicks: true
  }
];

// Comprehensive Order Management Tutorial
// VERIFIED WORKING: Based on actual page structure inspection
export const getOrdersSteps = (isMobile = false) => [
  {
    target: 'body',
    title: 'Order Management System 📦',
    content: 'Welcome to order management! Let\'s walk through how to handle customer orders properly.',
    placement: 'center',
    disableBeacon: true
  },

  // Step 2: Point to the search bar (this definitely exists)
  {
    target: 'input[placeholder="Search by order ID"]',
    title: 'Search Orders',
    content: 'Use this search bar to quickly find specific orders by their ID.',
    placement: isMobile ? 'top' : 'bottom'
  },

  // Step 3: Explain the tabs (TabsList exists)
  {
    target: '[role="tablist"]',
    title: 'Order Status Tabs',
    content: 'Orders are organized into tabs: All, Urgent (needs contact), Ready (can ship), Processing, Shipped, and Delivered.',
    placement: 'bottom'
  },

  // Step 4-16: Information steps about order management
  {
    target: 'body',
    title: 'Understanding Order Status 📋',
    content: 'Orders move through stages: NEW → PROCESSING → SHIPPED → DELIVERED. Each status requires specific actions from you.',
    placement: 'center'
  },

  {
    target: 'body',
    title: '🔴 Urgent Orders - Top Priority',
    content: 'The Urgent tab shows orders that haven\'t been contacted yet and are 1+ days old. These need immediate attention!',
    placement: 'center'
  },

  {
    target: 'body',
    title: '🟢 Ready Orders - Can Ship Now',
    content: 'The Ready tab shows orders where you\'ve contacted the buyer and they\'ve responded. These are cleared to ship immediately!',
    placement: 'center'
  },

  {
    target: 'body',
    title: '⚠️ CRITICAL: Contact Buyers First',
    content: 'You MUST contact buyers before shipping. This is mandatory! Confirm delivery details, timing, and location. This prevents disputes and ensures smooth delivery.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'How Buyer Communication Works 💬',
    content: 'ANY response from the buyer counts as agreement. You don\'t need specific keywords - just confirmation they got your message about delivery arrangements.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'The Shipping Workflow 📦',
    content: 'Step 1: Contact buyer about delivery. Step 2: Wait for buyer response. Step 3: Mark order as "Shipped". Step 4: Buyer confirms delivery.',
    placement: 'center'
  },

  {
    target: 'body',
    title: '⏱️ The 14-Day Payment Hold',
    content: 'When a buyer pays, funds are held for 14 days. This protects both parties from disputes. You receive payment after buyer confirms delivery OR after 14 days automatically.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'Buyer Confirmation Required ✅',
    content: 'After you deliver, the buyer should confirm they received the item. Once confirmed (or 14 days pass), payment is automatically released to your account.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'Order Priority System 🎯',
    content: 'Orders are automatically sorted by priority: 1) Ready to ship (buyer agreed), 2) Need contact (urgent), 3) Waiting for response, 4) Oldest orders first.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'Best Practices for Success 🌟',
    content: 'Respond to messages within 24 hours. Ship orders within 2-3 days of buyer confirmation. Update order status promptly. Package items securely. Keep proof of delivery when possible.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'What If Buyer Doesn\'t Respond? 🤔',
    content: 'If no response after 48 hours, send a follow-up message. If still no response after 3 days, contact support. Never ship without confirmation from the buyer.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'Handling Delivery Issues 📞',
    content: 'If there\'s a problem: Keep communicating with the buyer, Document all communication, Offer reasonable solutions, Contact support if needed.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'Payment & Commission 💰',
    content: 'Platform takes a 5% commission plus transaction fees. Your payout is automatically calculated. Payments are processed via M-Pesa after buyer confirmation.',
    placement: 'center'
  },

  {
    target: 'body',
    title: 'You\'re Ready to Manage Orders! 🚀',
    content: 'Remember the key steps: 1) Contact buyer first, 2) Wait for confirmation, 3) Ship promptly, 4) Update status, 5) Wait for buyer delivery confirmation. Happy selling!',
    placement: 'center'
  }
];

// Add Product Dialog Steps - Detailed guidance
export const getAddProductSteps = () => [
  {
    target: 'body',
    title: 'Creating a Product Listing 📝',
    content: 'Let\'s add a product to your shop. Follow these steps to create an effective listing.',
    placement: 'center',
    disableBeacon: true
  },
  {
    target: 'input#name',
    title: 'Product Name',
    content: 'Enter a clear, descriptive name. Include key details like brand, size, or condition. Example: "iPhone 13 Pro Max 256GB - Excellent Condition"',
    placement: 'bottom'
  },
  {
    target: 'input#price',
    title: 'Set Your Price (KES)',
    content: 'Set a competitive price in Kenyan Shillings. Research similar items to price appropriately. Remember: 5% platform commission + transaction fees apply.',
    placement: 'bottom'
  },
  {
    target: 'textarea#description',
    title: 'Detailed Description',
    content: 'Write a thorough description: What it is, Condition (new/used), Key features, Why you\'re selling, Any defects or issues, What\'s included. More detail = more trust.',
    placement: 'top'
  },
  {
    target: '#category',
    title: 'Select Category',
    content: 'Choose the most relevant category. This helps buyers find your product through category browsing.',
    placement: 'right'
  },
  {
    target: 'input#stock',
    title: 'Stock Quantity',
    content: 'How many units do you have? This prevents overselling. The listing automatically hides when stock reaches zero.',
    placement: 'bottom'
  },
  {
    target: 'label:contains("Product Image"), [type="file"]',
    title: 'Product Photos 📸',
    content: 'Upload clear, well-lit photos. Show the item from multiple angles. Good photos dramatically increase sales. Avoid blurry or dark images.',
    placement: 'top'
  },
  {
    target: 'button[type="submit"]',
    title: 'Publish Your Product',
    content: 'Review all details carefully, then click to publish. Your product will be live immediately and visible to all buyers on campus.',
    placement: 'top',
    spotlightClicks: false
  }
];

// Fallback steps removed - tutorial is focused on seller workflow only

// Export a simple function to get initial tutorial starting point
export const getInitialTutorialPath = () => {
  return '/myshop'; // Always start at MyShop
};

// Export a function to check if tutorial should start
export const shouldStartTutorial = () => {
  const tutorialCompleted = localStorage.getItem('unihive_tutorial_completed') === 'true';
  const isNewUser = localStorage.getItem('isNewUser') === 'true';

  return !tutorialCompleted && isNewUser;
};
