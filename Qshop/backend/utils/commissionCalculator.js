// backend/utils/commissionCalculator.js
// OFFICIAL UniHive Commission Structure
// Platform Fee is split 50/50 between buyer and seller

const COMMISSION_TABLE = [
  { min: 1, max: 49, safFee: 0, platformFee: 10, buyerFee: 5, sellerFee: 5, profit: 10 },
  { min: 50, max: 100, safFee: 0, platformFee: 15, buyerFee: 7.5, sellerFee: 7.5, profit: 15 },
  { min: 101, max: 300, safFee: 5, platformFee: 30, buyerFee: 15, sellerFee: 15, profit: 25 },
  { min: 301, max: 500, safFee: 5, platformFee: 35, buyerFee: 17.5, sellerFee: 17.5, profit: 30 },
  { min: 501, max: 800, safFee: 10, platformFee: 40, buyerFee: 20, sellerFee: 20, profit: 30 },
  { min: 801, max: 1000, safFee: 10, platformFee: 50, buyerFee: 25, sellerFee: 25, profit: 40 },
  { min: 1001, max: 1200, safFee: 15, platformFee: 55, buyerFee: 27.5, sellerFee: 27.5, profit: 40 },
  { min: 1201, max: 1500, safFee: 15, platformFee: 65, buyerFee: 32.5, sellerFee: 32.5, profit: 50 },
  { min: 1501, max: 2000, safFee: 20, platformFee: 75, buyerFee: 37.5, sellerFee: 37.5, profit: 55 },
  { min: 2001, max: 2500, safFee: 20, platformFee: 90, buyerFee: 45, sellerFee: 45, profit: 70 },
  { min: 2501, max: 3000, safFee: 25, platformFee: 105, buyerFee: 52.5, sellerFee: 52.5, profit: 80 },
  { min: 3001, max: 3500, safFee: 25, platformFee: 120, buyerFee: 60, sellerFee: 60, profit: 95 },
  { min: 3501, max: 4000, safFee: 34, platformFee: 140, buyerFee: 70, sellerFee: 70, profit: 106 },
  { min: 4001, max: 5000, safFee: 34, platformFee: 160, buyerFee: 80, sellerFee: 80, profit: 126 },
  { min: 5001, max: 6500, safFee: 42, platformFee: 160, buyerFee: 80, sellerFee: 80, profit: 118 },
  { min: 6501, max: 7500, safFee: 42, platformFee: 180, buyerFee: 90, sellerFee: 90, profit: 138 },
  { min: 7501, max: 9000, safFee: 48, platformFee: 200, buyerFee: 100, sellerFee: 100, profit: 152 },
  { min: 9001, max: 10000, safFee: 48, platformFee: 220, buyerFee: 110, sellerFee: 110, profit: 172 },
  { min: 10001, max: 12000, safFee: 57, platformFee: 240, buyerFee: 120, sellerFee: 120, profit: 183 },
  { min: 12001, max: 15000, safFee: 57, platformFee: 270, buyerFee: 135, sellerFee: 135, profit: 213 },
  { min: 15001, max: 17000, safFee: 62, platformFee: 300, buyerFee: 150, sellerFee: 150, profit: 238 },
  { min: 17001, max: 20000, safFee: 62, platformFee: 340, buyerFee: 170, sellerFee: 170, profit: 278 },
  { min: 20001, max: 22000, safFee: 67, platformFee: 380, buyerFee: 190, sellerFee: 190, profit: 313 },
  { min: 22001, max: 25000, safFee: 67, platformFee: 420, buyerFee: 210, sellerFee: 210, profit: 353 },
  { min: 25001, max: 28000, safFee: 72, platformFee: 460, buyerFee: 230, sellerFee: 230, profit: 388 },
  { min: 28001, max: 30000, safFee: 72, platformFee: 500, buyerFee: 250, sellerFee: 250, profit: 428 },
  { min: 30001, max: 32000, safFee: 83, platformFee: 560, buyerFee: 280, sellerFee: 280, profit: 477 },
  { min: 32001, max: 35000, safFee: 83, platformFee: 620, buyerFee: 310, sellerFee: 310, profit: 537 },
  { min: 35001, max: 37500, safFee: 99, platformFee: 700, buyerFee: 350, sellerFee: 350, profit: 601 },
  { min: 37501, max: 40000, safFee: 99, platformFee: 760, buyerFee: 380, sellerFee: 380, profit: 661 },
  { min: 40001, max: 42500, safFee: 103, platformFee: 820, buyerFee: 410, sellerFee: 410, profit: 717 },
  { min: 42501, max: 45000, safFee: 103, platformFee: 880, buyerFee: 440, sellerFee: 440, profit: 777 },
  { min: 45001, max: 47500, safFee: 108, platformFee: 940, buyerFee: 470, sellerFee: 470, profit: 832 },
  { min: 47501, max: 50000, safFee: 108, platformFee: 1000, buyerFee: 500, sellerFee: 500, profit: 892 },
  { min: 50001, max: 60000, safFee: 108, platformFee: 1100, buyerFee: 550, sellerFee: 550, profit: 992 },
  { min: 60001, max: 70000, safFee: 108, platformFee: 1200, buyerFee: 600, sellerFee: 600, profit: 1092 },
  { min: 70001, max: 150000, safFee: 108, platformFee: 1500, buyerFee: 750, sellerFee: 750, profit: 1392 },
  { min: 150001, max: 250000, safFee: 108, platformFee: 2000, buyerFee: 1000, sellerFee: 1000, profit: 1892 }
];

