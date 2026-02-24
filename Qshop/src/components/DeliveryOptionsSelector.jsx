// src/components/DeliveryOptionsSelector.jsx
// ✅ UPDATED VERSION WITH PICKUP MTAANI BRANDED THEMING
// Features: Yellow brand colors, motorbike icon, map pin, branded buttons

import React, { useState, useEffect } from 'react';
import { Package, Loader2, Search, MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from './SupabaseClient';
import { toast } from 'react-toastify';

// ── PickUp Mtaani Branded SVG Icons ──────────────────────────────────

const PickupMtaaniLogo = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shield/Pin shape inspired by PickUp Mtaani's logo */}
    <path d="M20 2C12.268 2 6 8.268 6 16c0 10 14 22 14 22s14-12 14-22c0-7.732-6.268-14-14-14z" fill="#F5A623" stroke="#E8971E" strokeWidth="1.5"/>
    <circle cx="20" cy="16" r="6" fill="white"/>
    <circle cx="20" cy="16" r="3" fill="#F5A623"/>
  </svg>
);

const MotorbikeIcon = ({ className = "h-8 w-8" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Delivery motorbike inspired by PickUp Mtaani's branding */}
    {/* Back wheel */}
    <circle cx="12" cy="34" r="6" stroke="#F5A623" strokeWidth="2.5" fill="none"/>
    <circle cx="12" cy="34" r="2" fill="#F5A623"/>
    {/* Front wheel */}
    <circle cx="38" cy="34" r="5" stroke="#F5A623" strokeWidth="2.5" fill="none"/>
    <circle cx="38" cy="34" r="1.5" fill="#F5A623"/>
    {/* Body frame */}
    <path d="M12 34L18 22H28L33 28L38 34" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Seat */}
    <path d="M18 22L22 18H28L30 22" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#F5A623"/>
    {/* Handlebars */}
    <path d="M33 28L36 24L40 22" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Package/Box on back */}
    <rect x="6" y="18" width="10" height="8" rx="1.5" fill="#F5A623" stroke="#E8971E" strokeWidth="1.5"/>
    <line x1="8" y1="22" x2="14" y2="22" stroke="#E8971E" strokeWidth="1"/>
    {/* Exhaust */}
    <path d="M15 30L12 34" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const TrackingIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#F5A623"/>
    <circle cx="12" cy="9" r="3" fill="white"/>
  </svg>
);

// ── Pickup Point Pin Icon (green for selected, gray for unselected) ──

