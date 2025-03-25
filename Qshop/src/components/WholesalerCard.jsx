import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const WholesalerCard = ({ shop }) => {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg bg-black text-white">
      {/* Video Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/40 via-transparent to-black/70 z-10"></div>
      <video className="absolute top-0 left-0 w-full h-full object-cover z-0" autoPlay loop muted playsInline>
        <source src={shop.video_url || "https://cdn.videvo.net/videvo_files/video/premium/video0042/small_watermarked/900-2_900-6019-PD2_preview.mp4"} type="video/mp4" />
      </video>

      <div className="absolute inset-0 flex flex-col justify-between p-6 z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center overflow-hidden">
              <img 
                src={shop.logo_url || "/api/placeholder/48/48"} 
                alt={`${shop.name} logo`} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/api/placeholder/48/48";
                }}
              />
            </div>
            <h3 className="text-xl font-serif font-bold">{shop.name}</h3>
          </div>
          <Link to={`/seller/${shop.id}`}>
            <Button variant="secondary" size="sm" className="bg-white text-black hover:bg-gray-200">
              View Shop
            </Button>
          </Link>
        </div>
        
        <div className="text-center font-bold text-2xl mb-24 md:mb-32">{shop.tagline || shop.description}</div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 w-full scrollbar-hide">
          {shop.products && shop.products.map((product, index) => (
            <div key={index} className="flex-none w-32 md:w-40 bg-black/60 backdrop-blur-sm p-2 rounded text-center">
              <img 
                src={product.image_url || "/api/placeholder/120/120"} 
                alt={product.name} 
                className="w-full h-24 md:h-32 object-cover rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/api/placeholder/120/120";
                }}
              />
              <div className="mt-1 text-sm truncate">{product.name}</div>
              <div className="font-bold">KES {typeof product.price === 'number' ? product.price.toLocaleString() : product.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WholesalerCard;