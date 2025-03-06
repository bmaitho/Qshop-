import React, { useState, useEffect, useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Import images
import shopSmart from "../assets/slides/shop-smart.png";
import campusDelivery from "../assets/slides/campus-delivery.png";
import studentMarketplace from "../assets/slides/student-marketplace.png";
import securePayments from "../assets/slides/secure-payments.png";

const slides = [
  {
    text: "Shop Smart, Save More – Exclusive Deals for Students",
    image: shopSmart,
  },
  {
    text: "Fast & Reliable Campus Delivery",
    image: campusDelivery,
  },
  {
    text: "Buy & Sell with Fellow Students",
    image: studentMarketplace,
  },
  {
    text: "Secure Payments – Your Safety, Our Priority",
    image: securePayments,
  },
];

const Slideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null); // UseRef to track the interval

  const startAutoPlay = () => {
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
  };

  const stopAutoPlay = () => {
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
      slideInterval.current = null;
    }
  };

  useEffect(() => {
    startAutoPlay(); 
    return () => stopAutoPlay(); 
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div
      className="relative flex justify-center items-center w-full"
      onMouseEnter={stopAutoPlay} // Pause on hover
      onMouseLeave={startAutoPlay} // Resume when mouse leaves
    >
      {/* Slide */}
      <div className="relative flex flex-col items-center transition-transform duration-700 ease-in-out transform">
        <img
          src={slides[currentSlide].image}
          alt="Slideshow"
          className="max-w-full h-auto object-cover rounded-lg shadow-lg transition-transform duration-700 ease-in-out"
        />
        <div className="absolute bottom-6 bg-[#0D2B20] bg-opacity-75 text-white px-6 py-3 text-lg rounded-lg text-center">
          {slides[currentSlide].text}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        className="absolute left-2 md:left-4 text-white bg-[#E7C65F] p-4 rounded-full hover:bg-[#d9ae4e] transition"
        onClick={prevSlide}
      >
        <FaChevronLeft size={30} />
      </button>
      <button
        className="absolute right-2 md:right-4 text-white bg-[#E7C65F] p-4 rounded-full hover:bg-[#d9ae4e] transition"
        onClick={nextSlide}
      >
        <FaChevronRight size={30} />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-2 flex space-x-2">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full ${index === currentSlide ? "bg-[#E7C65F]" : "bg-gray-400"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Slideshow;
