// src/components/auth/AuthLayout.jsx
import React, { useState, useEffect, memo } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import Login from './Login';
import SignUp from './SignUp';

// Import images from your assets folder
import Image1 from '../../assets/image1.png';
import Image2 from '../../assets/image2.jpg';
import Image3 from '../../assets/image3.jpg';

// Memoized slideshow component to prevent unnecessary re-renders
const Slideshow = memo(({ slides, interval = 10000 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-scrolling effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [slides.length, interval]);

  return (
    <div className="relative h-full w-full bg-[#0e1a19] overflow-hidden">
      {slides.map((slide, index) => (
        <div 
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            currentSlide === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img 
              src={slide.image} 
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-contain"
              style={{ 
                minWidth: '100%', 
                minHeight: '100%' 
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(14,26,25,0.7)]"></div>
        </div>
      ))}
      
      {/* Slide indicators */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              currentSlide === index ? 'bg-[#e7c65f] w-4' : 'bg-white/40'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
});

const AuthLayout = ({ setToken }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      navigate('/home');
    }
  }, [navigate]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Slide content (defined once, doesn't change)
  const slides = [
    { image: Image1 },
    { image: Image2 },
    { image: Image3 }
  ];

  // Desktop Layout
  if (!isMobile) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        {/* Left side - Authentication */}
        <div className="w-1/2 p-6 flex flex-col justify-center bg-[#0e1a19] text-white">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-[#e7c65f]">UniHive</h1>
              <p className="text-gray-400 mt-2">Student Marketplace</p>
            </div>
            
            {/* Routes for Login and SignUp components */}
            <Routes>
              <Route path="signup" element={<SignUp />} />
              <Route path="*" element={<Login setToken={setToken} />} />
            </Routes>
          </div>
        </div>
        
        {/* Right side - Image slider (memoized) */}
        <div className="w-1/2">
          <Slideshow slides={slides} />
        </div>
      </div>
    );
  }
  
  // Mobile Layout
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* Top Image Slider Section */}
      <div className="w-full h-2/5">
        <Slideshow slides={slides} />
      </div>

      {/* Bottom Authentication Section */}
      <div className="w-full h-3/5 p-4 flex flex-col overflow-y-auto bg-[#0e1a19] text-white">
        <div className="max-w-md mx-auto w-full">
          
          
          {/* Routes for Login and SignUp components */}
          <Routes>
            <Route path="signup" element={<SignUp />} />
            <Route path="*" element={<Login setToken={setToken} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;