// backend/middleware/authMiddleware.js
import { supabase } from '../supabaseClient.js';

/**
 * Middleware to verify Supabase JWT tokens and extract user information
 */
export const verifyAuth = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No valid token provided' 
      });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No valid token provided' 
      });
    }
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token verification error:', error);
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Invalid token' 
      });
    }
    
    // Add the user to the request object
    req.user = user;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error in auth middleware' 
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req, res, next) => {
  // Make sure verifyAuth middleware has run first
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: No user found' 
    });
  }
  
  // Check if user has admin role
  // This depends on how you structure your user roles in Supabase
  const isAdmin = req.user.app_metadata?.role === 'admin';
  
  if (!isAdmin) {
    return res.status(403).json({ 
      success: false, 
      error: 'Forbidden: Admin access required' 
    });
  }
  
  next();
};

/**
 * Middleware to check if authenticated user is requesting their own data
 * or is an admin (useful for operations that should only be performed by the user or admin)
 */
export const requireSelfOrAdmin = (req, res, next) => {
  // Make sure verifyAuth middleware has run first
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: No user found' 
    });
  }
  
  // Get the requested user ID from the route parameters
  const requestedUserId = req.params.userId;
  
  // Check if the user is requesting their own data or is an admin
  const isOwnData = req.user.id === requestedUserId;
  const isAdmin = req.user.app_metadata?.role === 'admin';
  
  if (!isOwnData && !isAdmin) {
    return res.status(403).json({ 
      success: false, 
      error: 'Forbidden: You can only access your own data' 
    });
  }
  
  next();
};

// Rate limiting middleware to prevent abuse
export const rateLimiter = () => {
  // Simple in-memory rate limiter
  const requests = {};
  const WINDOW_SIZE_MS = 60 * 60 * 1000; // 1 hour
  const MAX_REQUESTS = 10; // Maximum 10 email requests per hour
  
  return (req, res, next) => {
    // Get user ID or IP address as identifier
    const identifier = req.user?.id || req.ip;
    const now = Date.now();
    
    // Initialize or clean up old entries
    if (!requests[identifier]) {
      requests[identifier] = [];
    }
    
    // Remove entries older than the window size
    requests[identifier] = requests[identifier].filter(
      timestamp => now - timestamp < WINDOW_SIZE_MS
    );
    
    // Check if user has exceeded the rate limit
    if (requests[identifier].length >= MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    }
    
    // Add current request timestamp
    requests[identifier].push(now);
    
    next();
  };
};