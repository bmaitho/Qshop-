
import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Store, Zap, Package } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '../components/SupabaseClient';

const DeliveryOptionsSelector = ({ orderItems, onDeliverySelected }) => {
  const [availableOptions, setAvailableOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [shopLocations, setShopLocations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeDeliveryOptions();
  }, [orderItems]);

  const analyzeDeliveryOptions = async () => {
    try {
      setLoading(true);
      
      // Get unique seller IDs
      const sellerIds = [...new Set(orderItems.map(item => item.seller_id))];
      
      // Fetch shop locations for all sellers
      const { data: locations, error } = await supabase
        .from('seller_shop_locations')
        .select('*')
        .in('seller_id', sellerIds);

      if (error) throw error;

      // Group locations by seller
      const locationsBySeller = {};
      locations?.forEach(loc => {
        if (!locationsBySeller[loc.seller_id]) {
          locationsBySeller[loc.seller_id] = [];
        }
        locationsBySeller[loc.seller_id].push(loc);
      });

      setShopLocations(locationsBySeller);

      // Determine available delivery options
      const options = determineAvailableOptions(sellerIds, locationsBySeller);
      setAvailableOptions(options);

      // Auto-select default option
      if (options.length > 0) {
        const defaultOption = options.find(opt => opt.recommended) || options[0];
        handleSelectOption(defaultOption);
      }

    } catch (error) {
      console.error('Error analyzing delivery options:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineAvailableOptions = (sellerIds, locationsBySeller) => {
    const options = [];
    const isSingleSeller = sellerIds.length === 1;
    const allSellersHaveShops = sellerIds.every(id => locationsBySeller[id]?.length > 0);
    const someSellersHaveShops = sellerIds.some(id => locationsBySeller[id]?.length > 0);

    // OPTION 1: Pickup from Mtaani (always available)
    options.push({
      id: 'pickup_mtaani',
      type: 'pickup_mtaani',
      name: 'Pickup from Mtaani',
      description: 'Collect your order from the campus pickup point',
      icon: Package,
      fee: 0,
      recommended: true,
      badge: 'Most Popular'
    });

    // Single seller with shop locations
    if (isSingleSeller && locationsBySeller[sellerIds[0]]?.length > 0) {
      const sellerLocations = locationsBySeller[sellerIds[0]];

      // OPTION 2: Pickup from Shop
      options.push({
        id: 'pickup_from_shop',
        type: 'pickup_from_shop',
        name: 'Pickup from Shop',
        description: 'Collect directly from the seller\'s shop',
        icon: Store,
        fee: 0,
        shopLocations: sellerLocations,
        requiresShopSelection: true
      });

      // OPTION 3: Delivery from Mtaani
      options.push({
        id: 'delivery_from_mtaani',
        type: 'delivery_from_mtaani',
        name: 'Delivery from Mtaani',
        description: 'We\'ll deliver from the pickup point to your location',
        icon: Truck,
        fee: 0, // Will be calculated
        badge: 'Fastest'
      });

      // OPTION 4: Direct Delivery
      options.push({
        id: 'direct_delivery',
        type: 'direct_delivery',
        name: 'Direct Delivery',
        description: 'Delivered straight from the shop to you',
        icon: Zap,
        fee: 0, // Will be calculated later
        shopLocations: sellerLocations,
        requiresShopSelection: true
      });
    }

    // Multiple sellers - only show options that work for all
    if (!isSingleSeller) {
      // Only add shop-based options if ALL sellers have shops
      if (allSellersHaveShops) {
        options.push({
          id: 'delivery_from_mtaani',
          type: 'delivery_from_mtaani',
          name: 'Delivery from Mtaani',
          description: 'We\'ll deliver from the pickup point to your location',
          icon: Truck,
          fee: 0
        });
      }
    }

    return options;
  };

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    onDeliverySelected({
      delivery_method: option.type,
      delivery_fee: option.fee,
      selected_shop_location_id: null, // Will be set if shop selection required
      requires_shop_selection: option.requiresShopSelection || false,
      shop_locations: option.shopLocations || []
    });
  };

  const handleShopSelection = (shopLocationId) => {
    onDeliverySelected({
      delivery_method: selectedOption.type,
      delivery_fee: selectedOption.fee,
      selected_shop_location_id: shopLocationId,
      requires_shop_selection: false,
      shop_locations: selectedOption.shopLocations
    });
  };

  if (loading) {
    return <div className="p-4">Loading delivery options...</div>;
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Truck className="h-5 w-5 mr-2" />
          Choose Delivery Method
        </h2>

        <div className="space-y-3">
          {availableOptions.map(option => {
            const Icon = option.icon;
            const isSelected = selectedOption?.id === option.id;

            return (
              <div
                key={option.id}
                onClick={() => handleSelectOption(option)}
                className={`
                  p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon className={`h-5 w-5 mt-1 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{option.name}</h3>
                        {option.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {option.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </p>

                      {/* Shop location selection */}
                      {isSelected && option.requiresShopSelection && option.shopLocations && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="text-sm font-medium mb-2">Select shop location:</p>
                          <div className="space-y-2">
                            {option.shopLocations.map(shop => (
                              <div
                                key={shop.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShopSelection(shop.id);
                                }}
                                className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                              >
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 mr-2 mt-1 text-gray-400" />
                                  <div>
                                    <p className="text-sm font-medium">{shop.shop_name}</p>
                                    <p className="text-xs text-gray-500">{shop.physical_address}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {option.fee === 0 ? 'Free' : `KES ${option.fee}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {availableOptions.length === 1 && (
          <p className="text-sm text-gray-500 mt-3">
            ℹ️ Only pickup from mtaani is available for multi-seller orders
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryOptionsSelector;

