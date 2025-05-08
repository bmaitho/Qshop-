// backend/utils/emailTemplates.js

/**
 * HTML template for confirmation email
 */
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
        <p>We received a request to reset your password for your UniHive account. Click the button below to create a new password:</p>
        <div class="button-container">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        <p>If you're having trouble with the button above, you can copy and paste the following URL into your browser:</p>
        <div class="url-display">
          ${resetUrl}
        </div>
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
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
  
  We received a request to reset your password for your UniHive account. Click the link below to create a new password:
  
  ${resetUrl}
  
  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
  
  © ${new Date().getFullYear()} UniHive. All rights reserved.
    `;
  };