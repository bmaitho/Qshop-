import React from 'react';
import { ArrowRight } from 'lucide-react';
import Navbar from './Navbar';

const SubscriptionPage = () => {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[url('/image/img4.jpg')] bg-cover bg-center relative">
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[rgba(15,19,14,0.85)] z-0"></div>
        
        {/* Content */}
        <div className="relative z-10 pt-16 pb-12 px-4">
          {/* Header Section */}
          <div className="container mx-auto text-center text-white mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-[#E7C65F]">UniHive</h1>
            <h2 className="text-xl md:text-2xl font-semibold text-white">Subscription Plans and Featured Listings</h2>
          </div>
          
          {/* Product Section */}
          <div className="max-w-6xl mx-auto border border-[#E7C65F] rounded-lg p-6 md:p-8 bg-[rgba(255,255,255,0.1)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <SubscriptionCard 
                title="Weekly Featured Listing"
                price="400"
                features={[
                  "Feature 1",
                  "Feature 2",
                  "Feature 3"
                ]}
              />
              
              {/* Card 2 */}
              <SubscriptionCard 
                title="Bi-Weekly Featured Listing"
                price="700"
                features={[
                  "Feature A",
                  "Feature B",
                  "Feature C"
                ]}
              />
              
              {/* Card 3 */}
              <SubscriptionCard 
                title="Monthly Premium Plan"
                price="2,500"
                features={[
                  "Feature X",
                  "Feature Y",
                  "Feature Z"
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const SubscriptionCard = ({ title, price, features }) => {
  return (
    <div className="group border border-[#2c382b] rounded-lg p-6 text-center transition-all duration-300 hover:translate-y-[-10px] hover:shadow-lg hover:bg-[#141a13] min-h-[300px] flex flex-col justify-between relative">
      <div>
        <h3 className="text-2xl font-serif font-bold mb-4 text-[#E7C65F]">{title}</h3>
        <div className="text-3xl font-semibold mb-6 text-white">Kshs. {price}</div>
        <ul className="list-disc pl-5 text-left text-white mb-6">
          {features.map((feature, index) => (
            <li key={index} className="mb-2">{feature}</li>
          ))}
        </ul>
      </div>
      <button className="bg-[#E7C65F] text-black px-4 py-2 rounded-md mx-auto inline-flex items-center max-w-[130px] transition-all duration-300 hover:bg-white hover:scale-105">
        Subscribe <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1"><ArrowRight size={16} /></span>
      </button>
    </div>
  );
};

export default SubscriptionPage;