// src/utils/campusUtils.js
import { supabase } from '../components/SupabaseClient';

// Cache for campus locations to avoid repeated API calls
let campusLocationsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetches campus locations from Supabase
 * Uses caching to minimize API calls
 * @param {boolean} forceRefresh - Whether to force a refresh of cached data
 * @returns {Promise<Array>} - Array of campus locations
 */
export const fetchCampusLocations = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached data if it exists and is still valid
  if (
    !forceRefresh && 
    campusLocationsCache && 
    lastFetchTime > 0 && 
    now - lastFetchTime < CACHE_DURATION
  ) {
    return campusLocationsCache;
  }
  
  try {
    const { data, error } = await supabase
      .from('campus_locations')
      .select('*')
      .order('name');

    if (error) throw error;
    
    // Update cache and timestamp
    campusLocationsCache = data || [];
    lastFetchTime = now;
    
    return campusLocationsCache;
  } catch (error) {
    console.error('Error fetching campus locations:', error);
    // Return empty array or cached data if available
    return campusLocationsCache || [];
  }
};

/**
 * Gets campus location name by ID
 * @param {number|string} id - The campus location ID
 * @returns {Promise<string>} - The campus location name or 'Unknown Campus'
 */
export const getCampusNameById = async (id) => {
  if (!id) return 'Unknown Campus';
  
  // Ensure we have campus data
  const locations = await fetchCampusLocations();
  
  // Find location by ID (converting to string for comparison)
  const location = locations.find(
    loc => loc.id.toString() === id.toString()
  );
  
  return location ? location.name : 'Unknown Campus';
};

/**
 * Gets campus location by ID
 * @param {number|string} id - The campus location ID
 * @returns {Promise<Object|null>} - The campus location object or null
 */
export const getCampusById = async (id) => {
  if (!id) return null;
  
  // Ensure we have campus data
  const locations = await fetchCampusLocations();
  
  // Find and return the full location object
  return locations.find(
    loc => loc.id.toString() === id.toString()
  ) || null;
};

export default {
  fetchCampusLocations,
  getCampusNameById,
  getCampusById
};