const API_URL = import.meta.env.VITE_API_URL;

/**
 * Send an email notification to the message recipient.
 *
 * @param {Object} params
 * @param {string} params.recipientId       — UUID of recipient
 * @param {string} params.senderName        — Display name of sender
 * @param {string} params.messageText       — Full message text
 * @param {string} [params.orderItemId]     — UUID of order_item (if order context)
 * @param {string} [params.orderId]         — UUID of order (if available)
 * @param {string} [params.productId]       — UUID of product (if product context)
 */
export const sendMessageEmail = async ({
  recipientId,
  senderName,
  messageText,
  orderItemId = null,
  orderId = null,
  productId = null,
}) => {
  if (!API_URL) return;

  try {
    const response = await fetch(`${API_URL}/email/message-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId,
        senderName,
        messageText,
        orderItemId,
        orderId,
        productId,
      }),
    });

    if (!response.ok) {
      console.warn('[sendMessageEmail] Non-OK response:', response.status);
    }
  } catch (err) {
    console.warn('[sendMessageEmail] Failed silently:', err.message);
  }
};
