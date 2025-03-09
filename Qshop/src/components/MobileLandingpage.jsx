import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './auth/Login';
import SignUp from './auth/SignUp';

// Import images from your assets folder
import Image1 from '../assets/image1.png';
import Image2 from '../assets/image2.jpg';
import Image3 from '../assets/image3.jpg';

const MobileLandingPage = (props) => {
  const [isLogin, setIsLogin] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      navigate('/home');
    }
  }, [navigate]);
  
  // Slide content
  const slides = [
    { image: Image1 },
    { image: Image2 },
    { image: Image3 }
  ];

  // Auto-scrolling effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Toggle between login and signup without redirecting
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  // Modify the Login component to pass the setToken prop
  const MobileLogin = () => (
    <Login setToken={props.setToken} />
  );

  // Modify the SignUp component to handle mobile view
  const MobileSignUp = () => (
    <SignUp isMobile={true} />
  );

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0e1a19]">
      {/* Image Slider Section */}
      <div className="relative w-full h-1/2 overflow-hidden">
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
                alt={`UniHive slide ${index + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(14,26,25,0.7)]"></div>
          </div>
        ))}
        
        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
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

      {/* Authentication Section */}
      <div className="w-full h-1/2 p-4 flex flex-col justify-center text-white overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="text-3xl font-serif font-bold text-[#e7c65f] mb-4 text-center">UniHive</div>
          <div className="text-md mb-4 text-center">Student Marketplace</div>
          
          {/* Authentication Component */}
          {isLogin ? (
            <>
              <MobileLogin />
              <div className="text-center mt-4 text-sm text-gray-400">
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
              <MobileSignUp />
              <div className="text-center mt-4 text-sm text-gray-400">
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
      </div>
    </div>
  );
};

export default MobileLandingPage;