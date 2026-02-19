// src/components/DeliveryOptionsSelector.jsx
// ✅ UPDATED VERSION WITH PICKUP MTAANI INTEGRATION

import React, { useState, useEffect } from 'react';
import { Package, Store, Truck, MapPin, Loader2, Search } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from './SupabaseClient';
import { toast } from 'react-toastify';

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
    const isSingleSeller = sellerIds.length === 1;

    // OPTION 1: Campus Pickup (Free - Always Available)
    options.push({
      id: 'campus_pickup',
      type: 'campus_pickup',
      name: 'Campus Pickup (Free)',
      description: 'Collect your order from your campus pickup point',
      icon: Package,
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
      icon: Truck,
      fee: 0, // Will be calculated based on location
      requiresPickupPointSelection: true,
      badge: 'Nationwide'
    });

    return options;
  };

  const handleSelectOption = async (option) => {
    setSelectedOption(option);
    setSelectedPickupPoint(null);
    setDeliveryFee(0);

    // If PickUp Mtaani selected, load pickup points
    if (option.type === 'pickup_mtaani') {
      await loadPickupPoints();
    } else {
      // For campus pickup, notify parent immediately
      onDeliverySelected({
        delivery_method: option.type,
        delivery_fee: 0,
        requires_pickup_point_selection: false,
        pickup_mtaani_destination_id: null
      });
    }
  };

  const loadPickupPoints = async (town = '') => {
    try {
      setLoadingPickupPoints(true);
      
      // First, ensure pickup points are synced
      const syncResponse = await fetch(`${backendUrl}/pickup-mtaani/sync-points`);
      if (!syncResponse.ok) {
        console.warn('Could not sync pickup points, using cached data');
      }

      // Fetch pickup points
      const url = town 
        ? `${backendUrl}/pickup-mtaani/points/near/${encodeURIComponent(town)}?limit=20`
        : `${backendUrl}/pickup-mtaani/points?limit=50`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setPickupPoints(data.points || []);
        
        if (data.points.length === 0) {
          toast.info('No pickup points found in this area. Try a different town.');
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

      // Get seller's town from first order item
      const firstItem = orderItems[0];
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('town')
        .eq('id', firstItem.seller_id)
        .single();

      const originTown = sellerProfile?.town || 'Nairobi'; // Default to Nairobi

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

    // Calculate delivery fee
    const fee = await calculateDeliveryFee(point.town);
    setDeliveryFee(fee);

    // Notify parent component
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
          <Truck className="h-5 w-5 mr-2" />
          Choose Delivery Method
        </h2>

        {/* Delivery Options */}
        <div className="space-y-3">
          {availableOptions.map(option => {
            const Icon = option.icon;
            const isSelected = selectedOption?.id === option.id;

            return (
              <div key={option.id} className="space-y-3">
                {/* Option Card */}
                <div
                  onClick={() => handleSelectOption(option)}
                  className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 bg-white dark:bg-gray-700/50'}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Icon className={`h-5 w-5 mt-1 ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{option.name}</h3>
                          {option.badge && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {option.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {option.type === 'pickup_mtaani' && deliveryFee > 0 ? (
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          KES {deliveryFee}
                        </p>
                      ) : (
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {option.fee === 0 ? 'Free' : `KES ${option.fee}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* PickUp Mtaani Pickup Point Selection */}
                {isSelected && option.type === 'pickup_mtaani' && (
                  <div className="ml-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-sm mb-3 text-gray-900 dark:text-gray-100">
                      Select Your Pickup Point
                    </h4>

                    {/* Search Bar */}
                    <form onSubmit={handleSearchTown} className="mb-4">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Search by town (e.g., Nairobi, Mombasa)"
                          value={searchTown}
                          onChange={(e) => setSearchTown(e.target.value)}
                          className="flex-1"
                        />
                        <button
                          type="submit"
                          disabled={loadingPickupPoints}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {loadingPickupPoints ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          Search
                        </button>
                      </div>
                    </form>

                    {/* Loading State */}
                    {loadingPickupPoints && (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading pickup points...</p>
                      </div>
                    )}

                    {/* Pickup Points List */}
                    {!loadingPickupPoints && pickupPoints.length > 0 && (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {pickupPoints.map(point => (
                          <div
                            key={point.id}
                            onClick={() => handleSelectPickupPoint(point)}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedPickupPoint?.id === point.id
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-2 flex-1">
                                <MapPin className="h-4 w-4 mt-1 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {point.shop_name}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {point.street_address}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {point.town} • {point.phone_number}
                                  </p>
                                </div>
                              </div>
                              
                              {selectedPickupPoint?.id === point.id && calculatingFee && (
                                <Loader2 className="h-4 w-4 animate-spin text-green-600 ml-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No Results */}
                    {!loadingPickupPoints && pickupPoints.length === 0 && (
                      <div className="text-center py-6">
                        <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No pickup points found. Try searching for your town.
                        </p>
                      </div>
                    )}

                    {/* Selected Point Summary */}
                    {selectedPickupPoint && deliveryFee > 0 && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                              Selected: {selectedPickupPoint.shop_name}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              {selectedPickupPoint.town}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                              KES {deliveryFee}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">
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

        {/* Minimum Order Notice for PickUp Mtaani */}
        {selectedOption?.type === 'pickup_mtaani' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ℹ️ <strong>Minimum order value:</strong> KES 200 for PickUp Mtaani delivery
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryOptionsSelector;