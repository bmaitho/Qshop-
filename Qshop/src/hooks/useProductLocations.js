// src/hooks/useProductLocations.js
import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '../components/SupabaseClient';

/**
 * Custom hook to fetch shop locations for a product
 * @param {string} productId - The product ID
 * @returns {object} - { locations: array, loading: boolean, error: string }
 */
export const useProductLocations = (productId) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchLocations = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('product_shop_locations')
          .select(`
            *,
            seller_shop_locations!inner(
              id,
              shop_name,
              physical_address,
              is_primary,
              campus_locations:campus_id(name)
            )
          `)
          .eq('product_id', productId);

        if (error) throw error;

        // Extract the location details
        const locationDetails = data?.map(item => item.seller_shop_locations) || [];
        
        // Sort by primary first
        locationDetails.sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return 0;
        });

        setLocations(locationDetails);
      } catch (err) {
        console.error('Error fetching product locations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [productId]);

  return { locations, loading, error };
};

/**
 * Component to display product locations
 */
export const ProductLocationsDisplay = ({ productId, compact = false, className = '' }) => {
  const { locations, loading } = useProductLocations(productId);

  if (loading) return null;
  
  if (!locations || locations.length === 0) return null;

  if (compact) {
    // Compact view for product cards
    return (
      <div className={`text-xs text-gray-600 dark:text-gray-400 ${className}`}>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {locations.length === 1 
              ? locations[0].shop_name
              : `Available at ${locations.length} locations`
            }
          </span>
        </div>
      </div>
    );
  }

  // Full view for product detail pages
  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Pickup Locations
      </h4>
      <div className="space-y-2">
        {locations.map((location, index) => (
          <div 
            key={location.id || index}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{location.shop_name}</span>
                  {location.is_primary && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.physical_address}
                </p>
                {location.campus_locations?.name && (
                  <p className="text-xs text-gray-500 mt-1">
                    {location.campus_locations.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default useProductLocations;