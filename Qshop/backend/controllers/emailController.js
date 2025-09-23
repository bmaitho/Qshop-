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
  passwordResetEmailText
} from '../utils/emailTemplates.js';

// Load environment variables
dotenv.config();

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// If API key is missing, log an error
if (!process.env.RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY environment variable');
}

// Define email sender address from environment or use default
const SENDER_EMAIL = process.env.EMAIL_FROM || 'UniHive <noreply@yourdomain.com>';
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
    
    // Construct confirmation URL
    // Note: This should match Supabase's configuration
    const confirmationUrl = `${APP_URL}/auth/confirm#confirmation_token=${confirmationToken}&type=signup`;
    
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
    
    // FIX: Complete the success message (was previously cut off as "Confirmatio")
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
    // Note: This requires admin privileges in Supabase
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
    
    // Generate a new confirmation token
    // This is a simplified example; in practice, you would use Supabase's API
    // to request a new confirmation token
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
    const url = new URL(tokenData.properties.action_link);
    const token = url.hash.split('token=')[1].split('&')[0];
    
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