const PointPinIcon = ({ active = false, className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
      fill={active ? "#22C55E" : "#9CA3AF"}
    />
    <circle cx="12" cy="9" r="2.5" fill="white"/>
  </svg>
);


const DeliveryOptionsSelector = ({ orderItems, onDeliverySelected }) => {
  const [availableOptions, setAvailableOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // PickUp Mtaani specific states
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loadingPickupPoints, setLoadingPickupPoints] = useState(false);
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(null);
  const [searchTown, setSearchTown] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [calculatingFee, setCalculatingFee] = useState(false);

  const backendUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchDeliveryOptions();
  }, [orderItems]);

  const fetchDeliveryOptions = async () => {
    try {
      setLoading(true);
      
      const sellerIds = [...new Set(orderItems.map(item => item.seller_id))];
      
      // Fetch seller shop locations
      const locationsBySeller = {};
      for (const sellerId of sellerIds) {
        const { data, error } = await supabase
          .from('seller_shop_locations')
          .select('*')
          .eq('seller_id', sellerId);
        
        if (!error && data) {
          locationsBySeller[sellerId] = data;
        }
      }

      const options = determineAvailableOptions(sellerIds, locationsBySeller);
      setAvailableOptions(options);
      
      // Auto-select first option (campus pickup - free)
      if (options.length > 0) {
        handleSelectOption(options[0]);
      }
    } catch (error) {
      console.error('Error fetching delivery options:', error);
      toast.error('Failed to load delivery options');
    } finally {
      setLoading(false);
    }
  };

  const determineAvailableOptions = (sellerIds, locationsBySeller) => {
    const options = [];

    // OPTION 1: Campus Pickup (Free - Always Available)
    options.push({
      id: 'campus_pickup',
      type: 'campus_pickup',
      name: 'Campus Pickup',
      description: 'Collect your order from your campus pickup point',
      fee: 0,
      recommended: true,
      badge: 'Free'
    });

    // OPTION 2: PickUp Mtaani Delivery (Paid - Always Available)
    options.push({
      id: 'pickup_mtaani',
      type: 'pickup_mtaani',
      name: 'PickUp Mtaani Delivery',
      description: 'Delivered to a PickUp Mtaani agent near you (150-350 KES)',
      fee: 0, // Will be calculated based on location
      requiresPickupPointSelection: true,
      badge: 'Nationwide'
    });

    return options;
  };

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    
    if (option.type === 'pickup_mtaani') {
      // Load initial pickup points
      if (pickupPoints.length === 0) {
        loadPickupPoints();
      }
      
      if (!selectedPickupPoint) {
        onDeliverySelected({
          delivery_method: 'pickup_mtaani',
          delivery_fee: 0,
          requires_pickup_point_selection: true
        });
      }
    } else if (option.type === 'campus_pickup') {
      setSelectedPickupPoint(null);
      setDeliveryFee(0);
      onDeliverySelected({
        delivery_method: 'campus_pickup',
        delivery_fee: 0,
        requires_pickup_point_selection: false
      });
    }
  };

  const loadPickupPoints = async (town = null, useGeolocation = false) => {
    try {
      setLoadingPickupPoints(true);
      let url;

      if (useGeolocation && navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000
            });
          });

          const { latitude, longitude } = position.coords;
          toast.info('📍 Searching nearby...', { autoClose: 1000 });
          url = `${backendUrl}/pickup-mtaani/points-nearby?lat=${latitude}&lng=${longitude}&radius=10&limit=20`;
        } catch (geoError) {
          console.error('Geolocation error:', geoError);
          
          if (geoError.code === 1) {
            toast.error('Location permission denied. Click the 🔒 icon in your address bar to allow location access.', { autoClose: 8000 });
          } else if (geoError.code === 2) {
            toast.error('Location unavailable. Please check your device settings.', { autoClose: 5000 });
          } else if (geoError.code === 3) {
            toast.error('Location request timeout. Please try again.', { autoClose: 5000 });
          } else {
            toast.error('Could not get your location. Showing all points.', { autoClose: 5000 });
          }
          
          url = `${backendUrl}/pickup-mtaani/points?limit=50`;
        }
      } else if (useGeolocation && !navigator.geolocation) {
        toast.error('Geolocation not supported by your browser.', { autoClose: 5000 });
        url = `${backendUrl}/pickup-mtaani/points?limit=50`;
      } else {
        url = town 
          ? `${backendUrl}/pickup-mtaani/points/near/${encodeURIComponent(town)}?limit=20`
          : `${backendUrl}/pickup-mtaani/points?limit=50`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setPickupPoints(data.points || []);
        
        if (data.points.length === 0) {
          toast.info('No pickup points found. Try searching by town name.');
        } else if (data.points[0]?.distance !== undefined) {
          toast.success(`Found ${data.points.length} pickup points near you!`);
        }
      } else {
        throw new Error(data.error || 'Failed to load pickup points');
      }
    } catch (error) {
      console.error('Error loading pickup points:', error);
      toast.error('Failed to load pickup points. Please try again.');
    } finally {
      setLoadingPickupPoints(false);
    }
  };

  const handleSearchTown = (e) => {
    e.preventDefault();
    if (searchTown.trim()) {
      loadPickupPoints(searchTown.trim());
    } else {
      loadPickupPoints();
    }
  };

  const calculateDeliveryFee = async (destinationTown) => {
    try {
      setCalculatingFee(true);

      const firstItem = orderItems[0];
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('campus_location')
        .eq('id', firstItem.seller_id)
        .single();

      const originTown = sellerProfile?.campus_location || 'Nairobi';

      const response = await fetch(`${backendUrl}/pickup-mtaani/calculate-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originTown,
          destinationTown
        })
      });

      const data = await response.json();

      if (data.success) {
        return data.deliveryFee;
      } else {
        throw new Error('Failed to calculate fee');
      }
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      return 200; // Default fallback fee
    } finally {
      setCalculatingFee(false);
    }
  };

  const handleSelectPickupPoint = async (point) => {
    setSelectedPickupPoint(point);

    const fee = await calculateDeliveryFee(point.town);
    setDeliveryFee(fee);

    onDeliverySelected({
      delivery_method: 'pickup_mtaani',
      delivery_fee: fee,
      requires_pickup_point_selection: false,
      pickup_mtaani_destination_id: point.shop_id,
      pickup_mtaani_destination_name: point.shop_name,
      pickup_mtaani_destination_address: point.street_address,
      pickup_mtaani_destination_town: point.town
    });
  };

  if (loading) {
    return (
      <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading delivery options...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
          <MotorbikeIcon className="h-7 w-7 mr-2" />
          Choose Delivery Method
        </h2>

        {/* ── Delivery Options ── */}
        <div className="space-y-3">
          {availableOptions.map(option => {
            const isSelected = selectedOption?.id === option.id;
            const isMtaani = option.type === 'pickup_mtaani';

            return (
              <div key={option.id} className="space-y-3">
                {/* Option Card */}
                <div
                  onClick={() => handleSelectOption(option)}
                  className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${isSelected && isMtaani
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-500 shadow-sm shadow-yellow-100 dark:shadow-none'
                      : isSelected
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700/50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Icon: PickUp Mtaani branded pin OR campus package */}
                      {isMtaani ? (
                        <PickupMtaaniLogo className={`h-6 w-6 mt-0.5 flex-shrink-0 ${isSelected ? 'opacity-100' : 'opacity-60'}`} />
                      ) : (
                        <Package className={`h-5 w-5 mt-1 flex-shrink-0 ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-medium ${isSelected && isMtaani ? 'text-yellow-900 dark:text-yellow-100' : 'text-gray-900 dark:text-gray-100'}`}>
                            {option.name}
                          </h3>
                          {option.badge && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                isMtaani 
                                  ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-700' 
                                  : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              }`}
                            >
                              {option.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right ml-3 flex-shrink-0">
                      {isMtaani && deliveryFee > 0 ? (
                        <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                          KES {deliveryFee}
                        </p>
                      ) : (
                        <p className={`font-semibold ${isMtaani ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-600 dark:text-green-400'}`}>
                          {option.fee === 0 ? 'Free' : `KES ${option.fee}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── PickUp Mtaani Pickup Point Selection Panel ── */}
                {isSelected && isMtaani && (
                  <div className="ml-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-800/50">
                    
                    <h4 className="font-medium text-sm mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <TrackingIcon className="h-4 w-4" />
                      Select Your Pickup Point
                    </h4>

                    {/* ── Search Bar (PickUp Mtaani branded) ── */}
                    <form onSubmit={handleSearchTown} className="mb-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="Search by town (e.g., Nairobi, Mombasa)"
                            value={searchTown}
                            onChange={(e) => setSearchTown(e.target.value)}
                            className="pl-9 border-gray-300 dark:border-gray-600 focus:border-yellow-400 focus:ring-yellow-400 dark:focus:border-yellow-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loadingPickupPoints}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium rounded-md disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
                        >
                          {loadingPickupPoints ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Search</span>
                        </button>
                      </div>
                    </form>

                    {/* ── Find Nearest to Me Button (PickUp Mtaani styled) ── */}
                    <button
                      onClick={() => loadPickupPoints(null, true)}
                      disabled={loadingPickupPoints}
                      className="w-full mb-4 py-2.5 px-4 bg-gray-900 dark:bg-yellow-600 hover:bg-gray-800 dark:hover:bg-yellow-700 text-white dark:text-gray-900 font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Navigation className="h-4 w-4" />
                      Find Nearest to Me
                    </button>

                    {/* ── Pickup Points List ── */}
                    {loadingPickupPoints ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading pickup points...</span>
                      </div>
                    ) : pickupPoints.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {pickupPoints.map((point, index) => {
                          const isPointSelected = selectedPickupPoint?.shop_id === point.shop_id;
                          return (
                            <div
                              key={point.shop_id || index}
                              onClick={() => handleSelectPickupPoint(point)}
                              className={`
                                p-3 rounded-lg cursor-pointer transition-all border
                                ${isPointSelected
                                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-600 shadow-sm'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-yellow-300 dark:hover:border-yellow-700 bg-white dark:bg-gray-700/50 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/10'
                                }
                              `}
                            >
                              <div className="flex items-start gap-2.5">
                                <PointPinIcon 
                                  active={isPointSelected} 
                                  className="h-5 w-5 mt-0.5 flex-shrink-0" 
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-medium text-sm truncate ${isPointSelected ? 'text-yellow-900 dark:text-yellow-100' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {point.shop_name}
                                    </p>
                                    {isPointSelected && (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    )}
                                  </div>
                                  {point.street_address && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                      {point.street_address}
                                    </p>
                                  )}
                                  {point.town && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                      {point.town}
                                    </p>
                                  )}
                                  {point.distance !== undefined && (
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 font-medium">
                                      📍 {point.distance < 1 ? `${(point.distance * 1000).toFixed(0)}m away` : `${point.distance.toFixed(1)}km away`}
                                    </p>
                                  )}
                                </div>
                                {calculatingFee && isPointSelected && (
                                  <Loader2 className="h-4 w-4 animate-spin text-yellow-500 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <PickupMtaaniLogo className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No pickup points loaded yet. Try searching for your town.
                        </p>
                      </div>
                    )}

                    {/* ── Selected Point Summary ── */}
                    {selectedPickupPoint && deliveryFee > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <PointPinIcon active className="h-5 w-5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 truncate">
                                {selectedPickupPoint.shop_name}
                              </p>
                              <p className="text-xs text-yellow-700 dark:text-yellow-300 truncate">
                                {selectedPickupPoint.town}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                              KES {deliveryFee}
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">
                              Delivery Fee
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Minimum Order Notice for PickUp Mtaani ── */}
        {selectedOption?.type === 'pickup_mtaani' && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
            <MotorbikeIcon className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Minimum order value:</strong> KES 200 for PickUp Mtaani delivery. Your parcel will be delivered to the selected agent for collection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryOptionsSelector;