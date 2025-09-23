// src/Services/emailApiService.js
// FIXED VERSION - No process.env in frontend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class EmailApiService {
  /**
   * Send confirmation email - FIXED VERSION
   * Only needs email and username, no token required
   */
  async sendConfirmationEmail(email, username) {
    try {
      const response = await fetch(`${API_BASE_URL}/email/send-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send confirmation email');
      }

      return data;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      throw error;
    }
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmationEmail(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/email/resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend confirmation email');
      }

      return data;
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email, username) {
    try {
      const response = await fetch(`${API_BASE_URL}/email/send-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send welcome email');
      }

      return data;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetToken, username) {
    try {
      const response = await fetch(`${API_BASE_URL}/email/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          resetToken,
          username
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      return data;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const emailApiService = new EmailApiService();
export default EmailApiService;