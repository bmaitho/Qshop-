// src/utils/imageUtils.js

/**
 * Simple image optimization utilities
 */

/**
 * Generates image dimensions appropriate for the context where it will be displayed
 * 
 * @param {string} context - Where the image will be shown (card, detail, etc.)
 * @returns {Object} Width and height values
 */
export const getImageDimensions = (context) => {
  switch (context) {
    case 'card':
      return { width: 400, height: 400 };
    case 'detail':
      return { width: 800, height: 800 };
    case 'thumbnail':
      return { width: 100, height: 100 };
    case 'banner':
      return { width: 1200, height: 400 };
    default:
      return { width: 400, height: 400 };
  }
};

/**
 * Creates a properly sized image URL by appending width/height parameters
 * This works with Cloudinary, Imgix, or similar services
 * For Supabase, you might need to set up a proxy or use a third-party service
 * 
 * @param {string} url - Original image URL
 * @param {Object} options - Sizing options
 * @returns {string} Optimized image URL
 */
export const getOptimizedUrl = (url, options = {}) => {
  if (!url) return '/api/placeholder/400/400';
  
  // If it's already a placeholder, just return it
  if (url.includes('/api/placeholder/')) {
    return url;
  }
  
  // Example using Cloudinary-style parameters
  // In a real implementation, you'd check the URL and use the appropriate service
  try {
    const imageUrl = new URL(url);
    
    // Only add parameters if they don't already exist
    if (options.width && !imageUrl.searchParams.has('width')) {
      imageUrl.searchParams.append('width', options.width);
    }
    
    if (options.height && !imageUrl.searchParams.has('height')) {
      imageUrl.searchParams.append('height', options.height);
    }
    
    return imageUrl.toString();
  } catch (e) {
    console.error('Invalid URL in image optimization:', url);
    return url;
  }
};

/**
 * Implements a simple image preloader
 * 
 * @param {string} src - Image URL to preload
 * @returns {Promise} Resolves when image is loaded
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('No image URL provided'));
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Handles common image loading with fallbacks
 * 
 * @param {string} url - Primary image URL
 * @param {string} fallback - Fallback image URL
 * @param {function} setImage - State setter function
 * @param {function} setLoading - Loading state setter function
 */
export const loadImageWithFallback = async (url, fallback, setImage, setLoading) => {
  if (!url) {
    setImage(fallback);
    setLoading(false);
    return;
  }
  
  try {
    setLoading(true);
    await preloadImage(url);
    setImage(url);
  } catch (error) {
    console.warn('Image load failed, using fallback:', error);
    setImage(fallback);
  } finally {
    setLoading(false);
  }
};

export default {
  getImageDimensions,
  getOptimizedUrl,
  preloadImage,
  loadImageWithFallback
};