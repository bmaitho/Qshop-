import React, { useState, useEffect, useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Import images
import shopSmart from "../assets/slides/shop-smart.png";
import campusDelivery from "../assets/slides/campus-delivery.png";
import studentMarketplace from "../assets/slides/student-marketplace.png";
import securePayments from "../assets/slides/secure-payments.png";

const slides = [
  {
    text: "Shop Smart, Save More ",
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
    text: " Your Safety, Our Priority",
    image: securePayments,
  },
];

const Slideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null); // UseRef to track the interval

  const startAutoPlay = () => {
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000); // Auto-scroll every 6 seconds
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
      className="relative w-full"
      onMouseEnter={stopAutoPlay} // Pause on hover
      onMouseLeave={startAutoPlay} // Resume when mouse leaves
    >
      {/* Slide Container */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden">
        {/* Each slide will take 100% of the container width */}
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide
                ? "opacity-100 visible"
                : "opacity-0 invisible"
            }`}
          >
            {/* Image */}
            <img
              src={slide.image}
              alt="Slideshow"
              className="w-full h-full object-cover rounded-lg shadow-lg" // Object-cover ensures the image fully covers the container
            />
            {/* Text Box */}
            <div className="absolute bottom-1 left-0 right-0 bg-[#0D2B20] bg-opacity-75 text-white px-4 py-2 text-sm md:text-lg rounded-lg text-center w-3/4 mx-auto">
              {slide.text}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows outside of the slide container */}
      <div className="absolute inset-y-0 left-0 flex items-center justify-center z-10">
        <button
          className="text-white bg-[#E7C65F] p-2 rounded-full hover:bg-[#d9ae4e] transition"
          onClick={prevSlide}
          style={{ fontSize: "20px" }} // Reduced size of the arrow
        >
          <FaChevronLeft size={20} />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center justify-center z-10">
        <button
          className="text-white bg-[#E7C65F] p-2 rounded-full hover:bg-[#d9ae4e] transition"
          onClick={nextSlide}
          style={{ fontSize: "20px" }}
        >
          <FaChevronRight size={20} />
        </button>
      </div>

      {/* Slide Indicators placed below the slides */}
      <div className="flex justify-center space-x-2 mt-4 z-10">
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
