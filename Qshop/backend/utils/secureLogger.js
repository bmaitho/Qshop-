/**
 * Secure logging utility to prevent sensitive data exposure
 * Masks sensitive information in logs while maintaining debugging capability
 */

/**
 * Masks a sensitive string, showing only first/last few characters
 * @param {string} value - The sensitive value to mask
 * @param {number} visibleChars - Number of characters to show at start/end
 * @returns {string} Masked string
 */
export const maskSensitive = (value, visibleChars = 4) => {
  if (!value || typeof value !== 'string') {
    return '[INVALID]';
  }

  if (value.length <= visibleChars * 2) {
    return '***';
  }

  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  return `${start}...${end}`;
};

/**
 * Safely log credentials existence without exposing values
 * @param {Object} credentials - Object containing credential information
 * @returns {Object} Safe version with masked values
 */
export const safeCredentials = (credentials) => {
  const safe = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'boolean') {
      safe[key] = value;
    } else if (typeof value === 'string') {
      safe[key] = value.length > 0 ? `[${value.length} chars]` : '[EMPTY]';
    } else {
      safe[key] = '[PRESENT]';
    }
  }

  return safe;
};

/**
 * Safe logger for production that masks sensitive data
 */
export const secureLog = {
  credentials: (label, data) => {
    console.log(`${label}:`, safeCredentials(data));
  },

  token: (label, token) => {
    if (!token) {
      console.log(`${label}: [MISSING]`);
    } else {
      console.log(`${label}: ${maskSensitive(token, 5)}`);
    }
  },

  info: (message, data = null) => {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  },

  error: (message, error = null) => {
    if (error) {
      // Only log error message, not full stack in production
      console.error(message, error.message || error);
    } else {
      console.error(message);
    }
  }
};
