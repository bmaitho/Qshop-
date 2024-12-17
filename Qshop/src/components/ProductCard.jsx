import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
Tooltip,
TooltipContent,
TooltipProvider,
TooltipTrigger,
} from "@/components/ui/tooltip";

const ProductCard = ({ product }) => {
const [isWishlisted, setIsWishlisted] = React.useState(false);

const handleWishlist = (e) => {
  e.preventDefault();
  setIsWishlisted(!isWishlisted);
};

return (
  <Link to={`/product/${product.id}`}>
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="relative p-0">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <button 
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white"
        >
          <Heart 
            className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </button>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
        <div className="flex items-baseline mb-2">
          <span className="text-xl font-bold text-orange-600">KES {product.price}</span>
          {product.originalPrice && (
            <span className="ml-2 text-sm text-gray-500 line-through">
              KES {product.originalPrice}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-600 mb-2">
          <p>Condition: {product.condition}</p>
          <p>Location: {product.location}</p>
        </div>
        <div className="flex items-center mb-3">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`text-${i < Math.floor(product.rating) ? 'yellow' : 'gray'}-400`}
            >
              ★
            </span>
          ))}
          <span className="ml-2 text-sm text-gray-600">({product.reviews})</span>
        </div>
      </CardContent>
      <CardFooter>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                Add to Cart
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add {product.name} to your cart</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  </Link>
);
};

export default ProductCard;