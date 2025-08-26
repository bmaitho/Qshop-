import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './auth/Login';
import SignUp from './auth/SignUp';
import './LandingPage.css';

// Import images from your assets folder
import Image1 from '../assets/image1.png';
import Image2 from '../assets/image2.jpg';
import Image3 from '../assets/image3.jpg';

// Memoized slideshow component to prevent unnecessary re-renders
const Slideshow = memo(({ slides, interval = 5000 }) => {
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

// Memoized auth components to prevent re-renders from slideshow changes
const AuthForms = memo(({ isLogin, toggleAuthMode, setToken }) => {
  return (
    <div className="w-full">
      {isLogin ? (
        <>
          <Login setToken={setToken} />
          <div className="text-center mt-6 text-sm text-gray-400">
            Don't have an account?{' '}
            <button 
              onClick={toggleAuthMode}
              className="text-[#e7c65f] ml-1 font-medium hover:underline"
            >
              Sign up
            </button>
          </div>
        </>
      ) : (
        <>
          <SignUp />
          <div className="text-center mt-6 text-sm text-gray-400">
            Already have an account?{' '}
            <button 
              onClick={toggleAuthMode}
              className="text-[#e7c65f] ml-1 font-medium hover:underline"
            >
              Log in
            </button>
          </div>
        </>
      )}
    </div>
  );
});

const LandingPage = ({ setToken }) => {
  // Auth state
  const [isLogin, setIsLogin] = useState(true);
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

  // Toggle between login and signup without rerendering the slideshow
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  // Desktop Layout (unchanged)
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
            
            {/* Authentication Component - Memoized to prevent rerendering on slide change */}
            <AuthForms 
              isLogin={isLogin} 
              toggleAuthMode={toggleAuthMode}
              setToken={setToken}
            />
          </div>
        </div>
        
        {/* Right side - Image slider (memoized) */}
        <div className="w-1/2">
          <Slideshow slides={slides} />
        </div>
      </div>
    );
  }
  
  // Mobile Layout - Different for Login vs SignUp
  if (isLogin) {
    // Login: Keep slideshow with limited scrolling area
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden">
        {/* Top Image Slider Section */}
        <div className="w-full h-2/5">
          <Slideshow slides={slides} />
        </div>

        {/* Bottom Authentication Section */}
        <div className="w-full h-3/5 p-4 flex flex-col overflow-y-auto bg-[#0e1a19] text-white">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-[#e7c65f]">UniHive</h1>
              <p className="text-gray-400 mt-2">Student Marketplace</p>
            </div>
            
            {/* Authentication Component - Memoized */}
            <AuthForms 
              isLogin={isLogin} 
              toggleAuthMode={toggleAuthMode}
              setToken={setToken}
            />
          </div>
        </div>
      </div>
    );
  } else {
    // SignUp: Single scrollbar for entire page - NO nested containers with scroll
    return (
      <div className="min-h-screen w-full bg-[#0e1a19] text-white overflow-x-hidden">
        {/* Single scrollable container - remove all overflow-hidden and nested scrolls */}
        <div className="w-full min-h-screen p-3">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-4 py-4">
              <h1 className="text-2xl font-bold text-[#e7c65f]">UniHive</h1>
              <p className="text-gray-400 text-sm">Student Marketplace</p>
            </div>
            
            {/* Authentication Component - Full content without any scroll restrictions */}
            <div className="w-full">
              <AuthForms 
                isLogin={isLogin} 
                toggleAuthMode={toggleAuthMode}
                setToken={setToken}
              />
            </div>
            
            {/* Add some bottom padding to ensure content is accessible */}
            <div className="h-8"></div>
          </div>
        </div>
      </div>
    );
  }
};

export default LandingPage;