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
      <p style="margin: 0; color: #0D2B20;">Student Marketplace</p>
    </div>
    <div class="header">
      <h1>Confirm Your Email Address</h1>
    </div>
    <div class="content">
      <p>Hi ${username || 'there'},</p>
      <p>Thank you for signing up for UniHive, the student marketplace. Please confirm your email address by clicking the button below:</p>
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

Thank you for signing up for UniHive, the student marketplace. Please confirm your email address by clicking this link:

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
      <p style="margin: 0; color: #0D2B20;">Student Marketplace</p>
    </div>
    <div class="header">
      <h1>Welcome to UniHive!</h1>
    </div>
    <div class="content">
      <p>Hi ${username || 'there'},</p>
      <p>Thank you for confirming your email address. Your UniHive account is now active, and you can start using our student marketplace.</p>
      <div class="button-container">
        <a href="${appUrl}" class="button">Visit UniHive</a>
      </div>
      <p>Here are some quick links to help you get started:</p>
      <ul>
        <li>Browse products in the <a href="${appUrl}/studentmarketplace" class="link">Student Marketplace</a></li>
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

Thank you for confirming your email address. Your UniHive account is now active, and you can start using our student marketplace.

Visit UniHive: ${appUrl}

Here are some quick links to help you get started:
- Browse products in the Student Marketplace: ${appUrl}/studentmarketplace
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
      <p style="margin: 0; color: #0D2B20;">Student Marketplace</p>
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
