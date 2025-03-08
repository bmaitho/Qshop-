import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Slideshow from "./Slideshow";
import SignUp from "./auth/SignUp";

const LandingPage = () => {
  const [screenSize, setScreenSize] = useState({
    isMobile: window.innerWidth < 768,
    isLaptop: window.innerWidth < 1280
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        isMobile: window.innerWidth < 768,
        isLaptop: window.innerWidth < 1280
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { isMobile, isLaptop } = screenSize;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-primary to-primary/90 overflow-hidden">
      {/* Left Section - Website Info & Brand */}
      <div className={`flex flex-col justify-center items-center text-center 
        ${isMobile ? 'p-4 pt-8' : isLaptop ? 'w-5/12 p-6' : 'w-1/2 p-12'}`}>
        
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-2 md:mb-4 font-serif leading-tight">
            Welcome to UniHive
          </h1>
          <p className="text-sm md:text-base text-gray-200 leading-relaxed mb-6">
            Your one-stop marketplace for students! <br className={isMobile ? "hidden" : "block"} />
            Buy, sell, and save within your campus.
          </p>
          
          {/* Slideshow */}
          <div className={`relative mx-auto rounded-lg overflow-hidden shadow-xl mt-2 
            ${isMobile ? 'max-w-xs' : isLaptop ? 'max-w-sm' : 'max-w-md'}`}>
            <Slideshow />
          </div>
        </div>
      </div>

      {/* Right Section - Signup Component */}
      <div className={`flex flex-col items-center justify-center 
        ${isMobile ? 'p-4 mt-4 pb-8' : isLaptop ? 'w-7/12 p-6' : 'w-1/2 p-8'}
        bg-white/95 dark:bg-gray-900 backdrop-blur-sm 
        rounded-t-3xl md:rounded-none md:rounded-l-3xl shadow-2xl`}>
        
        <div className={`w-full ${isMobile ? 'max-w-xs' : isLaptop ? 'max-w-md' : 'max-w-lg'} py-2`}>
          <SignUp compact={isLaptop} />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;