/**
 * Calculate commission fees for a given product price
 * @param {number} productPrice - The price of the product
 * @returns {Object} Commission breakdown
 */
export const calculateCommission = (productPrice) => {
  const price = parseFloat(productPrice);
  
  // Find the appropriate fee tier
  const tier = COMMISSION_TABLE.find(
    t => price >= t.min && price <= t.max
  );
  
  // If price exceeds max, use highest tier
  const fees = tier || COMMISSION_TABLE[COMMISSION_TABLE.length - 1];
  
  return {
    productPrice: price,
    safaricomFee: fees.safFee,
    platformFee: fees.platformFee,
    buyerFee: fees.buyerFee,
    sellerFee: fees.sellerFee,
    platformProfit: fees.profit,
    // Calculated amounts
    buyerTotal: price + fees.buyerFee,
    sellerPayout: price - fees.sellerFee,
    // Breakdown for transparency
    breakdown: {
      productPrice: price,
      buyerPaysExtra: fees.buyerFee,
      sellerKeeps: price - fees.sellerFee,
      platformCollects: fees.platformFee,
      safaricomTakes: fees.safFee,
      uniHiveProfit: fees.profit
    }
  };
};

/**
 * Calculate commission for an order item (with quantity)
 * @param {number} pricePerUnit - Price per unit
 * @param {number} quantity - Quantity ordered
 * @returns {Object} Commission breakdown with totals
 */
export const calculateOrderItemCommission = (pricePerUnit, quantity) => {
  const singleItemCommission = calculateCommission(pricePerUnit);
  const qty = parseInt(quantity) || 1;
  
  return {
    ...singleItemCommission,
    quantity: qty,
    // Totals for full order item
    totalProductPrice: singleItemCommission.productPrice * qty,
    totalBuyerCost: singleItemCommission.buyerTotal * qty,
    totalSellerPayout: singleItemCommission.sellerPayout * qty,
    totalPlatformFee: singleItemCommission.platformFee * qty,
    totalPlatformProfit: singleItemCommission.platformProfit * qty,
    totalSafaricomFee: singleItemCommission.safaricomFee * qty
  };
};

/**
 * Get commission display info for UI
 * @param {number} productPrice 
 * @returns {Object} Formatted strings for display
 */
export const getCommissionDisplayInfo = (productPrice) => {
  const commission = calculateCommission(productPrice);
  
  return {
    buyerFeesText: `+KES ${commission.buyerFee.toFixed(2)} (platform fee)`,
    sellerEarnsText: `You'll receive KES ${commission.sellerPayout.toFixed(2)}`,
    platformFeeText: `KES ${commission.platformFee.toFixed(2)}`,
    fullBreakdown: `
      Product: KES ${commission.productPrice.toFixed(2)}
      Buyer pays: KES ${commission.buyerTotal.toFixed(2)}
      Seller gets: KES ${commission.sellerPayout.toFixed(2)}
      Platform fee: KES ${commission.platformFee.toFixed(2)}
    `.trim()
  };
};

/**
 * Calculate total for a cart (multiple items)
 * @param {Array} cartItems - Array of cart items with {price, quantity}
 * @returns {Object} Cart totals with fees
 */
export const calculateCartTotal = (cartItems) => {
  let subtotal = 0;
  let totalBuyerFees = 0;
  let totalPlatformFees = 0;
  
  const itemsWithCommission = cartItems.map(item => {
    const commission = calculateOrderItemCommission(item.price, item.quantity);
    subtotal += commission.totalProductPrice;
    totalBuyerFees += (commission.buyerFee * commission.quantity);
    totalPlatformFees += commission.totalPlatformFee;
    
    return {
      ...item,
      commission
    };
  });
  
  return {
    items: itemsWithCommission,
    subtotal,
    totalBuyerFees,
    totalPlatformFees,
    grandTotal: subtotal + totalBuyerFees,
    breakdown: {
      productsTotal: subtotal,
      platformFees: totalBuyerFees,
      youPay: subtotal + totalBuyerFees
    }
  };
};