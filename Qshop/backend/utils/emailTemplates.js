// backend/utils/emailTemplates.js

export const confirmationEmailTemplate = (username, confirmationUrl) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your UniHive Account</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      margin-top: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0D2B20;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .content {
      padding: 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #E7C65F;
      color: #0D2B20;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #eeeeee;
      padding-top: 20px;
    }
    .url-display {
      margin-top: 20px;
      word-break: break-all;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h2 style="color: #E7C65F; margin: 0;">UniHive</h2>
      <p style="margin: 0; color: #0D2B20;">Marketplace</p>
    </div>
    <div class="header">
      <h1>Confirm Your Email Address</h1>
    </div>
    <div class="content">
      <p>Hi ${username || 'there'},</p>
      <p>Thank you for signing up for UniHive, the marketplace. Please confirm your email address by clicking the button below:</p>
      <div class="button-container">
        <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
      </div>
      <p>If you're having trouble with the button above, you can copy and paste the following URL into your browser:</p>
      <div class="url-display">
        ${confirmationUrl}
      </div>
      <p>If you didn't sign up for UniHive, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} UniHive. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Text version of confirmation email for clients that don't support HTML
 */
export const confirmationEmailText = (username, confirmationUrl) => {
  return `
Hi ${username || 'there'},

Thank you for signing up for UniHive, the marketplace. Please confirm your email address by clicking this link:

${confirmationUrl}

If you didn't sign up for UniHive, you can safely ignore this email.

© ${new Date().getFullYear()} UniHive. All rights reserved.
  `;
};

/**
 * HTML template for welcome email
 */
export const welcomeEmailTemplate = (username, appUrl) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to UniHive!</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      margin-top: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0D2B20;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .content {
      padding: 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #E7C65F;
      color: #0D2B20;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #eeeeee;
      padding-top: 20px;
    }
    ul {
      margin-top: 20px;
      padding-left: 20px;
    }
    li {
      margin-bottom: 10px;
    }
    .link {
      color: #0D2B20;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h2 style="color: #E7C65F; margin: 0;">UniHive</h2>
      <p style="margin: 0; color: #0D2B20;">Marketplace</p>
    </div>
    <div class="header">
      <h1>Welcome to UniHive!</h1>
    </div>
    <div class="content">
      <p>Hi ${username || 'there'},</p>
      <p>Thank you for confirming your email address. Your UniHive account is now active, and you can start using our marketplace.</p>
      <div class="button-container">
        <a href="${appUrl}" class="button">Visit UniHive</a>
      </div>
      <p>Here are some quick links to help you get started:</p>
      <ul>
        <li>Browse products in the <a href="${appUrl}/studentmarketplace" class="link">Marketplace</a></li>
        <li>Set up your <a href="${appUrl}/profile" class="link">Profile</a></li>
        <li>Start <a href="${appUrl}/myshop" class="link">Selling</a> your own items</li>
      </ul>
      <p>If you have any questions, feel free to contact our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} UniHive. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Text version of welcome email for clients that don't support HTML
 */
export const welcomeEmailText = (username, appUrl) => {
  return `
Hi ${username || 'there'},

Thank you for confirming your email address. Your UniHive account is now active, and you can start using our marketplace.

Visit UniHive: ${appUrl}

Here are some quick links to help you get started:
- Browse products in the Marketplace: ${appUrl}/studentmarketplace
- Set up your Profile: ${appUrl}/profile
- Start Selling your own items: ${appUrl}/myshop

If you have any questions, feel free to contact our support team.

© ${new Date().getFullYear()} UniHive. All rights reserved.
  `;
};

/**
 * HTML template for password reset email
 */
export const passwordResetEmailTemplate = (username, resetUrl) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your UniHive Password</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      margin-top: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0D2B20;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .content {
      padding: 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #E7C65F;
      color: #0D2B20;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #eeeeee;
      padding-top: 20px;
    }
    .url-display {
      margin-top: 20px;
      word-break: break-all;
      color: #666;
      font-size: 14px;
    }
    .warning {
      margin-top: 20px;
      padding: 15px;
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h2 style="color: #E7C65F; margin: 0;">UniHive</h2>
      <p style="margin: 0; color: #0D2B20;">Marketplace</p>
    </div>
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hi ${username || 'there'},</p>
      <p>We received a request to reset your UniHive password. Click the button below to create a new password:</p>
      <div class="button-container">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <p>If you're having trouble with the button above, you can copy and paste the following URL into your browser:</p>
      <div class="url-display">
        ${resetUrl}
      </div>
      <div class="warning">
        <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} UniHive. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Text version of password reset email for clients that don't support HTML
 */
export const passwordResetEmailText = (username, resetUrl) => {
  return `
Hi ${username || 'there'},

We received a request to reset your UniHive password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.

© ${new Date().getFullYear()} UniHive. All rights reserved.
  `;
};

/**
 * NEW: HTML template for seller order notification
 */
export const sellerOrderNotificationTemplate = (sellerName, orderDetails) => {
  const {
    orderId,
    orderItemId,
    productName,
    productImage,
    quantity,
    totalAmount,
    buyerName,
    buyerEmail,
    orderUrl
  } = orderDetails;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received - UniHive</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      margin-top: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      background-color: #0D2B20;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      font-size: 24px;
      margin: 0;
    }
    .badge {
      display: inline-block;
      background-color: #E7C65F;
      color: #0D2B20;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      margin-top: 10px;
    }
    .content {
      padding: 20px;
    }
    .order-info {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .order-info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .order-info-row:last-child {
      border-bottom: none;
    }
    .order-info-label {
      font-weight: bold;
      color: #0D2B20;
    }
    .order-info-value {
      text-align: right;
    }
    .product-card {
      background-color: #ffffff;
      border: 2px solid #E7C65F;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      display: flex;
      align-items: center;
    }
    .product-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
      margin-right: 15px;
    }
    .product-details {
      flex: 1;
    }
    .product-name {
      font-weight: bold;
      font-size: 16px;
      color: #0D2B20;
      margin-bottom: 5px;
    }
    .product-quantity {
      color: #666;
      font-size: 14px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #E7C65F;
      color: #0D2B20;
      text-decoration: none;
      padding: 15px 30px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 16px;
    }
    .action-steps {
      background-color: #e8f5e9;
      border-left: 4px solid #4caf50;
      padding: 15px;
      margin: 20px 0;
    }
    .action-steps h3 {
      margin-top: 0;
      color: #2e7d32;
    }
    .action-steps ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .action-steps li {
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #eeeeee;
      padding-top: 20px;
    }
    .highlight {
      background-color: #fff3cd;
      padding: 2px 6px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 New Order Received!</h1>
      <div class="badge">ACTION REQUIRED</div>
    </div>
    
    <div class="content">
      <p>Hi ${sellerName || 'there'},</p>
      <p>Great news! You've received a new order on UniHive.</p>

      <div class="product-card">
        ${productImage ? `<img src="${productImage}" alt="${productName}" class="product-image" />` : ''}
        <div class="product-details">
          <div class="product-name">${productName}</div>
          <div class="product-quantity">Quantity: ${quantity}</div>
        </div>
      </div>

      <div class="order-info">
        <div class="order-info-row">
          <span class="order-info-label">Order ID:</span>
          <span class="order-info-value">#${orderItemId.substring(0, 8)}</span>
        </div>
        <div class="order-info-row">
          <span class="order-info-label">Buyer:</span>
          <span class="order-info-value">${buyerName}</span>
        </div>
        <div class="order-info-row">
          <span class="order-info-label">Total Amount:</span>
          <span class="order-info-value"><strong>KSh ${totalAmount.toLocaleString()}</strong></span>
        </div>
      </div>

      <div class="action-steps">
        <h3>📋 Next Steps:</h3>
        <ol>
          <li><strong>Contact the buyer</strong> - Message them to confirm order details and arrange delivery</li>
          <li><strong>Wait for buyer's response</strong> - You can only mark as shipped after buyer confirms</li>
          <li><strong>Package the item</strong> - Prepare the product for shipping</li>
          <li><strong>Mark as shipped</strong> - Update the order status once sent</li>
          <li><strong>Get paid</strong> - Payment is automatically processed when you mark the order as delivered</li>
        </ol>
      </div>

      <p><strong>Important:</strong> You must <span class="highlight">contact the buyer and receive their confirmation</span> before you can mark this order as shipped.</p>

      <div class="button-container">
        <a href="${orderUrl}" class="button">View Order Details</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Order placed on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>

    <div class="footer">
      <p>Questions? Contact us at support@unihive.store</p>
      <p>&copy; ${new Date().getFullYear()} UniHive. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * NEW: Text version of seller order notification
 */
export const sellerOrderNotificationText = (sellerName, orderDetails) => {
  const {
    orderItemId,
    productName,
    quantity,
    totalAmount,
    buyerName,
    orderUrl
  } = orderDetails;

  return `
Hi ${sellerName || 'there'},

Great news! You've received a new order on UniHive.

ORDER DETAILS:
--------------
Order ID: #${orderItemId.substring(0, 8)}
Product: ${productName}
Quantity: ${quantity}
Buyer: ${buyerName}
Total Amount: KSh ${totalAmount.toLocaleString()}

NEXT STEPS:
-----------
1. Contact the buyer - Message them to confirm order details and arrange delivery
2. Wait for buyer's response - You can only mark as shipped after buyer confirms
3. Package the item - Prepare the product for shipping
4. Mark as shipped - Update the order status once sent
5. Get paid - Payment is automatically processed when you mark the order as delivered

IMPORTANT: You must contact the buyer and receive their confirmation before you can mark this order as shipped.

View full order details: ${orderUrl}

Order placed on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

Questions? Contact us at support@unihive.store

© ${new Date().getFullYear()} UniHive. All rights reserved.
  `;
};
// NEW EMAIL TEMPLATES for Order Delivered Notification
// Add these to backend/utils/emailTemplates.js

/**
 * HTML template for buyer order delivered notification
 */
export const orderDeliveredEmailTemplate = (buyerName, orderDetails) => {
  const {
    orderId,
    orderItemId,
    productName,
    productImage,
    quantity,
    totalAmount,
    sellerName,
    orderUrl
  } = orderDetails;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Delivered - UniHive</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      margin-top: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      background-color: #10B981;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      font-size: 24px;
      margin: 0;
    }
    .badge {
      display: inline-block;
      background-color: #059669;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      margin-top: 10px;
    }
    .content {
      padding: 20px;
    }
    .order-info {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
    }
    .order-info p {
      margin: 8px 0;
      font-size: 14px;
    }
    .product-image {
      max-width: 200px;
      border-radius: 8px;
      margin: 20px auto;
      display: block;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #10B981;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      background-color: #059669;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .highlight {
      color: #10B981;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Your Order Has Been Delivered!</h1>
      <div class="badge">Order #${orderId || orderItemId.substring(0, 8)}</div>
    </div>
    
    <div class="content">
      <p>Hi <strong>${buyerName || 'Customer'}</strong>,</p>
      
      <p>Great news! Your order has been marked as <span class="highlight">delivered</span> by the seller.</p>
      
      ${productImage ? `<img src="${productImage}" alt="${productName}" class="product-image">` : ''}
      
      <div class="order-info">
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Quantity:</strong> ${quantity}</p>
        <p><strong>Total Amount:</strong> KSh ${totalAmount.toFixed(2)}</p>
        ${sellerName ? `<p><strong>Seller:</strong> ${sellerName}</p>` : ''}
      </div>
      
      <p>Please confirm that you've received your order and rate your experience with the seller:</p>
      
      <div class="button-container">
        <a href="${orderUrl}" class="button">Confirm Receipt & Rate Seller</a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280;">
        Your feedback helps us maintain quality on the UniHive marketplace!
      </p>
    </div>
    
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} UniHive. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Text version of order delivered email
 */
export const orderDeliveredEmailText = (buyerName, orderDetails) => {
  const {
    orderId,
    orderItemId,
    productName,
    quantity,
    totalAmount,
    sellerName,
    orderUrl
  } = orderDetails;

  return `
Hi ${buyerName || 'Customer'},

Your Order Has Been Delivered!

Order #${orderId || orderItemId.substring(0, 8)} has been marked as delivered by the seller.

Order Details:
- Product: ${productName}
- Quantity: ${quantity}
- Total Amount: KSh ${totalAmount.toFixed(2)}
${sellerName ? `- Seller: ${sellerName}` : ''}

Please confirm that you've received your order and rate your experience:

${orderUrl}

Your feedback helps us maintain quality on the UniHive marketplace!



© ${new Date().getFullYear()} UniHive. All rights reserved.
  `;
};

/**
 * HTML template for new message notification email
 * Sent to a user when they receive a message in an order conversation
 */
export const newMessageEmailTemplate = (recipientName, senderName, messagePreview, conversationUrl, context = {}) => {
  const { productName, orderRef } = context;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Message on UniHive</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto 0; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background-color: #0D2B20; color: white; padding: 24px 20px; text-align: center; }
    .logo { color: #E7C65F; font-weight: bold; font-size: 20px; margin-bottom: 6px; }
    .header h1 { margin: 8px 0 0; font-size: 20px; font-weight: normal; }
    .badge { display: inline-block; background-color: #E7C65F; color: #0D2B20; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-top: 10px; }
    .content { padding: 28px 24px; }
    .message-bubble { background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0; padding: 16px 18px; margin: 20px 0; font-size: 15px; color: #1f2937; }
    .context-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; font-size: 13px; color: #6b7280; margin-bottom: 22px; }
    .button-container { text-align: center; margin: 28px 0 16px; }
    .button { display: inline-block; background-color: #16a34a; color: white !important; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-weight: bold; font-size: 15px; letter-spacing: 0.3px; }
    .footer { padding: 18px 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">UniHive</div>
      <h1>💬 New message from ${senderName || 'someone'}</h1>
      <div class="badge">Reply needed</div>
    </div>
    <div class="content">
      <p>Hi <strong>${recipientName || 'there'}</strong>,</p>
      <p><strong>${senderName || 'Someone'}</strong> sent you a message:</p>

      <div class="message-bubble">
        "${messagePreview || '(Open UniHive to view the message)'}"
      </div>

      ${(productName || orderRef) ? `
      <div class="context-box">
        ${productName ? `📦 <strong>Item:</strong> ${productName}` : ''}
        ${productName && orderRef ? '<br>' : ''}
        ${orderRef ? `🧾 <strong>Order:</strong> #${orderRef}` : ''}
      </div>
      ` : ''}

      <p style="font-size:14px; color:#6b7280;">Quick replies help your order move forward. Sellers can only ship after you confirm the delivery arrangement.</p>

      <div class="button-container">
        <a href="${conversationUrl}" class="button">View Message & Reply →</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} UniHive — The Marketplace</p>
      <p>You received this because someone messaged you on UniHive.</p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Plain text version of message notification email
 */
export const newMessageEmailText = (recipientName, senderName, messagePreview, conversationUrl, context = {}) => {
  const { productName, orderRef } = context;
  return `Hi ${recipientName || 'there'},

${senderName || 'Someone'} sent you a message on UniHive:

"${messagePreview || '(View in app)'}"

${productName ? `Item: ${productName}\n` : ''}${orderRef ? `Order: #${orderRef}\n` : ''}
Quick replies help your order move forward.

View the conversation: ${conversationUrl}

© ${new Date().getFullYear()} UniHive. All rights reserved.
`;
};

// ─── Event Ticket Confirmation ───────────────────────────────────────────────
/**
 * @param {Object} t
 * @param {string} t.attendeeName
 * @param {string} t.eventTitle
 * @param {string} t.eventDate        - ISO date string (YYYY-MM-DD) or formatted
 * @param {string} [t.eventTime]      - "HH:MM" 24h, optional
 * @param {string} [t.venue]
 * @param {string} t.tierName
 * @param {number} t.amountPaid
 * @param {string} [t.mpesaReceipt]
 * @param {string} t.ticketToken      - UUID, used in verify URL
 * @param {string} t.verifyUrl        - Full URL to /verify-ticket/<token>
 * @param {boolean} [t.isGuest]       - If true, add "claim your account" CTA
 * @param {string} [t.attendeeEmail]  - For the claim-account link prefill
 */
export const eventTicketConfirmationTemplate = (t) => {
  const fmtKes = (n) => `KES ${Number(n || 0).toLocaleString()}`;
  const fmtDate = (d) => {
    if (!d) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      try {
        return new Date(d + 'T00:00:00').toLocaleDateString('en-KE', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      } catch { return d; }
    }
    return d;
  };
  const fmtTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  };

  const claimAccountBlock = t.isGuest ? `
    <div style="margin-top:32px;padding:20px;background:#FFF9E6;border:1px solid #E7C65F;border-radius:12px;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#0D2B20;font-weight:600;">
        Save this ticket to a UniHive account
      </p>
      <p style="margin:0 0 12px 0;font-size:13px;color:#555;line-height:1.5;">
        Create a free account with this same email (${t.attendeeEmail || ''}) and your ticket will appear in <strong>My Tickets</strong> automatically. Useful for future events.
      </p>
      <a href="https://unihive.shop/auth?email=${encodeURIComponent(t.attendeeEmail || '')}"
         style="display:inline-block;padding:10px 18px;background:#0D2B20;color:#E7C65F;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
        Set up account →
      </a>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your UniHive Ticket — ${t.eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
      <!-- Hero -->
      <div style="background:#0D2B20;color:#E7C65F;padding:28px 24px;text-align:center;">
        <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.8;">UniHive Ticket</p>
        <h1 style="margin:8px 0 0 0;font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#E7C65F;font-weight:700;">
          ${t.eventTitle}
        </h1>
      </div>

      <!-- Greeting -->
      <div style="padding:24px 24px 8px 24px;">
        <p style="margin:0;font-size:15px;color:#333;">
          Hi ${t.attendeeName || 'there'},
        </p>
        <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#444;">
          You're in! 🎉 Your ticket is confirmed. <strong>Show the QR code below at the entrance</strong> — or open this email on your phone when you arrive.
        </p>
      </div>

      <!-- QR -->
      <div style="text-align:center;padding:24px;">
        <div style="display:inline-block;padding:16px;background:#ffffff;border:2px solid #0D2B20;border-radius:14px;">
          <img src="cid:ticket-qr" alt="Your ticket QR code" width="220" height="220" style="display:block;width:220px;height:220px;" />
        </div>
        <p style="margin:12px 0 0 0;font-size:11px;color:#888;word-break:break-all;font-family:monospace;">
          ${t.ticketToken}
        </p>
      </div>

      <!-- Event details -->
      <div style="padding:0 24px 16px 24px;">
        <div style="background:#FAFAF7;border:1px solid #ECECEC;border-radius:12px;padding:18px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#888;width:90px;">Event</td><td style="padding:6px 0;color:#0D2B20;font-weight:600;">${t.eventTitle}</td></tr>
            ${t.eventDate ? `<tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;color:#0D2B20;">${fmtDate(t.eventDate)}</td></tr>` : ''}
            ${t.eventTime ? `<tr><td style="padding:6px 0;color:#888;">Time</td><td style="padding:6px 0;color:#0D2B20;">${fmtTime(t.eventTime)}</td></tr>` : ''}
            ${t.venue ? `<tr><td style="padding:6px 0;color:#888;">Venue</td><td style="padding:6px 0;color:#0D2B20;">${t.venue}</td></tr>` : ''}
            ${t.tierName ? `<tr><td style="padding:6px 0;color:#888;">Tier</td><td style="padding:6px 0;color:#0D2B20;font-weight:600;">${t.tierName}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;color:#0D2B20;font-weight:600;">${fmtKes(t.amountPaid)}</td></tr>
            ${t.mpesaReceipt ? `<tr><td style="padding:6px 0;color:#888;">Receipt</td><td style="padding:6px 0;color:#0D2B20;font-family:monospace;">${t.mpesaReceipt}</td></tr>` : ''}
          </table>
        </div>
      </div>

      <!-- View ticket online -->
      <div style="padding:8px 24px 24px 24px;text-align:center;">
        <a href="${t.verifyUrl}"
           style="display:inline-block;padding:12px 22px;background:#0D2B20;color:#E7C65F;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
          View ticket online
        </a>
        <p style="margin:12px 0 0 0;font-size:12px;color:#888;line-height:1.5;">
          If the QR code above doesn't display, use this link or scan it from this email.
        </p>
      </div>

      ${claimAccountBlock}

      <!-- Footer -->
      <div style="padding:16px 24px 24px 24px;border-top:1px solid #ECECEC;margin-top:8px;">
        <p style="margin:0;font-size:11px;color:#999;text-align:center;line-height:1.6;">
          Save this email — your QR code is your entry pass.<br/>
          Questions? Reply to this email or contact <a href="mailto:mwendatulley@gmail.com" style="color:#0D2B20;">support</a>.<br/>
          © ${new Date().getFullYear()} UniHive
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

export const eventTicketConfirmationText = (t) => {
  const fmtKes = (n) => `KES ${Number(n || 0).toLocaleString()}`;
  return `Your UniHive Ticket — ${t.eventTitle}

Hi ${t.attendeeName || 'there'},

You're in! Your ticket is confirmed.

EVENT DETAILS
Event: ${t.eventTitle}
${t.eventDate ? `Date: ${t.eventDate}\n` : ''}${t.eventTime ? `Time: ${t.eventTime}\n` : ''}${t.venue ? `Venue: ${t.venue}\n` : ''}${t.tierName ? `Tier: ${t.tierName}\n` : ''}Amount: ${fmtKes(t.amountPaid)}
${t.mpesaReceipt ? `Receipt: ${t.mpesaReceipt}\n` : ''}
View / scan your ticket online (your QR is also attached as an image):
${t.verifyUrl}

Ticket token: ${t.ticketToken}

${t.isGuest ? `\nWant to save this ticket to a UniHive account? Sign up with this same email at https://unihive.shop/auth — your ticket will appear automatically.\n` : ''}
Save this email — your QR is your entry pass.

© ${new Date().getFullYear()} UniHive
`;
};
