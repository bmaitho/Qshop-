// backend/controllers/emailController.js
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { supabase } from '../supabaseClient.js';
import { 
  confirmationEmailTemplate, 
  confirmationEmailText,
  welcomeEmailTemplate,
  welcomeEmailText,
  passwordResetEmailTemplate,
  passwordResetEmailText,
  sellerOrderNotificationTemplate,
  sellerOrderNotificationText
} from '../utils/emailTemplates.js';

// Load environment variables
dotenv.config();

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// If API key is missing, log an error
if (!process.env.RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY environment variable');
}

// Define email sender address - use unihive.store for sending emails
const SENDER_EMAIL = process.env.EMAIL_FROM || 'UniHive <noreply@unihive.store>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/**
 * Send confirmation email to a newly registered user
 */
export const sendConfirmationEmail = async (req, res) => {
  try {
    const { email, confirmationToken, username } = req.body;
    
    // Validate required fields
    if (!email || !confirmationToken) {
      return res.status(400).json({
        success: false,
        error: 'Email and confirmation token are required'
      });
    }
    
    // Construct confirmation URL to match Supabase's expected format
    const confirmationUrl = `${APP_URL}/auth/confirm#confirmation_token=${confirmationToken}&type=signup&redirect_to=${encodeURIComponent(APP_URL + '/home')}`;
    
    // Get user information from Supabase if username is not provided
    let finalUsername = username;
    if (!finalUsername) {
      try {
        // Look up user by email to get their profile
        const { data: user, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('email', email)
          .maybeSingle();
          
        if (!error && user) {
          finalUsername = user.full_name;
        }
      } catch (profileError) {
        // Continue without username if there's an error
        console.error('Error fetching user profile:', profileError);
      }
    }
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: 'Confirm Your UniHive Account',
      html: confirmationEmailTemplate(finalUsername, confirmationUrl),
      text: confirmationEmailText(finalUsername, confirmationUrl),
    });
    
    if (error) {
      console.error('Resend API error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send confirmation email'
      });
    }
    
    // Log success for debugging
    console.log('Confirmation email sent:', data.id);
    
    return res.status(200).json({
      success: true,
      message: 'Confirmation email sent successfully',
      data: { id: data.id }
    });
  } catch (error) {
    console.error('Error in sendConfirmationEmail:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send welcome email after a user confirms their account
 */
export const sendWelcomeEmail = async (req, res) => {
  try {
    const { email, username } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // Get user information from Supabase if username is not provided
    let finalUsername = username;
    if (!finalUsername) {
      try {
        // Look up user by email to get their profile
        const { data: user, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('email', email)
          .maybeSingle();
          
        if (!error && user) {
          finalUsername = user.full_name;
        }
      } catch (profileError) {
        // Continue without username if there's an error
        console.error('Error fetching user profile:', profileError);
      }
    }
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: 'Welcome to UniHive!',
      html: welcomeEmailTemplate(finalUsername, APP_URL),
      text: welcomeEmailText(finalUsername, APP_URL),
    });
    
    if (error) {
      console.error('Resend API error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send welcome email'
      });
    }
    
    // Log success for debugging
    console.log('Welcome email sent:', data.id);
    
    return res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully',
      data: { id: data.id }
    });
  } catch (error) {
    console.error('Error in sendWelcomeEmail:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email, resetToken, username } = req.body;
    
    // Validate required fields
    if (!email || !resetToken) {
      return res.status(400).json({
        success: false,
        error: 'Email and reset token are required'
      });
    }
    
    // Construct reset URL
    const resetUrl = `${APP_URL}/auth/reset-password#type=recovery&token=${resetToken}`;
    
    // Get user information from Supabase if username is not provided
    let finalUsername = username;
    if (!finalUsername) {
      try {
        // Look up user by email to get their profile
        const { data: user, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('email', email)
          .maybeSingle();
          
        if (!error && user) {
          finalUsername = user.full_name;
        }
      } catch (profileError) {
        // Continue without username if there's an error
        console.error('Error fetching user profile:', profileError);
      }
    }
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: 'Reset Your UniHive Password',
      html: passwordResetEmailTemplate(finalUsername, resetUrl),
      text: passwordResetEmailText(finalUsername, resetUrl),
    });
    
    if (error) {
      console.error('Resend API error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email'
      });
    }
    
    // Log success for debugging
    console.log('Password reset email sent:', data.id);
    
    return res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
      data: { id: data.id }
    });
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Resend confirmation email for users who haven't confirmed yet
 */
export const resendConfirmationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // Check if the user exists and is not already confirmed
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify user status'
      });
    }
    
    // Find the user by email
    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if the user is already confirmed
    if (user.email_confirmed_at) {
      return res.status(400).json({
        success: false,
        error: 'Email is already confirmed'
      });
    }
    
    console.log('Generating confirmation link for email:', email);
    
    // Generate a new confirmation token using Supabase Admin API
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${APP_URL}/auth/confirm`
      }
    });
    
    if (tokenError) {
      console.error('Error generating confirmation token:', tokenError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate confirmation token'
      });
    }
    
    // Extract the token from the generated URL
    const actionLink = tokenData.properties.action_link;
    let token;
    
    try {
      const url = new URL(actionLink);
      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.substring(1));
        token = hashParams.get('confirmation_token') || hashParams.get('token');
      }
      
      if (!token) {
        token = url.searchParams.get('confirmation_token') || url.searchParams.get('token');
      }
      
      if (!token) {
        throw new Error('Could not extract confirmation token from URL');
      }
    } catch (urlError) {
      console.error('Error parsing action link:', urlError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse confirmation token'
      });
    }
    
    // Send confirmation email with new token
    const result = await sendConfirmationEmail({
      body: {
        email,
        confirmationToken: token,
        username: user.user_metadata?.full_name
      }
    }, {
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
          return { end: () => {} };
        },
        end: () => {}
      })
    });
    
    return result;
  } catch (error) {
    console.error('Error in resendConfirmationEmail:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * NEW: Send order notification email to seller
 */
export const sendSellerOrderNotification = async (req, res) => {
  try {
    const { 
      sellerEmail, 
      sellerName,
      orderId,
      orderItemId,
      productName,
      productImage,
      quantity,
      totalAmount,
      buyerName,
      buyerEmail
    } = req.body;
    
    // Validate required fields
    if (!sellerEmail || !orderItemId || !productName || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Seller email, order item ID, product name, and total amount are required'
      });
    }
    
    // Construct order URL
    const orderUrl = `${APP_URL}/seller/orders/${orderItemId}`;
    
    // Prepare order details for template
    const orderDetails = {
      orderId: orderId || orderItemId,
      orderItemId,
      productName,
      productImage: productImage || null,
      quantity: quantity || 1,
      totalAmount,
      buyerName: buyerName || 'Customer',
      buyerEmail: buyerEmail || '',
      orderUrl
    };
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: sellerEmail,
      subject: `🎉 New Order #${orderItemId.substring(0, 8)} - ${productName}`,
      html: sellerOrderNotificationTemplate(sellerName, orderDetails),
      text: sellerOrderNotificationText(sellerName, orderDetails),
    });
    
    if (error) {
      console.error('Resend API error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send seller order notification'
      });
    }
    
    // Log success for debugging
    console.log('Seller order notification sent:', data.id);
    
    return res.status(200).json({
      success: true,
      message: 'Seller order notification sent successfully',
      data: { id: data.id }
    });
  } catch (error) {
    console.error('Error in sendSellerOrderNotification:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};