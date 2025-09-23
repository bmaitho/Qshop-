// src/services/emailApiService.js
import axios from 'axios';

// Your base URL from environment variables - remove /api since VITE_API_URL already includes it
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173/api';

// Debug: Log the API URL being used (remove this in production)
console.log('Email API Service - Using API_BASE_URL:', API_BASE_URL);

/**
 * Service for handling email-related API calls
 */
export const emailApiService = {
  /**
   * Send a confirmation email to a new user
   * 
   * @param {string} email - User's email address
   * @param {string} confirmationToken - Token for email confirmation
   * @param {string} username - User's name or username
   * @returns {Promise<Object>} - Email sending result
   */
  async sendConfirmationEmail(email, confirmationToken, username) {
    try {
      if (!email || !confirmationToken) {
        throw new Error('Email and confirmation token are required');
      }

      const response = await axios.post(`${API_BASE_URL}/email/confirmation`, {
        email,
        confirmationToken,
        username
      });

      return {
        success: true,
        data: response.data,
        message: 'Confirmation email sent successfully'
      };
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send confirmation email'
      };
    }
  },

  /**
   * Resend a confirmation email to a user who hasn't confirmed yet
   * 
   * @param {string} email - User's email address
   * @returns {Promise<Object>} - Email sending result
   */
  async resendConfirmationEmail(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      const response = await axios.post(`${API_BASE_URL}/email/confirmation/resend`, {
        email
      });

      return {
        success: true,
        data: response.data,
        message: 'Confirmation email resent successfully'
      };
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to resend confirmation email'
      };
    }
  },

  /**
   * Send a welcome email after confirmation
   * 
   * @param {string} email - User's email address
   * @param {string} username - User's name or username
   * @returns {Promise<Object>} - Email sending result
   */
  async sendWelcomeEmail(email, username) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      // Get the token from session storage
      const token = JSON.parse(sessionStorage.getItem('token'));
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_BASE_URL}/email/welcome`,
        { email, username },
        {
          headers: {
            Authorization: `Bearer ${token.session.access_token}`
          }
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Welcome email sent successfully'
      };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send welcome email'
      };
    }
  },

  /**
   * Send a password reset email
   * 
   * @param {string} email - User's email address
   * @param {string} resetToken - Token for password reset
   * @returns {Promise<Object>} - Email sending result
   */
  async sendPasswordResetEmail(email, resetToken) {
    try {
      if (!email || !resetToken) {
        throw new Error('Email and reset token are required');
      }

      const response = await axios.post(`${API_BASE_URL}/email/password-reset`, {
        email,
        resetToken
      });

      return {
        success: true,
        data: response.data,
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send password reset email'
      };
    }
  }
};

export default emailApiService;