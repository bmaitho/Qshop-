import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { fetchProductById } from '../services/productService';
import { Heart, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Navbar from './Navbar';

const ProductDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const data = await fetchProductById(id);
        setProduct(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load product details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, toast]);

  const handleAddToCart = () => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          </div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <p className="text-center text-gray-600">Product not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative">
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full rounded-lg object-cover"
            />
            <button 
              onClick={() => setIsWishlisted(!isWishlisted)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white"
            >
              <Heart 
                className={`h-6 w-6 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
              />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-baseline space-x-4">
                <span className="text-2xl font-bold text-orange-600">
                  KES {product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-500 line-through">
                    KES {product.originalPrice}
                  </span>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Product Details</h3>
                  <p className="text-gray-600">Condition: {product.condition}</p>
                  <p className="text-gray-600">Location: {product.location}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Seller Information</h3>
                  <p className="text-gray-600">Seller: {product.seller}</p>
                  <p className="text-gray-600">Contact: {product.contact}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button
                onClick={handleAddToCart}
                className="flex-1"
              >
                Add to Cart
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.share({
                    title: product.name,
                    text: `Check out this ${product.name} on Qshop!`,
                    url: window.location.href,
                  });
                }}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;