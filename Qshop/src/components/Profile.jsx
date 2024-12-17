import React from 'react';
import { User, MapPin, Package, Heart } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProductCard from './ProductCard';

const Profile = () => {
  const [activeTab, setActiveTab] = React.useState('listings');
  
  const profileData = {
    name: "John Doe",
    location: "Nairobi, Kenya",
    joinedDate: "January 2024",
    listings: 12,
    following: 45,
    followers: 89
  };

  const userListings = [
    {
      id: 1,
      name: "iPhone 13 Pro",
      price: 85000,
      condition: "Used - Like New",
      location: "Nairobi",
      rating: 4.5,
      reviews: 12,
      image: "/api/placeholder/400/300"
    },
    // Add more listings as needed
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{profileData.name}</h1>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin className="w-4 h-4" />
                <span>{profileData.location}</span>
              </div>
              <div className="flex gap-6 mb-4">
                <div>
                  <div className="font-bold">{profileData.listings}</div>
                  <div className="text-sm text-gray-600">Listings</div>
                </div>
                <div>
                  <div className="font-bold">{profileData.following}</div>
                  <div className="text-sm text-gray-600">Following</div>
                </div>
                <div>
                  <div className="font-bold">{profileData.followers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Member since {profileData.joinedDate}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === 'listings' ? 'default' : 'outline'}
          onClick={() => setActiveTab('listings')}
        >
          <Package className="w-4 h-4 mr-2" />
          Listings
        </Button>
        <Button
          variant={activeTab === 'wishlist' ? 'default' : 'outline'}
          onClick={() => setActiveTab('wishlist')}
        >
          <Heart className="w-4 h-4 mr-2" />
          Wishlist
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userListings.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default Profile;