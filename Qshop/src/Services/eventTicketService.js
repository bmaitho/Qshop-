// src/Services/eventTicketService.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Guest-friendly ticket init. Creates (or reuses) a shadow auth user keyed
 * by email and inserts a pending event_tickets row server-side. Returns
 * { ticketId, ticketToken, userId, isNewUser } on success.
 *
 * The caller then proceeds with the normal M-Pesa STK push using ticketId.
 */
export const initGuestTicket = async ({
  eventId,
  tierName,
  name,
  email,
  phone,
  quantity = 1,
  promoCodeId = null,
}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/email/guest-ticket-init`,
      { eventId, tierName, name, email, phone, quantity, promoCodeId },
      { timeout: 30000 }
    );
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    return {
      success: false,
      error: data?.error || error.message || 'Failed to initialize ticket',
      existingTicketToken: data?.existingTicketToken,
      status: error.response?.status,
    };
  }
};

/**
 * Trigger a resend of the ticket confirmation email for an existing ticket.
 * Useful as a button on MyTickets / VerifyTicket if a user lost the email.
 */
export const resendTicketEmail = async (ticketId) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/email/event-ticket-resend/${ticketId}`
    );
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to resend email',
    };
  }
};
